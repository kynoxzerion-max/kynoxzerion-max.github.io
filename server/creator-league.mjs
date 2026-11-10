import { createHash, randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, readFile, rename, stat, unlink, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { dirname, resolve } from "node:path";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const port = Number(process.env.LEAGUE_PORT ?? 8788);
const host = process.env.LEAGUE_HOST ?? "127.0.0.1";
const dataDirectory = resolve(process.env.LEAGUE_DATA_DIR ?? "data/creator-league");
const databasePath = resolve(dataDirectory, "league.json");
const developerCredentialsPath = resolve(dataDirectory, "developer-credentials.json");
const mediaDirectory = resolve(dataDirectory, "publications");
const sessionLifetimeMs = 7 * 24 * 60 * 60 * 1000;
const developerSessionLifetimeMs = 8 * 60 * 60 * 1000;
const maxVideoBytes = 100 * 1024 * 1024;
const dailyPublicationLimit = 2;
const scoreWeights = { content: 0.4, creator: 0.25, quality: 0.35 };
const contentMetricWeights = { views: 0.15, watchMinutes: 0.25, likes: 0.15, comments: 0.15, saves: 0.15, shares: 0.15 };
const contentMetricTargets = { views: 2_000, watchMinutes: 6_000, likes: 100, comments: 50, saves: 50, shares: 50 };
const creatorActionPoints = { publication: 5, challenge: 10, project: 5, community: 5, collaboration: 10, battleWinner: 20 };
const creatorDailyLimits = { challenge: 5, project: 2, community: 2, collaboration: 5 };
const creatorScoreMax = 10_000;
const creatorScoreWindowDays = 30;
const creatorScoreVideoQualification = 20;
const creatorScoreConsistencyTarget = 10;
const creatorScoreRankTiers = ["Rookie", "Rising", "Skilled", "Elite", "Visionary"];
const creatorScoreRankDivisions = ["III", "II", "I"];
const weeklyBattleParticipantLimit = 100;
const rateLimits = new Map();
const developerSessions = new Map();
let database = { users: [], sessions: [], seasons: [], friendRequests: [], battles: [], conversations: [] };
let storedDeveloperCredentials = null;
let developerSetupInProgress = false;
let writeQueue = Promise.resolve();

class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function creatorSeason(date = new Date()) {
  const seasonIndex = Math.floor(date.getUTCMonth() / 4);
  const startsAt = new Date(Date.UTC(date.getUTCFullYear(), seasonIndex * 4, 1));
  const endsAt = new Date(Date.UTC(date.getUTCFullYear(), (seasonIndex + 1) * 4, 1));
  return {
    id: `${startsAt.getUTCFullYear()}-4M-S${seasonIndex + 1}`,
    name: `Creator League · ${startsAt.getUTCFullYear()} · S${seasonIndex + 1}`,
    startsAt: startsAt.toISOString(),
    endsAt: endsAt.toISOString(),
  };
}

function currentWeek(date = new Date()) {
  const startsAt = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const weekday = (startsAt.getUTCDay() + 6) % 7;
  startsAt.setUTCDate(startsAt.getUTCDate() - weekday);
  const endsAt = new Date(startsAt);
  endsAt.setUTCDate(endsAt.getUTCDate() + 7);
  const id = startsAt.toISOString().slice(0, 10);
  const weekNumber = Math.floor(startsAt.getTime() / (7 * 24 * 60 * 60 * 1000));
  const challengeSets = [
    [
      { id: "clip-30", title: "30 sekunnin klippi", description: "Julkaise 25–35 sekunnin video League-feediin.", minDuration: 25, maxDuration: 35 },
      { id: "gaming-montage", title: "Pelimontaasi", description: "Julkaise pelimontaasi League-feediin.", minDuration: 15, maxDuration: 3600 },
      { id: "show-project", title: "Esittele projektisi", description: "Esittele projektisi videolla League-feediin.", minDuration: 5, maxDuration: 3600 },
    ],
    [
      { id: "creative-edit", title: "Kerro tarina leikkauksella", description: "Tee video, jossa leikkaus kertoo tarinan.", minDuration: 10, maxDuration: 3600 },
      { id: "community-moment", title: "Yhteisön luova hetki", description: "Jaa yhteisösi luova hetki videona.", minDuration: 10, maxDuration: 3600 },
      { id: "new-perspective", title: "Uusi näkökulma", description: "Julkaise aiheesta tuore näkökulma.", minDuration: 10, maxDuration: 3600 },
    ],
  ];
  return {
    id,
    startsAt: startsAt.toISOString(),
    endsAt: endsAt.toISOString(),
    battleTheme: weekNumber % 2 === 0 ? "Eeppinen pelihetki" : "Minuutin maailma",
    challenges: challengeSets[Math.abs(weekNumber) % challengeSets.length],
  };
}

function usernameFor(user) {
  return user.username ?? `${user.displayName.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 20) || "creator"}-${user.id.slice(0, 6)}`;
}

function friendCodeFor(user) {
  user.friendCode ??= `NEX-${user.id.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
  return user.friendCode;
}

function publicAccount(user) {
  return { id: user.id, email: user.email, displayName: user.displayName, username: usernameFor(user), friendCode: friendCodeFor(user), country: user.country ?? "" };
}

const leagueRankTiers = ["Bronze", "Silver", "Gold", "Platinum", "Diamond", "Master", "Grandmaster", "Challenger"];
const leagueRankDivisions = ["IV", "III", "II", "I"];
const leagueFirstRankPoints = 200;
const leagueHighestRankPoints = 10_000;
const leagueRankPromotionCount = leagueRankTiers.length * leagueRankDivisions.length - 1;

function leagueRankThreshold(rankIndex) {
  const rankPointsRange = leagueHighestRankPoints - leagueFirstRankPoints;
  return Math.round((leagueFirstRankPoints + rankIndex * rankPointsRange / leagueRankPromotionCount) / 100) * 100;
}

function leagueRankForRating(rating) {
  const safeRating = Math.max(0, Math.floor(Number.isFinite(rating) ? rating : 0));
  if (safeRating < leagueFirstRankPoints) {
    return {
      tier: "Unranked",
      division: "",
      label: "Unranked",
      rating: safeRating,
      progress: safeRating,
      progressMax: leagueFirstRankPoints,
      nextRank: `${leagueRankTiers[0]} ${leagueRankDivisions[0]}`,
      nextRating: leagueFirstRankPoints,
    };
  }
  let rankIndex = 0;
  while (rankIndex < leagueRankPromotionCount && safeRating >= leagueRankThreshold(rankIndex + 1)) rankIndex += 1;
  const tierIndex = Math.floor(rankIndex / leagueRankDivisions.length);
  const divisionIndex = rankIndex % leagueRankDivisions.length;
  const rankStart = leagueRankThreshold(rankIndex);
  const rankEnd = rankIndex < leagueRankPromotionCount ? leagueRankThreshold(rankIndex + 1) : leagueHighestRankPoints;
  const nextRank = divisionIndex < leagueRankDivisions.length - 1
    ? `${leagueRankTiers[tierIndex]} ${leagueRankDivisions[divisionIndex + 1]}`
    : tierIndex < leagueRankTiers.length - 1 ? `${leagueRankTiers[tierIndex + 1]} IV` : null;
  return {
    tier: leagueRankTiers[tierIndex],
    division: leagueRankDivisions[divisionIndex],
    label: `${leagueRankTiers[tierIndex]} ${leagueRankDivisions[divisionIndex]}`,
    rating: safeRating,
    progress: rankIndex === leagueRankPromotionCount ? leagueHighestRankPoints : Math.min(rankEnd - rankStart, safeRating - rankStart),
    progressMax: rankIndex === leagueRankPromotionCount ? leagueHighestRankPoints : rankEnd - rankStart,
    nextRank,
    nextRating: nextRank ? rankEnd : leagueHighestRankPoints,
  };
}

function ensureLeagueSeasonRecord(user, season, rating = user.leagueRating ?? 0, finalized = false) {
  user.leagueSeasonHistory ??= [];
  let record = user.leagueSeasonHistory.find((item) => item.seasonId === season.id);
  const rank = leagueRankForRating(rating);
  if (!record) {
    record = { seasonId: season.id, seasonName: season.name, peakRating: rating, rank: rank.label, finalizedAt: null };
    user.leagueSeasonHistory.push(record);
  }
  record.seasonName = season.name;
  if (rating > (record.peakRating ?? 0)) {
    record.peakRating = rating;
    record.rank = rank.label;
  }
  if (finalized) record.finalizedAt = season.finalizedAt ?? new Date().toISOString();
  user.leaguePeakRating = Math.max(user.leaguePeakRating ?? 0, rating);
  return record;
}

function awardLeagueRating(user, amount, season) {
  user.leagueRating = (user.leagueRating ?? 0) + amount;
  ensureLeagueSeasonRecord(user, season, user.leagueRating);
  user.leaguePeakRating = Math.max(user.leaguePeakRating ?? 0, user.leagueRating);
}

function leagueProfileFor(user, store) {
  const rating = user.leagueRating ?? 0;
  const currentRank = leagueRankForRating(rating);
  const peakRank = leagueRankForRating(user.leaguePeakRating ?? rating);
  const activeSeason = store.seasons.find((season) => season.id === creatorSeason().id);
  const activeRankings = activeSeason
    ? Object.values(activeSeason.entries).sort((first, second) => compareEntries(first, second, new Map(store.users.map((item) => [item.id, item]))))
    : [];
  const seasonRank = activeRankings.findIndex((entry) => entry.userId === user.id);
  const historyBySeason = new Map((user.leagueSeasonHistory ?? []).map((record) => [record.seasonId, record]));
  for (const season of store.seasons) {
    const record = historyBySeason.get(season.id);
    if (season.finalizedAt && !record) continue;
    if (!record && season.id !== creatorSeason().id) continue;
    historyBySeason.set(season.id, record ?? {
      seasonId: season.id,
      seasonName: season.name,
      peakRating: rating,
      rank: currentRank.label,
      finalizedAt: null,
    });
  }
  const seasonHistory = [...historyBySeason.values()]
    .sort((first, second) => second.seasonId.localeCompare(first.seasonId))
    .map((record) => ({
      seasonId: record.seasonId,
      seasonName: record.seasonName,
      rating: record.peakRating ?? 0,
      rank: record.rank ?? leagueRankForRating(record.peakRating ?? 0).label,
      finalizedAt: record.finalizedAt ?? null,
      achievement: record.finalizedAt ? `${record.seasonName} — ${record.rank.split(" ")[0]}` : null,
    }));
  return {
    rating,
    currentRank,
    peakRank: { ...peakRank, rating: user.leaguePeakRating ?? rating },
    seasonRank: seasonRank < 0 ? null : seasonRank + 1,
    seasonHistory,
  };
}

function ensureWeekBattle(store, week = currentWeek()) {
  let battle = store.battles.find((item) => item.id === week.id);
  if (!battle) {
    battle = { ...week, seasonId: creatorSeason().id, submissions: [], votes: [], finalizedAt: null, winnerUserId: null };
    store.battles.push(battle);
  }
  return battle;
}

function challengeBadge(season, challengeId) {
  return rewardFor(season, "badge", `${season.name} · Haaste valmis · ${challengeId}`, "Suorita viikoittainen Creator-haaste.", "🎯");
}

function rewardFor(season, kind, name, description, icon) {
  return { id: `${season.id}:${kind}:${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`, kind, name, description, icon };
}

function milestoneRewards(season) {
  return [
    { requirement: 400, requirementType: "score", reward: rewardFor(season, "badge", `${season.name} · Ensijulkaisu`, "Kerää 400 Creator League -pistettä tällä kaudella.", "✦") },
    { requirement: 750, requirementType: "score", reward: rewardFor(season, "title", `${season.name} · Tarinankertoja`, "Kerää 750 Creator League -pistettä tällä kaudella.", "✧") },
    { requirement: 15, requirementType: "videos", reward: rewardFor(season, "achievement", `${season.name} · Kauden tekijä`, "Julkaise 15 videota tällä kaudella.", "🏅") },
  ];
}

function podiumRewards(season) {
  return [
    {
      place: 1,
      rewards: [
        rewardFor(season, "badge", `${season.name} · Mestari`, "Creator Leaguen kauden ykkönen.", "👑"),
        rewardFor(season, "title", `${season.name} · Mestari`, "Creator Leaguen kauden ykkönen.", "♛"),
        rewardFor(season, "border", `${season.name} · Aether-kehys`, "Ykkössijan kausiprofiilikehys.", "⬡"),
        rewardFor(season, "theme", `${season.name} · Voittajan revontulet`, "Ykkössijan kausiteema.", "🌌"),
        rewardFor(season, "trophy", `${season.name} · Creator Cup`, "Kauden voittajan pokaali.", "🏆"),
      ],
    },
    {
      place: 2,
      rewards: [
        rewardFor(season, "badge", `${season.name} · Hopeasija`, "Creator Leaguen kauden kakkonen.", "🥈"),
        rewardFor(season, "title", `${season.name} · Finalisti`, "Creator Leaguen kauden kakkonen.", "✦"),
        rewardFor(season, "border", `${season.name} · Hopeakehys`, "Kakkossijan kausiprofiilikehys.", "◇"),
        rewardFor(season, "theme", `${season.name} · Hopeinen hehku`, "Kakkossijan kausiteema.", "✨"),
        rewardFor(season, "trophy", `${season.name} · Hopeapokaali`, "Kauden kakkosen pokaali.", "🏆"),
      ],
    },
    {
      place: 3,
      rewards: [
        rewardFor(season, "badge", `${season.name} · Pronssisija`, "Creator Leaguen kauden kolmonen.", "🥉"),
        rewardFor(season, "title", `${season.name} · Kärkikolmikko`, "Creator Leaguen kauden kolmonen.", "✧"),
        rewardFor(season, "border", `${season.name} · Pronssikehys`, "Kolmossijan kausiprofiilikehys.", "⬡"),
        rewardFor(season, "theme", `${season.name} · Pronssinen kajastus`, "Kolmossijan kausiteema.", "🌠"),
        rewardFor(season, "trophy", `${season.name} · Pronssipokaali`, "Kauden kolmosen pokaali.", "🏆"),
      ],
    },
    ...Array.from({ length: 7 }, (_, index) => {
      const place = index + 4;
      const placeName = `${place}. sija`;
      return {
        place,
        rewards: [
          rewardFor(season, "badge", `${season.name} · Top 10 · ${placeName}`, `Creator Leaguen kauden ${placeName}.`, "✦"),
          rewardFor(season, "title", `${season.name} · Kärkikymmenikkö #${place}`, `Creator Leaguen kauden ${placeName}.`, "✧"),
          rewardFor(season, "border", `${season.name} · Kärkikehys #${place}`, `Kauden ${placeName} profiilikehys.`, "⬡"),
        ],
      };
    }),
  ];
}

function seasonRankRewards(season, tier) {
  const rewards = {
    Bronze: ["badge", "Bronze Vanguard", "Pronssinen kausimerkki.", "🥉", "glow"],
    Silver: ["title", "Silver Creator", "Hopeinen kausititteli.", "✦", "shimmer"],
    Gold: ["border", "Golden Creator Frame", "Kultainen profiilikehys.", "◇", "glow"],
    Platinum: ["theme", "Platinum Aurora", "Platinainen revontuliteema.", "🌌", "aurora"],
    Diamond: ["border", "Diamond Creator Frame", "Timanttinen profiilikehys.", "💎", "prism"],
    Master: ["title", "Master Creator", "Mestarin animoitu kausititteli.", "♛", "shimmer"],
    Grandmaster: ["effect", "Grandmaster Orbit", "Animoitu profiilia kiertävä Grandmaster-efekti.", "✧", "pulse"],
    Challenger: ["badge", "Legendary Creator", "Legendaarinen Challenger-kausimerkki.", "🏆", "prism"],
  }[tier];
  if (!rewards) return [];
  const [kind, name, description, icon, effect] = rewards;
  return [{
    ...rewardFor(season, kind, `${season.name} · ${name}`, description, icon),
    effect,
  }];
}

function ensureSeason(store, seasonInfo) {
  let season = store.seasons.find((item) => item.id === seasonInfo.id);
  if (!season) {
    season = { ...seasonInfo, entries: {}, finalizedAt: null, podium: [] };
    store.seasons.push(season);
  }
  return season;
}

function compareEntries(first, second, usersById) {
  const firstScore = scoreForEntry(first).total;
  const secondScore = scoreForEntry(second).total;
  if (secondScore !== firstScore) return secondScore - firstScore;
  const firstName = usersById.get(first.userId)?.displayName ?? "";
  const secondName = usersById.get(second.userId)?.displayName ?? "";
  return firstName.localeCompare(secondName) || first.userId.localeCompare(second.userId);
}

function normalizedMetric(value, target) {
  if (value <= 0) return 0;
  return Math.min(100, Math.log1p(value) / Math.log1p(target) * 100);
}

function hasQualifiedView(publication, viewer) {
  const duration = Number.isFinite(publication.durationSeconds) && publication.durationSeconds > 0
    ? publication.durationSeconds
    : 3;
  return viewer.watchedSeconds >= Math.min(3, duration);
}

function publicationMetrics(publication) {
  const watchers = Object.values(publication.watchers ?? {});
  const views = watchers.filter((viewer) => hasQualifiedView(publication, viewer)).length;
  return {
    views,
    watchSeconds: watchers.reduce((total, viewer) => total + (Number.isFinite(viewer.watchedSeconds) ? viewer.watchedSeconds : 0), 0),
    likes: Array.isArray(publication.likes) ? publication.likes.length : 0,
    comments: Array.isArray(publication.comments) ? publication.comments.length : 0,
    saves: Array.isArray(publication.saves) ? publication.saves.length : 0,
    shares: Array.isArray(publication.shares) ? publication.shares.length : 0,
  };
}

function scoreForEntry(entry) {
  const publications = entry.publications ?? [];
  const totals = publications.reduce((result, publication) => {
    const metrics = publicationMetrics(publication);
    const qualityWatchSeconds = Object.values(publication.watchers ?? {})
      .filter((viewer) => hasQualifiedView(publication, viewer))
      .reduce((total, viewer) => total + viewer.watchedSeconds, 0);
    result.views += metrics.views;
    result.watchSeconds += metrics.watchSeconds;
    result.qualityWatchSeconds += qualityWatchSeconds;
    result.likes += metrics.likes;
    result.comments += metrics.comments;
    result.saves += metrics.saves;
    result.shares += metrics.shares;
    result.expectedWatchSeconds += metrics.views * (Number.isFinite(publication.durationSeconds) ? publication.durationSeconds : 0);
    return result;
  }, { views: 0, watchSeconds: 0, qualityWatchSeconds: 0, likes: 0, comments: 0, saves: 0, shares: 0, expectedWatchSeconds: 0 });
  const metricValues = {
    views: totals.views,
    watchMinutes: totals.watchSeconds / 60,
    likes: totals.likes,
    comments: totals.comments,
    saves: totals.saves,
    shares: totals.shares,
  };
  const content = Object.entries(contentMetricWeights).reduce((score, [metric, weight]) =>
    score + normalizedMetric(metricValues[metric], contentMetricTargets[metric]) * weight, 0);
  const actions = Array.isArray(entry.actions) ? entry.actions : [];
  const creatorRaw = publications.length * creatorActionPoints.publication
    + actions.reduce((score, action) => score + (creatorActionPoints[action.type] ?? 0), 0);
  const creator = Math.min(100, creatorRaw);
  const quality = totals.expectedWatchSeconds > 0
    ? Math.min(100, totals.qualityWatchSeconds / totals.expectedWatchSeconds * 100)
    : 0;
  const total = content * scoreWeights.content + creator * scoreWeights.creator + quality * scoreWeights.quality;
  return {
    total: Math.round(total * 100) / 100,
    content: Math.round(content * 100) / 100,
    creator: Math.round(creator * 100) / 100,
    quality: Math.round(quality * 100) / 100,
    metrics: { ...totals, watchMinutes: Math.round(totals.watchSeconds / 60 * 10) / 10 },
    creatorActions: Object.fromEntries(Object.keys(creatorActionPoints).map((type) => [
      type,
      type === "publication" ? publications.length : actions.filter((action) => action.type === type).length,
    ])),
  };
}

function creatorRankForScore(score) {
  const divisionCount = creatorScoreRankTiers.length * creatorScoreRankDivisions.length;
  const divisionSize = creatorScoreMax / divisionCount;
  const safeScore = Math.max(0, Math.min(creatorScoreMax, Math.floor(score)));
  const index = Math.min(divisionCount - 1, Math.floor(safeScore / divisionSize));
  const tier = creatorScoreRankTiers[Math.floor(index / creatorScoreRankDivisions.length)];
  const division = creatorScoreRankDivisions[index % creatorScoreRankDivisions.length];
  const startScore = Math.floor(index * divisionSize);
  const nextScore = index === divisionCount - 1 ? creatorScoreMax : Math.floor((index + 1) * divisionSize);
  const nextRank = index === divisionCount - 1
    ? null
    : `${creatorScoreRankTiers[Math.floor((index + 1) / creatorScoreRankDivisions.length)]} ${creatorScoreRankDivisions[(index + 1) % creatorScoreRankDivisions.length]}`;
  return {
    tier,
    division,
    label: `${tier} ${division}`,
    score: safeScore,
    progress: safeScore - startScore,
    progressMax: nextScore - startScore,
    nextRank,
    nextScore,
  };
}

function creatorPerformanceForUser(store, userId, now = Date.now()) {
  const windowStart = now - creatorScoreWindowDays * 24 * 60 * 60 * 1000;
  const publications = [];
  const actions = [];
  for (const season of store.seasons) {
    const entry = season.entries?.[userId];
    if (!entry) continue;
    publications.push(...(entry.publications ?? []).filter((publication) => {
      const createdAt = Date.parse(publication.createdAt);
      return Number.isFinite(createdAt) && createdAt >= windowStart && createdAt <= now;
    }));
    actions.push(...(entry.actions ?? []).filter((action) => {
      const createdAt = Date.parse(action.createdAt);
      return Number.isFinite(createdAt) && createdAt >= windowStart && createdAt <= now;
    }));
  }
  const videoScores = publications.map((publication) => scoreForEntry({ publications: [publication], actions: [] }).total);
  const qualifiedScores = videoScores.filter((score) => score >= creatorScoreVideoQualification);
  const averageVideoScore = qualifiedScores.length
    ? qualifiedScores.reduce((total, score) => total + score, 0) / qualifiedScores.length
    : 0;
  const consistencyScore = Math.min(100, qualifiedScores.length / creatorScoreConsistencyTarget * 100);
  const actionPoints = actions.reduce((total, action) => total + (creatorActionPoints[action.type] ?? 0), 0);
  const actionScore = normalizedMetric(actionPoints, 100);
  const score = qualifiedScores.length
    ? Math.min(creatorScoreMax, Math.round((averageVideoScore * 0.65 + consistencyScore * 0.25 + actionScore * 0.1) * 100))
    : 0;
  const rank = creatorRankForScore(score);
  return {
    score,
    maxScore: creatorScoreMax,
    windowDays: creatorScoreWindowDays,
    videoCount: publications.length,
    qualifiedVideos: qualifiedScores.length,
    averageVideoScore: Math.round(averageVideoScore * 100) / 100,
    consistencyScore: Math.round(consistencyScore * 100) / 100,
    creatorRank: rank,
  };
}

function creatorStandingsForScope(store, scope, user, now = Date.now()) {
  let users = store.users;
  if (scope === "friends" && user) {
    const friendIds = new Set([user.id, ...(user.friends ?? [])]);
    users = users.filter((account) => friendIds.has(account.id));
  } else if (scope === "country" && user?.country) {
    users = users.filter((account) => account.country === user.country);
  }
  return users.map((account) => ({
    userId: account.id,
    displayName: account.displayName,
    username: usernameFor(account),
    country: account.country ?? "",
    ...creatorPerformanceForUser(store, account.id, now),
  })).filter((standing) => standing.videoCount > 0)
    .sort((first, second) => second.score - first.score
    || second.qualifiedVideos - first.qualifiedVideos
    || first.displayName.localeCompare(second.displayName)
    || first.userId.localeCompare(second.userId))
    .map((standing, index) => ({ ...standing, rank: index + 1 }));
}

function clpStandingsForScope(store, scope, user) {
  let users = store.users;
  if (scope === "friends" && user) {
    const friendIds = new Set([user.id, ...(user.friends ?? [])]);
    users = users.filter((account) => friendIds.has(account.id));
  } else if (scope === "country" && user?.country) {
    users = users.filter((account) => account.country === user.country);
  }
  const standings = users.map((account) => ({
    userId: account.id,
    displayName: account.displayName,
    username: usernameFor(account),
    country: account.country ?? "",
    points: account.leagueRating ?? 0,
  })).sort((first, second) => second.points - first.points
    || first.displayName.localeCompare(second.displayName)
    || first.userId.localeCompare(second.userId))
    .map((standing, index) => ({ ...standing, rank: index + 1 }));
  const visibleStandings = standings.slice(0, 50);
  const currentStanding = user && standings.find((standing) => standing.userId === user.id);
  if (currentStanding && !visibleStandings.some((standing) => standing.userId === user.id)) {
    visibleStandings.push(currentStanding);
  }
  return visibleStandings;
}

function finalizeExpiredSeasons(store, now = new Date()) {
  const usersById = new Map(store.users.map((user) => [user.id, user]));
  let changed = false;
  for (const season of store.seasons) {
    if (season.finalizedAt || Date.parse(season.endsAt) > now.getTime()) continue;
    const rankings = Object.values(season.entries).sort((first, second) => compareEntries(first, second, usersById));
    season.podium = rankings.slice(0, 10).map((entry, index) => ({
      userId: entry.userId,
      rank: index + 1,
      points: scoreForEntry(entry).total,
    }));
    season.finalizedAt = now.toISOString();
    for (const user of store.users) {
      const hasSeasonRecord = user.leagueSeasonHistory?.some((record) => record.seasonId === season.id);
      if (season.entries[user.id] || hasSeasonRecord) {
        ensureLeagueSeasonRecord(user, season, user.leagueRating ?? 0, true);
      }
    }
    changed = true;
  }
  return changed;
}

function finalizeExpiredBattles(store, now = new Date()) {
  let changed = false;
  const usersById = new Map(store.users.map((user) => [user.id, user]));
  for (const battle of store.battles) {
    if (battle.finalizedAt || Date.parse(battle.endsAt) > now.getTime()) continue;
    const ranked = battle.submissions
      .map((submission) => ({ submission, rating: battleSubmissionScore(battle, submission, store) }))
      .filter(({ rating }) => rating.votes > 0)
      .sort((first, second) => second.rating.total - first.rating.total);
    const winner = ranked[0]?.submission;
    if (winner) {
      battle.winnerUserId = winner.userId;
      const user = usersById.get(winner.userId);
      const season = store.seasons.find((item) => item.id === battle.seasonId);
      if (user && season) awardLeagueRating(user, 25, season);
      const entry = season?.entries[winner.userId];
      if (entry) {
        entry.actions ??= [];
        entry.battleRewards ??= [];
        if (!entry.actions.some((action) => action.id === `battleWinner:${battle.id}`)) {
          entry.actions.push({ id: `battleWinner:${battle.id}`, type: "battleWinner", createdAt: now.toISOString() });
        }
        if (!entry.battleRewards.includes(battle.id)) entry.battleRewards.push(battle.id);
      }
    }
    battle.finalizedAt = now.toISOString();
    changed = true;
  }
  return changed;
}

function publicSnapshot(store, user, scope = "global") {
  const now = new Date();
  const seasonInfo = creatorSeason(now);
  const season = ensureSeason(store, seasonInfo);
  const usersById = new Map(store.users.map((item) => [item.id, item]));
  let rankingEntries = Object.values(season.entries);
  if (scope === "friends" && user) {
    const friendIds = new Set([user.id, ...(user.friends ?? [])]);
    rankingEntries = [...friendIds].map((id) => season.entries[id] ?? { userId: id, publications: [], actions: [] });
  } else if (scope === "country") {
    const countryIds = new Set(user?.country ? store.users.filter((item) => item.country === user.country).map((item) => item.id) : []);
    rankingEntries = [...countryIds].map((id) => season.entries[id] ?? { userId: id, publications: [], actions: [] });
  }
  const rankings = rankingEntries.sort((first, second) => compareEntries(first, second, usersById));
  const currentEntry = user ? season.entries[user.id] : undefined;
  const rank = user && (currentEntry || scope !== "global") ? rankings.findIndex((entry) => entry.userId === user.id) + 1 : null;
  const creatorStandings = creatorStandingsForScope(store, scope, user, now.getTime());
  const clpStandings = clpStandingsForScope(store, scope, user);
  const currentCreatorPerformance = user ? creatorPerformanceForUser(store, user.id, now.getTime()) : null;
  const creatorLeaderboardRank = user
    ? creatorStandings.find((standing) => standing.userId === user.id)?.rank ?? null
    : null;
  const earnedRewards = user
    ? store.seasons.flatMap((seasonEntry) => {
      const entry = seasonEntry.entries[user.id];
      if (!entry) return [];
      const rewards = milestoneRewards(seasonEntry)
        .filter(({ score }) => scoreForEntry(entry).total >= score)
        .map(({ reward }) => reward);
      if (seasonEntry.finalizedAt) {
        const rankRecord = user.leagueSeasonHistory?.find((record) => record.seasonId === seasonEntry.id);
        if (rankRecord) rewards.push(...seasonRankRewards(seasonEntry, rankRecord.rank.split(" ")[0]));
        const place = seasonEntry.podium.find((podiumEntry) => podiumEntry.userId === user.id)?.rank;
        const award = podiumRewards(seasonEntry).find((item) => item.place === place);
        if (award) rewards.push(...award.rewards);
      }
      for (const challengeId of entry.challengeCompletions ?? []) {
        rewards.push(challengeBadge(seasonEntry, challengeId));
      }
      for (const battleId of entry.battleRewards ?? []) {
        const battle = store.battles.find((item) => item.id === battleId && item.winnerUserId === user.id);
        if (battle) rewards.push(rewardFor(seasonEntry, "badge", `${seasonEntry.name} · Battle Winner`, `${battle.battleTheme} · ${battle.id}`, "🏆"));
      }
      return rewards;
    })
    : [];
  return {
    season: { id: season.id, name: season.name, startsAt: season.startsAt, endsAt: season.endsAt, finalizedAt: season.finalizedAt },
    account: user ? publicAccount(user) : null,
    scope,
    leagueRating: user?.leagueRating ?? 0,
    leagueProfile: user ? leagueProfileFor(user, store) : null,
    creatorPerformance: user && currentCreatorPerformance
      ? { ...currentCreatorPerformance, leaderboardRank: creatorLeaderboardRank }
      : null,
    creatorStandings: creatorStandings.slice(0, 50),
    clpStandings,
    standings: rankings.slice(0, 50).map((entry, index) => ({
      userId: entry.userId,
      displayName: usersById.get(entry.userId)?.displayName ?? "Creator",
      username: usernameFor(usersById.get(entry.userId) ?? { id: entry.userId, displayName: "creator" }),
      country: usersById.get(entry.userId)?.country ?? "",
      points: scoreForEntry(entry).total,
      score: scoreForEntry(entry),
      rank: index + 1,
    })),
    myStanding: user ? {
      points: currentEntry ? scoreForEntry(currentEntry).total : 0,
      score: currentEntry ? scoreForEntry(currentEntry) : scoreForEntry({ publications: [], actions: [] }),
      rank,
      videosPublished: currentEntry?.publications.length ?? 0,
      publicationIds: (currentEntry?.publications ?? []).map((item) => item.id),
    } : null,
    achievements: milestoneRewards(season).map(({ requirement, requirementType, reward }) => ({
      ...reward,
      requirement,
      requirementType,
      earned: requirementType === "videos"
        ? (currentEntry?.publications.length ?? 0) >= requirement
        : (currentEntry ? scoreForEntry(currentEntry).total : 0) >= requirement,
    })),
    earnedRewards,
    podiumRewards: podiumRewards(season),
    rankRewards: leagueRankTiers.map((tier) => ({ tier, rewards: seasonRankRewards(season, tier) })),
    scoreWeights,
  };
}

function battleSubmissionScore(battle, submission, store) {
  const publication = findPublication(store, submission.publicationId)?.publication;
  if (!publication) return { total: 0, creativity: 0, editing: 0, engagement: 0, quality: 0, votes: 0 };
  const votes = battle.votes.filter((item) => item.submissionId === submission.publicationId);
  const creativity = votes.length ? votes.reduce((sum, vote) => sum + vote.creativity, 0) / votes.length * 20 : 0;
  const editing = votes.length ? votes.reduce((sum, vote) => sum + vote.editing, 0) / votes.length * 20 : 0;
  const metrics = publicationMetrics(publication);
  const engagement = (
    normalizedMetric(metrics.likes, 30) * 0.3
    + normalizedMetric(metrics.comments, 20) * 0.4
    + normalizedMetric(metrics.shares, 20) * 0.3
  );
  const quality = scoreForEntry({ publications: [publication], actions: [] }).quality;
  const total = creativity * 0.3 + editing * 0.3 + engagement * 0.2 + quality * 0.2;
  return {
    total: Math.round(total * 100) / 100,
    creativity: Math.round(creativity * 100) / 100,
    editing: Math.round(editing * 100) / 100,
    engagement: Math.round(engagement * 100) / 100,
    quality: Math.round(quality * 100) / 100,
    votes: votes.length,
  };
}

function publicBattle(store, battle, user) {
  const usersById = new Map(store.users.map((item) => [item.id, item]));
  const submissions = battle.submissions.map((submission) => {
    const rating = battleSubmissionScore(battle, submission, store);
    return {
      publicationId: submission.publicationId,
      userId: submission.userId,
      creatorName: usersById.get(submission.userId)?.displayName ?? "Creator",
      title: findPublication(store, submission.publicationId)?.publication.title ?? "Creator video",
      rating,
      myVote: battle.votes.find((vote) => vote.submissionId === submission.publicationId && vote.userId === user.id) ?? null,
      own: submission.userId === user.id,
    };
  }).sort((first, second) => second.rating.total - first.rating.total);
  const winner = battle.winnerUserId ? usersById.get(battle.winnerUserId) : null;
  return {
    id: battle.id,
    theme: battle.battleTheme,
    startsAt: battle.startsAt,
    endsAt: battle.endsAt,
    finalizedAt: battle.finalizedAt,
    winner: winner ? { id: winner.id, displayName: winner.displayName } : null,
    ratingAward: 25,
    participantCount: new Set(battle.submissions.map((submission) => submission.userId)).size,
    participantLimit: weeklyBattleParticipantLimit,
    submissions,
  };
}

function publicChallenges(store, user, week = currentWeek()) {
  const season = ensureSeason(store, creatorSeason());
  const entry = season.entries[user.id];
  const completed = new Set((entry?.challengeCompletions ?? []).filter((item) => item.startsWith(`${week.id}:`)));
  return {
    weekId: week.id,
    startsAt: week.startsAt,
    endsAt: week.endsAt,
    items: week.challenges.map((challenge) => ({
      ...challenge,
      completed: completed.has(`${week.id}:${challenge.id}`),
    })),
  };
}

function risingCreators(store) {
  const now = Date.now();
  const recentStart = now - 7 * 24 * 60 * 60 * 1000;
  const previousStart = recentStart - 7 * 24 * 60 * 60 * 1000;
  const usersById = new Map(store.users.map((item) => [item.id, item]));
  const entriesByUser = store.seasons.flatMap((season) => Object.values(season.entries ?? {})).reduce((result, entry) => {
    const current = result.get(entry.userId) ?? { userId: entry.userId, publications: [], actions: [] };
    current.publications.push(...(entry.publications ?? []));
    current.actions.push(...(entry.actions ?? []));
    result.set(entry.userId, current);
    return result;
  }, new Map());
  const candidates = [...entriesByUser.values()].map((entry) => {
    const recent = entry.publications.filter((publication) => Date.parse(publication.createdAt) >= recentStart);
    const previous = entry.publications.filter((publication) => Date.parse(publication.createdAt) >= previousStart && Date.parse(publication.createdAt) < recentStart);
    const recentActions = entry.actions.filter((action) => Date.parse(action.createdAt) >= recentStart);
    const recentScore = scoreForEntry({ publications: recent, actions: recentActions });
    const recentEngagement = recent.reduce((total, publication) => {
      const metrics = publicationMetrics(publication);
      return total + metrics.views + metrics.likes * 4 + metrics.comments * 6 + metrics.saves * 4 + metrics.shares * 5;
    }, 0);
    const previousEngagement = previous.reduce((total, publication) => {
      const metrics = publicationMetrics(publication);
      return total + metrics.views + metrics.likes * 4 + metrics.comments * 6 + metrics.saves * 4 + metrics.shares * 5;
    }, 0);
    const growth = previousEngagement > 0
      ? Math.max(0, Math.min(100, (recentEngagement / previousEngagement - 1) * 50 + 50))
      : recentEngagement > 0 ? 50 : 0;
    const activity = Math.min(100, recent.length * 20 + recentActions.length * 10);
    const score = recentScore.content * 0.45 + recentScore.quality * 0.25 + growth * 0.2 + activity * 0.1;
    return {
      userId: entry.userId,
      displayName: usersById.get(entry.userId)?.displayName ?? "Creator",
      username: usernameFor(usersById.get(entry.userId) ?? { id: entry.userId, displayName: "creator" }),
      country: usersById.get(entry.userId)?.country ?? "",
      score: Math.round(score * 100) / 100,
      recentGrowth: Math.round(growth * 100) / 100,
      engagement: recentEngagement,
      quality: recentScore.quality,
      activity: recent.length + recentActions.length,
    };
  }).filter((entry) => entry.activity > 0);
  return candidates.sort((first, second) => second.score - first.score).slice(0, 20)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}

async function loadDatabase() {
  await mkdir(mediaDirectory, { recursive: true });
  try {
    const credentials = JSON.parse(await readFile(developerCredentialsPath, "utf8"));
    if (!credentials || typeof credentials.email !== "string" || typeof credentials.salt !== "string" || typeof credentials.hash !== "string") {
      throw new TypeError("Developer Console -tunnistetiedosto ei ole kelvollinen.");
    }
    storedDeveloperCredentials = credentials;
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  try {
    const raw = await readFile(databasePath, "utf8");
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.users) || !Array.isArray(parsed.sessions) || !Array.isArray(parsed.seasons)) {
      throw new TypeError("Creator League -tietokanta ei ole kelvollinen.");
    }
    database = parsed;
    database.friendRequests ??= [];
    database.battles ??= [];
    database.conversations ??= [];
    database.battles = database.battles.filter((battle) => battle && typeof battle.id === "string").map((battle) => ({
      ...battle,
      submissions: Array.isArray(battle.submissions) ? battle.submissions : [],
      votes: Array.isArray(battle.votes) ? battle.votes : [],
      finalizedAt: battle.finalizedAt ?? null,
      winnerUserId: battle.winnerUserId ?? null,
    }));
    for (const user of database.users) {
      user.username ??= usernameFor(user);
      friendCodeFor(user);
      user.country ??= "";
      user.friends ??= [];
      user.leagueRating ??= 0;
      user.leaguePeakRating ??= user.leagueRating;
      user.leagueSeasonHistory ??= [];
      user.leaguePeakRating = Math.max(user.leaguePeakRating, user.leagueRating);
      for (const record of user.leagueSeasonHistory) {
        record.peakRating ??= record.rating ?? 0;
        record.rank ??= leagueRankForRating(record.peakRating).label;
        record.finalizedAt ??= null;
      }
    }
    for (const season of database.seasons) {
      for (const entry of Object.values(season.entries ?? {})) {
        entry.actions ??= [];
        entry.challengeCompletions ??= [];
        entry.battleRewards ??= [];
      }
    }
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

async function persistDatabase() {
  await mkdir(dirname(databasePath), { recursive: true });
  const temporaryPath = `${databasePath}.${randomUUID()}.tmp`;
  await writeFile(temporaryPath, JSON.stringify(database), { mode: 0o600 });
  await rename(temporaryPath, databasePath);
}

async function mutateStore(callback) {
  let result;
  const operation = writeQueue.then(async () => {
    result = await callback(database);
    await persistDatabase();
  });
  writeQueue = operation.catch((error) => {
    if (!(error instanceof ApiError)) console.error("Creator League -tietokannan tallennus epäonnistui.", error);
  });
  await operation;
  return result;
}

function json(response, status, payload, extraHeaders = {}) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    ...extraHeaders,
  });
  response.end(JSON.stringify(payload));
}

function readCookies(request) {
  return Object.fromEntries((request.headers.cookie ?? "")
    .split(";")
    .map((part) => part.trim().split("="))
    .filter(([key, value]) => key && value)
    .map(([key, ...value]) => [key, decodeURIComponent(value.join("="))]));
}

function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

function getSessionUser(request) {
  const token = readCookies(request).nexus_league_session;
  if (!token) return null;
  const tokenHash = hashToken(token);
  const session = database.sessions.find((item) => item.tokenHash === tokenHash && Date.parse(item.expiresAt) > Date.now());
  return session ? database.users.find((user) => user.id === session.userId) ?? null : null;
}

function sessionCookie(token, request, clear = false) {
  const secure = process.env.NODE_ENV === "production" || request.headers["x-forwarded-proto"] === "https";
  return `nexus_league_session=${clear ? "" : encodeURIComponent(token)}; Path=/api/creator-league; HttpOnly; SameSite=Strict; Max-Age=${clear ? 0 : sessionLifetimeMs / 1000}${secure ? "; Secure" : ""}`;
}

function assertSameOrigin(request) {
  const origin = request.headers.origin;
  if (!origin) throw new ApiError(403, "Pyyntöä ei voitu vahvistaa.");
  const requestHost = request.headers.host;
  let originHost;
  try {
    originHost = new URL(origin).host;
  } catch {
    throw new ApiError(403, "Pyyntöä ei voitu vahvistaa.");
  }
  if (originHost !== requestHost) throw new ApiError(403, "Pyyntöä ei voitu vahvistaa.");
}

async function readJson(request, maxBytes = 16_384) {
  let raw = "";
  for await (const chunk of request) {
    raw += chunk.toString("utf8");
    if (Buffer.byteLength(raw, "utf8") > maxBytes) throw new ApiError(413, "Pyyntö on liian suuri.");
  }
  try {
    return JSON.parse(raw);
  } catch {
    throw new ApiError(400, "Pyyntö ei ole kelvollista JSON-dataa.");
  }
}

function rateLimit(request, action, maxAttempts = 10) {
  const now = Date.now();
  const forwardedFor = request.headers["x-forwarded-for"];
  const clientAddress = typeof forwardedFor === "string"
    ? forwardedFor.split(",")[0].trim()
    : request.socket.remoteAddress ?? "unknown";
  const key = `${clientAddress || "unknown"}:${action}`;
  const attempts = (rateLimits.get(key) ?? []).filter((timestamp) => now - timestamp < 15 * 60 * 1000);
  if (attempts.length >= maxAttempts) throw new ApiError(429, "Liian monta yritystä. Yritä hetken kuluttua uudelleen.");
  attempts.push(now);
  rateLimits.set(key, attempts);
}

function developerConfiguration() {
  const email = process.env.NEXUS_DEVELOPER_EMAIL?.trim().toLowerCase() ?? "";
  const password = process.env.NEXUS_DEVELOPER_PASSWORD ?? "";
  if (email && password.length >= 10) return { email, password, configured: true, source: "environment" };
  if (storedDeveloperCredentials) return { ...storedDeveloperCredentials, configured: true, source: "stored" };
  return { email: "", password: "", configured: false, source: null };
}

function developerSetupAllowed(request) {
  const remoteAddress = request.socket.remoteAddress ?? "";
  const loopback = remoteAddress === "127.0.0.1" || remoteAddress === "::1" || remoteAddress === "::ffff:127.0.0.1";
  return process.env.NODE_ENV !== "production" && loopback && !developerConfiguration().configured;
}

function developerResetAllowed(request) {
  const remoteAddress = request.socket.remoteAddress ?? "";
  const loopback = remoteAddress === "127.0.0.1" || remoteAddress === "::1" || remoteAddress === "::ffff:127.0.0.1";
  return process.env.NODE_ENV !== "production" && loopback && developerConfiguration().source !== "environment";
}

function getDeveloperSession(request) {
  const token = readCookies(request).nexus_developer_session;
  if (!token) return null;
  const tokenHash = hashToken(token);
  const expiresAt = developerSessions.get(tokenHash);
  if (!expiresAt) return null;
  if (Date.parse(expiresAt) <= Date.now()) {
    developerSessions.delete(tokenHash);
    return null;
  }
  return tokenHash;
}

function requireDeveloperSession(request) {
  const session = getDeveloperSession(request);
  if (!session) throw new ApiError(401, "Kirjaudu Developer Consoleen.");
  return session;
}

function developerSessionCookie(token, request, clear = false) {
  const secure = process.env.NODE_ENV === "production" || request.headers["x-forwarded-proto"] === "https";
  return `nexus_developer_session=${clear ? "" : encodeURIComponent(token)}; Path=/api/creator-league/developer; HttpOnly; SameSite=Strict; Max-Age=${clear ? 0 : developerSessionLifetimeMs / 1000}${secure ? "; Secure" : ""}`;
}

async function developerLogin(request, response) {
  assertSameOrigin(request);
  rateLimit(request, "developer-login", 5);
  const config = developerConfiguration();
  const { email: expectedEmail, password: expectedPassword, configured } = config;
  if (!configured) throw new ApiError(503, "Developer Consolea ei ole määritetty palvelimelle.");
  const body = await readJson(request);
  const actualEmail = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const actualPassword = typeof body.password === "string" ? body.password : "";
  const emailMatches = timingSafeEqual(createHash("sha256").update(actualEmail).digest(), createHash("sha256").update(expectedEmail).digest());
  const passwordMatches = config.source === "stored"
    ? await verifyPassword(actualPassword, config)
    : timingSafeEqual(createHash("sha256").update(actualPassword).digest(), createHash("sha256").update(expectedPassword).digest());
  if (!emailMatches || !passwordMatches) throw new ApiError(401, "Sähköposti tai salasana ei täsmää.");
  const token = randomBytes(32).toString("base64url");
  developerSessions.set(hashToken(token), new Date(Date.now() + developerSessionLifetimeMs).toISOString());
  json(response, 200, { authenticated: true }, { "set-cookie": developerSessionCookie(token, request) });
}

async function developerSetup(request, response) {
  assertSameOrigin(request);
  rateLimit(request, "developer-setup", 5);
  if (!developerSetupAllowed(request) || developerSetupInProgress) {
    throw new ApiError(403, "Developer Console -tunnusten ensiasetus on sallittu vain paikallisessa kehitysympäristössä.");
  }
  developerSetupInProgress = true;
  try {
    const body = await readJson(request);
    const email = validateEmail(body.email);
    const credentials = await createPasswordHash(body.password);
    if (developerConfiguration().configured) throw new ApiError(409, "Developer Console -tunnukset on jo määritetty.");
    const nextCredentials = { email, ...credentials };
    const temporaryPath = `${developerCredentialsPath}.${randomUUID()}.tmp`;
    await mkdir(dirname(developerCredentialsPath), { recursive: true });
    await writeFile(temporaryPath, JSON.stringify(nextCredentials), { mode: 0o600 });
    await rename(temporaryPath, developerCredentialsPath);
    storedDeveloperCredentials = nextCredentials;
    const token = randomBytes(32).toString("base64url");
    developerSessions.set(hashToken(token), new Date(Date.now() + developerSessionLifetimeMs).toISOString());
    json(response, 200, { authenticated: true }, { "set-cookie": developerSessionCookie(token, request) });
  } finally {
    developerSetupInProgress = false;
  }
}

async function developerChange(request, response) {
  assertSameOrigin(request);
  requireDeveloperSession(request);
  if (developerConfiguration().source === "environment") {
    throw new ApiError(409, "Palvelinympäristön Developer-tunnukset muutetaan ympäristömuuttujista.");
  }
  const body = await readJson(request);
  const email = validateEmail(body.email);
  const credentials = await createPasswordHash(body.password);
  const temporaryPath = `${developerCredentialsPath}.${randomUUID()}.tmp`;
  await mkdir(dirname(developerCredentialsPath), { recursive: true });
  await writeFile(temporaryPath, JSON.stringify({ email, ...credentials }), { mode: 0o600 });
  await rename(temporaryPath, developerCredentialsPath);
  storedDeveloperCredentials = { email, ...credentials };
  json(response, 200, { authenticated: true });
}

async function developerReset(request, response) {
  assertSameOrigin(request);
  rateLimit(request, "developer-reset", 5);
  if (!developerResetAllowed(request)) {
    throw new ApiError(403, "Developer Console -tunnusten nollaus on sallittu vain paikallisessa kehitysympäristössä.");
  }
  const body = await readJson(request);
  const email = validateEmail(body.email);
  const credentials = await createPasswordHash(body.password);
  const temporaryPath = `${developerCredentialsPath}.${randomUUID()}.tmp`;
  await mkdir(dirname(developerCredentialsPath), { recursive: true });
  await writeFile(temporaryPath, JSON.stringify({ email, ...credentials }), { mode: 0o600 });
  await rename(temporaryPath, developerCredentialsPath);
  storedDeveloperCredentials = { email, ...credentials };
  const token = randomBytes(32).toString("base64url");
  developerSessions.set(hashToken(token), new Date(Date.now() + developerSessionLifetimeMs).toISOString());
  json(response, 200, { authenticated: true }, { "set-cookie": developerSessionCookie(token, request) });
}

function developerLogout(request, response) {
  assertSameOrigin(request);
  const token = readCookies(request).nexus_developer_session;
  if (token) developerSessions.delete(hashToken(token));
  json(response, 200, { authenticated: false }, { "set-cookie": developerSessionCookie("", request, true) });
}

function validateDisplayName(value) {
  if (typeof value !== "string") throw new ApiError(400, "Anna näyttönimi.");
  const cleanName = value.trim();
  if (cleanName.length < 2 || cleanName.length > 40) throw new ApiError(400, "Näyttönimen pitää olla 2–40 merkkiä.");
  return cleanName;
}

function validateEmail(value) {
  if (typeof value !== "string") throw new ApiError(400, "Anna sähköpostiosoite.");
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ApiError(400, "Anna kelvollinen sähköpostiosoite.");
  return email;
}

async function createPasswordHash(password) {
  if (typeof password !== "string" || password.length < 12 || password.length > 128) {
    throw new ApiError(400, "Salasanan pitää olla 12–128 merkkiä.");
  }
  const salt = randomBytes(16);
  const derived = await scrypt(password, salt, 64);
  return { salt: salt.toString("hex"), hash: Buffer.from(derived).toString("hex") };
}

async function verifyPassword(password, user) {
  const salt = user.salt ?? user.passwordSalt;
  const hash = user.hash ?? user.passwordHash;
  const derived = Buffer.from(await scrypt(password, Buffer.from(salt, "hex"), 64));
  const expected = Buffer.from(hash, "hex");
  return derived.length === expected.length && timingSafeEqual(derived, expected);
}

function createSession(user) {
  const token = randomBytes(32).toString("base64url");
  return {
    token,
    session: { tokenHash: hashToken(token), userId: user.id, expiresAt: new Date(Date.now() + sessionLifetimeMs).toISOString() },
  };
}

async function register(request, response) {
  assertSameOrigin(request);
  rateLimit(request, "register", 5);
  const body = await readJson(request);
  const email = validateEmail(body.email);
  const displayName = validateDisplayName(body.displayName);
  const rawCountry = typeof body.country === "string" ? body.country.trim() : "";
  if (rawCountry && !/^[A-Za-z]{2}$/.test(rawCountry)) throw new ApiError(400, "Maan pitää olla kaksikirjaiminen ISO-maakoodi.");
  const country = rawCountry.toUpperCase();
  const password = await createPasswordHash(body.password);
  const registered = await mutateStore((store) => {
    if (store.users.some((user) => user.email === email)) throw new ApiError(409, "Tälle sähköpostille on jo luotu tili.");
    const user = {
      id: randomUUID(),
      email,
      displayName,
      country,
      friends: [],
      leagueRating: 0,
      leaguePeakRating: 0,
      leagueSeasonHistory: [],
      ...password,
      createdAt: new Date().toISOString(),
    };
    user.username = usernameFor(user);
    friendCodeFor(user);
    store.users.push(user);
    const auth = createSession(user);
    store.sessions.push(auth.session);
    return { user, token: auth.token };
  });
  json(response, 201, { account: publicAccount(registered.user) }, { "set-cookie": sessionCookie(registered.token, request) });
}

async function login(request, response) {
  assertSameOrigin(request);
  rateLimit(request, "login");
  const body = await readJson(request);
  const email = validateEmail(body.email);
  if (typeof body.password !== "string" || body.password.length > 128) throw new ApiError(401, "Sähköposti tai salasana on väärin.");
  const user = database.users.find((item) => item.email === email);
  const valid = user ? await verifyPassword(body.password, user) : false;
  if (!valid) throw new ApiError(401, "Sähköposti tai salasana on väärin.");
  const auth = createSession(user);
  await mutateStore((store) => {
    store.sessions = store.sessions.filter((session) => Date.parse(session.expiresAt) > Date.now());
    store.sessions.push(auth.session);
  });
  json(response, 200, { account: publicAccount(user) }, { "set-cookie": sessionCookie(auth.token, request) });
}

async function logout(request, response) {
  assertSameOrigin(request);
  const token = readCookies(request).nexus_league_session;
  if (token) {
    const tokenHash = hashToken(token);
    await mutateStore((store) => { store.sessions = store.sessions.filter((session) => session.tokenHash !== tokenHash); });
  }
  json(response, 200, { ok: true }, { "set-cookie": sessionCookie("", request, true) });
}

async function savePublication(request, response, user, publicationId) {
  assertSameOrigin(request);
  if (!/^[a-zA-Z0-9-]{1,80}$/.test(publicationId)) throw new ApiError(400, "Julkaisun tunniste ei kelpaa.");
  const contentType = request.headers["content-type"] ?? "";
  if (!contentType.startsWith("video/")) throw new ApiError(415, "Creator League hyväksyy vain videotiedostoja.");
  const title = decodeURIComponent(request.headers["x-creator-title"] ?? "").trim();
  if (!title || title.length > 80) throw new ApiError(400, "Videon otsikon pitää olla 1–80 merkkiä.");
  const gameId = decodeURIComponent(request.headers["x-creator-game"] ?? "").trim();
  if (gameId.length > 80) throw new ApiError(400, "Pelin tunniste on liian pitkä.");
  const durationSeconds = Number(request.headers["x-creator-duration"] ?? 0);
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0 || durationSeconds > 3600) {
    throw new ApiError(400, "Videon kestoa ei voitu lukea.");
  }
  const contentLength = Number(request.headers["content-length"] ?? 0);
  if (contentLength > maxVideoBytes) throw new ApiError(413, "Videon enimmäiskoko on 100 Mt.");

  const current = creatorSeason();
  const season = database.seasons.find((item) => item.id === current.id);
  const existingEntry = season?.entries?.[user.id];
  if (existingEntry?.publications.some((item) => item.id === publicationId)) {
    json(response, 200, publicSnapshot(database, user));
    return;
  }
  const today = new Date().toISOString().slice(0, 10);
  const todaysUploads = (existingEntry?.publications ?? []).filter((item) => item.createdAt.slice(0, 10) === today).length;
  if (todaysUploads >= dailyPublicationLimit) throw new ApiError(429, "Creator Leagueen voi julkaista enintään kaksi pisteytettävää videota päivässä.");

  const tempPath = resolve(mediaDirectory, `${randomUUID()}.upload`);
  const fileId = randomUUID();
  const extension = contentType.split("/")[1]?.split(";")[0]?.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8) || "video";
  const mediaPath = resolve(mediaDirectory, `${fileId}.${extension}`);
  const hash = createHash("sha256");
  let size = 0;
  const limiter = new Transform({
    transform(chunk, encoding, callback) {
      size += chunk.length;
      if (size > maxVideoBytes) {
        callback(new ApiError(413, "Videon enimmäiskoko on 100 Mt."));
        return;
      }
      hash.update(chunk);
      callback(null, chunk);
    },
  });
  try {
    await pipeline(request, limiter, createWriteStream(tempPath, { flags: "wx", mode: 0o600 }));
    if (size === 0) throw new ApiError(400, "Videotiedosto on tyhjä.");
    await rename(tempPath, mediaPath);
    const publicationResult = await mutateStore((store) => {
      const activeSeason = ensureSeason(store, current);
      const entry = activeSeason.entries[user.id] ?? { userId: user.id, publications: [], actions: [] };
      if (entry.publications.some((item) => item.id === publicationId)) return { duplicate: true, snapshot: publicSnapshot(store, user) };
      const currentDayUploads = entry.publications.filter((item) => item.createdAt.slice(0, 10) === today).length;
      if (currentDayUploads >= dailyPublicationLimit) throw new ApiError(429, "Creator Leagueen voi julkaista enintään kaksi pisteytettävää videota päivässä.");
      entry.publications.push({
        id: publicationId,
        title,
        ...(gameId ? { gameId } : {}),
        userId: user.id,
        createdAt: new Date().toISOString(),
        durationSeconds,
        contentType: contentType.split(";")[0].trim(),
        file: `${fileId}.${extension}`,
        bytes: size,
        sha256: hash.digest("hex"),
        watchers: {},
        likes: [],
        comments: [],
        saves: [],
        shares: [],
      });
      activeSeason.entries[user.id] = entry;
      return { duplicate: false, snapshot: publicSnapshot(store, user) };
    });
    if (publicationResult.duplicate) await unlink(mediaPath).catch(() => {});
    json(response, 200, publicationResult.snapshot);
  } catch (error) {
    await unlink(tempPath).catch(() => {});
    await unlink(mediaPath).catch(() => {});
    throw error;
  }
}

function findPublication(store, publicationId) {
  for (const season of store.seasons) {
    for (const entry of Object.values(season.entries)) {
      const publication = entry.publications?.find((item) => item.id === publicationId);
      if (publication) return { season, entry, publication };
    }
  }
  return null;
}

function getCurrentFeed(store, user = null) {
  const season = store.seasons.find((item) => item.id === creatorSeason().id);
  if (!season) return [];
  const usersById = new Map(store.users.map((item) => [item.id, item]));
  return Object.values(season.entries).flatMap((entry) => (entry.publications ?? []).map((publication) => {
    const metrics = publicationMetrics(publication);
    const viewer = user ? publication.watchers?.[user.id] : undefined;
    return {
      id: publication.id,
      title: publication.title,
      gameId: publication.gameId,
      creatorName: usersById.get(entry.userId)?.displayName ?? "Creator",
      creatorId: entry.userId,
      createdAt: publication.createdAt,
      durationSeconds: publication.durationSeconds,
      metrics,
      inBattle: store.battles.some((battle) => battle.id === currentWeek().id && battle.submissions.some((item) => item.publicationId === publication.id)),
      completedChallenges: (store.seasons.find((item) => item.id === creatorSeason().id)?.entries[entry.userId]?.challengeCompletions ?? [])
        .filter((id) => id.startsWith(`${currentWeek().id}:`)).map((id) => id.slice(currentWeek().id.length + 1)),
      viewed: viewer ? hasQualifiedView(publication, viewer) : false,
      liked: user ? (publication.likes ?? []).includes(user.id) : false,
      saved: user ? (publication.saves ?? []).includes(user.id) : false,
      own: user ? entry.userId === user.id : false,
      comments: (publication.comments ?? []).slice(-20),
    };
  })).sort((first, second) => Date.parse(second.createdAt) - Date.parse(first.createdAt)).slice(0, 100);
}

async function streamPublication(request, response, publication) {
  const path = resolve(mediaDirectory, publication.file);
  const details = await stat(path);
  const range = request.headers.range;
  const commonHeaders = {
    "content-type": publication.contentType ?? `video/${publication.file.split(".").pop()}`,
    "accept-ranges": "bytes",
    "cache-control": "private, no-store",
    "x-content-type-options": "nosniff",
  };
  if (!range) {
    response.writeHead(200, { ...commonHeaders, "content-length": details.size });
    await pipeline(createReadStream(path), response);
    return;
  }
  const match = /^bytes=(\d*)-(\d*)$/.exec(range);
  if (!match) throw new ApiError(416, "Videon tavutuspyyntö ei kelpaa.");
  let start = match[1] ? Number(match[1]) : 0;
  let end = match[2] ? Number(match[2]) : details.size - 1;
  if (!match[1] && match[2]) {
    const suffixLength = Number(match[2]);
    start = Math.max(0, details.size - suffixLength);
    end = details.size - 1;
  }
  if (start > end || end >= details.size) {
    response.writeHead(416, { ...commonHeaders, "content-range": `bytes */${details.size}` });
    response.end();
    return;
  }
  response.writeHead(206, {
    ...commonHeaders,
    "content-length": end - start + 1,
    "content-range": `bytes ${start}-${end}/${details.size}`,
  });
  await pipeline(createReadStream(path, { start, end }), response);
}

async function recordCreatorActivity(request, response, user) {
  assertSameOrigin(request);
  const body = await readJson(request);
  const allowedTypes = Object.keys(creatorDailyLimits);
  if (!allowedTypes.includes(body.type) || typeof body.sourceId !== "string" || !/^[a-zA-Z0-9:_-]{1,120}$/.test(body.sourceId)) {
    throw new ApiError(400, "Creator-toiminnon tunniste ei kelpaa.");
  }
  const type = body.type;
  const today = new Date().toISOString().slice(0, 10);
  const result = await mutateStore((store) => {
    const season = ensureSeason(store, creatorSeason());
    const entry = season.entries[user.id] ?? { userId: user.id, publications: [], actions: [] };
    entry.actions ??= [];
    const id = `${type}:${body.sourceId}`;
    if (entry.actions.some((action) => action.id === id)) return { duplicate: true, snapshot: publicSnapshot(store, user) };
    const todaysCount = entry.actions.filter((action) => action.type === type && action.createdAt.slice(0, 10) === today).length;
    if (todaysCount >= creatorDailyLimits[type]) throw new ApiError(429, "Tämän Creator-toiminnon päiväkohtainen pistemäärä on täynnä.");
    entry.actions.push({ id, type, createdAt: new Date().toISOString() });
    season.entries[user.id] = entry;
    return { duplicate: false, snapshot: publicSnapshot(store, user) };
  });
  json(response, 200, { ...result.snapshot, duplicate: result.duplicate });
}

async function completeWeeklyChallenge(request, response, user, challengeId) {
  assertSameOrigin(request);
  const body = await readJson(request);
  const week = currentWeek();
  const challenge = week.challenges.find((item) => item.id === challengeId);
  if (!challenge || typeof body.publicationId !== "string") throw new ApiError(400, "Viikoittaisen haasteen lähetys ei kelpaa.");
  const result = await mutateStore((store) => {
    const found = findPublication(store, body.publicationId);
    if (!found || found.entry.userId !== user.id || found.season.id !== creatorSeason().id) {
      throw new ApiError(404, "Lähetä ensin oma videosi tämän kauden Creator League -feediin.");
    }
    if (found.publication.durationSeconds < challenge.minDuration || found.publication.durationSeconds > challenge.maxDuration) {
      throw new ApiError(400, `Tämän haasteen videon keston pitää olla ${challenge.minDuration}–${challenge.maxDuration} sekuntia.`);
    }
    const season = ensureSeason(store, creatorSeason());
    const entry = season.entries[user.id] ?? { userId: user.id, publications: [], actions: [], challengeCompletions: [], battleRewards: [] };
    entry.challengeCompletions ??= [];
    const completionId = `${week.id}:${challenge.id}`;
    if (entry.challengeCompletions.includes(completionId)) return { duplicate: true, snapshot: publicSnapshot(store, user) };
    entry.actions ??= [];
    entry.actions.push({ id: `challenge:${completionId}`, type: "challenge", createdAt: new Date().toISOString() });
    entry.challengeCompletions.push(completionId);
    season.entries[user.id] = entry;
    return { duplicate: false, snapshot: publicSnapshot(store, user) };
  });
  json(response, 200, { ...result.snapshot, duplicate: result.duplicate, challenges: publicChallenges(database, user) });
}

async function submitBattleVideo(request, response, user, battleId) {
  assertSameOrigin(request);
  const body = await readJson(request);
  const week = currentWeek();
  if (battleId !== week.id || Date.now() >= Date.parse(week.endsAt) || typeof body.publicationId !== "string") {
    throw new ApiError(400, "Tähän Creator Battleen ei voi enää lähettää videota.");
  }
  const result = await mutateStore((store) => {
    const found = findPublication(store, body.publicationId);
    if (!found || found.entry.userId !== user.id || found.season.id !== creatorSeason().id) {
      throw new ApiError(404, "Lähetä ensin oma videosi tämän kauden Creator League -feediin.");
    }
    const battle = ensureWeekBattle(store, week);
    if (battle.finalizedAt) throw new ApiError(409, "Tämä Creator Battle on jo suljettu.");
    if (battle.submissions.some((item) => item.publicationId === body.publicationId)) {
      return { duplicate: true, battle: publicBattle(store, battle, user) };
    }
    if (battle.submissions.some((item) => item.userId === user.id)) throw new ApiError(409, "Viikossa voi lähettää yhden videon Creator Battleen.");
    if (new Set(battle.submissions.map((item) => item.userId)).size >= weeklyBattleParticipantLimit) {
      throw new ApiError(409, "Creator Battle on täynnä. Viikkoon mahtuu enintään 100 osallistujaa.");
    }
    battle.submissions.push({ publicationId: body.publicationId, userId: user.id, createdAt: new Date().toISOString() });
    return { duplicate: false, battle: publicBattle(store, battle, user) };
  });
  json(response, 200, result);
}

async function voteInBattle(request, response, user, battleId, publicationId) {
  assertSameOrigin(request);
  const body = await readJson(request);
  const creativity = Number(body.creativity);
  const editing = Number(body.editing);
  if (![creativity, editing].every((value) => Number.isInteger(value) && value >= 1 && value <= 5)) {
    throw new ApiError(400, "Anna luovuudelle ja editoinnille arvosana 1–5.");
  }
  const result = await mutateStore((store) => {
    const battle = store.battles.find((item) => item.id === battleId);
    if (!battle || battle.finalizedAt || Date.now() >= Date.parse(battle.endsAt)) throw new ApiError(409, "Tämä Creator Battle on jo suljettu.");
    const submission = battle.submissions.find((item) => item.publicationId === publicationId);
    if (!submission) throw new ApiError(404, "Battle-videota ei löytynyt.");
    if (submission.userId === user.id) throw new ApiError(403, "Et voi äänestää omaa Battle-videoasi.");
    const vote = battle.votes.find((item) => item.submissionId === publicationId && item.userId === user.id);
    if (vote) {
      vote.creativity = creativity;
      vote.editing = editing;
      vote.updatedAt = new Date().toISOString();
    } else {
      battle.votes.push({ submissionId: publicationId, userId: user.id, creativity, editing, createdAt: new Date().toISOString() });
    }
    return publicBattle(store, battle, user);
  });
  json(response, 200, { battle: result });
}

async function handleFriendRequest(request, response, user, requestId) {
  assertSameOrigin(request);
  const body = await readJson(request);
  if (typeof body.accept !== "boolean") throw new ApiError(400, "Valitse hyväksytäänkö kaveripyyntö.");
  const result = await mutateStore((store) => {
    const pending = store.friendRequests.find((item) => item.id === requestId && item.toUserId === user.id && item.status === "pending");
    if (!pending) throw new ApiError(404, "Aktiivista kaveripyyntöä ei löytynyt.");
    pending.status = body.accept ? "accepted" : "declined";
    pending.respondedAt = new Date().toISOString();
    if (body.accept) {
      const sender = store.users.find((item) => item.id === pending.fromUserId);
      const recipient = store.users.find((item) => item.id === pending.toUserId);
      if (!sender || !recipient) throw new ApiError(404, "Käyttäjää ei löytynyt.");
      sender.friends ??= [];
      recipient.friends ??= [];
      if (!sender.friends.includes(recipient.id)) sender.friends.push(recipient.id);
      if (!recipient.friends.includes(sender.id)) recipient.friends.push(sender.id);
    }
    return socialSnapshot(store, user);
  });
  json(response, 200, result);
}

function socialSnapshot(store, user, search = "") {
  const usersById = new Map(store.users.map((item) => [item.id, item]));
  const describe = (id) => {
    const item = usersById.get(id);
    return item ? { id: item.id, username: usernameFor(item), displayName: item.displayName, friendCode: friendCodeFor(item), country: item.country ?? "" } : null;
  };
  const rawQuery = search.trim().replace(/^@/, "");
  const q = rawQuery.toLowerCase();
  const codeQuery = rawQuery.replace(/[^a-z0-9]/gi, "").toUpperCase();
  const searchableUsers = store.users.filter((item) => item.id !== user.id);
  const matches = q.length >= 2 ? searchableUsers.filter((item) =>
    usernameFor(item).toLowerCase().includes(q)
    || item.displayName.toLowerCase().includes(q)
    || friendCodeFor(item).replace(/[^a-z0-9]/gi, "").toUpperCase().startsWith(codeQuery))
    .sort((first, second) => {
      const score = (item) => {
        const code = friendCodeFor(item).replace(/[^a-z0-9]/gi, "").toUpperCase();
        if (code === codeQuery) return 0;
        if (usernameFor(item).toLowerCase() === q) return 1;
        if (item.displayName.toLowerCase() === q) return 2;
        return 3;
      };
      return score(first) - score(second) || first.displayName.localeCompare(second.displayName);
    }).slice(0, 10) : [];
  const describeSearchResult = (item) => ({
    id: item.id,
    username: usernameFor(item),
    displayName: item.displayName,
    friendCode: friendCodeFor(item),
    country: item.country ?? "",
  });
  return {
    account: publicAccount(user),
    friends: (user.friends ?? []).map(describe).filter(Boolean),
    incoming: store.friendRequests.filter((item) => item.toUserId === user.id && item.status === "pending")
      .map((item) => ({ ...describe(item.fromUserId), id: item.id })),
    outgoing: store.friendRequests.filter((item) => item.fromUserId === user.id && item.status === "pending")
      .map((item) => ({ ...describe(item.toUserId), id: item.id })),
    search: matches.map(describeSearchResult),
  };
}

async function createFriendRequest(request, response, user) {
  assertSameOrigin(request);
  const body = await readJson(request);
  const query = typeof body.userId === "string" ? body.userId : typeof body.username === "string" ? body.username.trim().replace(/^@/, "") : "";
  if (!query) throw new ApiError(400, "Valitse Creator League -käyttäjä.");
  const normalizedCode = query.replace(/[^a-z0-9]/gi, "").toUpperCase();
  const target = database.users.find((item) => item.id === query)
    ?? database.users.find((item) => usernameFor(item).toLowerCase() === query.toLowerCase())
    ?? database.users.find((item) => friendCodeFor(item).replace(/[^a-z0-9]/gi, "").toUpperCase() === normalizedCode)
    ?? (() => {
      const matches = database.users.filter((item) => item.displayName.toLowerCase() === query.toLowerCase());
      if (matches.length > 1) throw new ApiError(409, "Samannimisiä käyttäjiä löytyi useita. Käytä kaverikoodia.");
      return matches[0];
    })();
  if (!target || target.id === user.id) throw new ApiError(404, "Creatoria ei löytynyt.");
  const result = await mutateStore((store) => {
    const sender = store.users.find((item) => item.id === user.id);
    if (sender.friends?.includes(target.id)) throw new ApiError(409, "Olette jo kavereita.");
    const reverse = store.friendRequests.find((item) => item.fromUserId === target.id && item.toUserId === user.id && item.status === "pending");
    if (reverse) {
      reverse.status = "accepted";
      reverse.respondedAt = new Date().toISOString();
      sender.friends ??= [];
      const recipient = store.users.find((item) => item.id === target.id);
      recipient.friends ??= [];
      sender.friends.push(target.id);
      recipient.friends.push(sender.id);
    } else if (store.friendRequests.some((item) => item.fromUserId === user.id && item.toUserId === target.id && item.status === "pending")) {
      throw new ApiError(409, "Kaveripyyntö on jo lähetetty.");
    } else {
      store.friendRequests.push({ id: randomUUID(), fromUserId: user.id, toUserId: target.id, status: "pending", createdAt: new Date().toISOString() });
    }
    return socialSnapshot(store, sender);
  });
  json(response, 200, result);
}

async function interactWithPublication(request, response, user, publicationId) {
  assertSameOrigin(request);
  const body = await readJson(request);
  const validTypes = ["watch", "like", "comment", "save", "share"];
  if (!validTypes.includes(body.type)) throw new ApiError(400, "Videon toiminto ei kelpaa.");
  const result = await mutateStore((store) => {
    const found = findPublication(store, publicationId);
    if (!found) throw new ApiError(404, "Videota ei löytynyt.");
    const { entry, publication } = found;
    if (entry.userId === user.id) throw new ApiError(403, "Et voi kasvattaa pisteitä omalla videollasi.");
    publication.watchers ??= {};
    publication.likes ??= [];
    publication.comments ??= [];
    publication.saves ??= [];
    publication.shares ??= [];
    if (body.type === "watch") {
      const currentTime = Number(body.currentTime);
      if (!Number.isFinite(currentTime) || currentTime < 0 || currentTime > publication.durationSeconds + 1) {
        throw new ApiError(400, "Videon katselukohta ei kelpaa.");
      }
      const now = Date.now();
      const viewer = publication.watchers[user.id] ?? { watchedSeconds: 0, lastMediaTime: 0, lastReportedAt: now };
      const elapsed = Math.min(10, Math.max(0, (now - viewer.lastReportedAt) / 1000));
      const mediaDelta = currentTime - viewer.lastMediaTime;
      if (mediaDelta > 0 && mediaDelta <= elapsed * 1.75 + 1) {
        viewer.watchedSeconds = Math.min(publication.durationSeconds, viewer.watchedSeconds + Math.min(mediaDelta, elapsed * 1.75));
      }
      viewer.lastMediaTime = currentTime;
      viewer.lastReportedAt = now;
      publication.watchers[user.id] = viewer;
    } else if (body.type === "like" || body.type === "save") {
      const property = body.type === "like" ? "likes" : "saves";
      publication[property] = publication[property].includes(user.id)
        ? publication[property].filter((id) => id !== user.id)
        : [...publication[property], user.id];
    } else if (body.type === "share") {
      if (!publication.shares.includes(user.id)) publication.shares.push(user.id);
    } else {
      const text = typeof body.text === "string" ? body.text.trim() : "";
      if (text.length < 1 || text.length > 500) throw new ApiError(400, "Kommentin pitää olla 1–500 merkkiä.");
      rateLimit(request, `comment:${user.id}`, 10);
      const today = new Date().toISOString().slice(0, 10);
      const todayComments = publication.comments.filter((comment) =>
        comment.userId === user.id && comment.createdAt.slice(0, 10) === today,
      ).length;
      if (todayComments >= 3) throw new ApiError(429, "Yhdelle videolle voi kirjoittaa enintään kolme kommenttia päivässä.");
      publication.comments.push({
        id: randomUUID(),
        userId: user.id,
        displayName: user.displayName,
        text,
        createdAt: new Date().toISOString(),
      });
    }
    return publicSnapshot(store, user);
  });
  json(response, 200, { ...result, feed: getCurrentFeed(database, user) });
}

function requireLeagueUser(request) {
  const user = getSessionUser(request);
  if (!user) throw new ApiError(401, "Kirjaudu sisään Creator Leagueen.");
  return user;
}

function messageConversationSnapshot(store, conversation, user) {
  const peerId = conversation.participantIds.find((id) => id !== user.id);
  const peer = store.users.find((item) => item.id === peerId);
  if (!peer) throw new ApiError(404, "Keskustelun käyttäjää ei löytynyt.");
  return {
    id: conversation.id,
    name: peer.displayName,
    avatar: [...peer.displayName][0]?.toUpperCase() ?? "?",
    color: ["violet", "cyan", "pink"][conversation.colorIndex ?? 0],
    online: true,
    peerUserId: peer.id,
    messages: conversation.messages.map((message) => ({
      id: message.id,
      text: message.text,
      sentAt: message.sentAt,
      direction: message.senderId === user.id ? "outgoing" : "incoming",
      reactions: message.reactions?.[user.id] ?? [],
    })),
  };
}

function getMessagesSnapshot(store, user) {
  const friends = (user.friends ?? [])
    .map((id) => store.users.find((item) => item.id === id))
    .filter(Boolean)
    .map((friend) => ({
      id: friend.id,
      username: usernameFor(friend),
      displayName: friend.displayName,
      country: friend.country ?? "",
    }));
  const conversations = store.conversations
    .filter((conversation) => conversation.participantIds?.includes(user.id))
    .map((conversation) => messageConversationSnapshot(store, conversation, user))
    .sort((first, second) => (second.messages.at(-1)?.sentAt ?? "").localeCompare(first.messages.at(-1)?.sentAt ?? ""));
  return { friends, conversations };
}

async function createMessageConversation(request, response, user) {
  assertSameOrigin(request);
  const body = await readJson(request);
  if (typeof body.friendId !== "string") throw new ApiError(400, "Valitse Creator League -kaveri.");
  const result = await mutateStore((store) => {
    const sender = store.users.find((item) => item.id === user.id);
    if (!sender?.friends?.includes(body.friendId)) throw new ApiError(403, "Verkkokeskustelun voi aloittaa vain Creator League -kaverin kanssa.");
    const participantIds = [user.id, body.friendId].sort();
    let conversation = store.conversations.find((item) =>
      item.participantIds?.length === 2 && item.participantIds[0] === participantIds[0] && item.participantIds[1] === participantIds[1]);
    if (!conversation) {
      conversation = {
        id: randomUUID(),
        participantIds,
        colorIndex: store.conversations.length % 3,
        messages: [],
        createdAt: new Date().toISOString(),
      };
      store.conversations.push(conversation);
    }
    return messageConversationSnapshot(store, conversation, user);
  });
  json(response, 200, result);
}

async function createOnlineMessage(request, response, user, conversationId) {
  assertSameOrigin(request);
  rateLimit(request, "message-send", 60);
  const body = await readJson(request);
  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text || text.length > 2000) throw new ApiError(400, "Viestin pitää sisältää 1–2 000 merkkiä.");
  const result = await mutateStore((store) => {
    const conversation = store.conversations.find((item) => item.id === conversationId && item.participantIds?.includes(user.id));
    if (!conversation) throw new ApiError(404, "Keskustelua ei löytynyt.");
    const message = { id: randomUUID(), senderId: user.id, text, sentAt: new Date().toISOString(), reactions: {} };
    conversation.messages.push(message);
    if (conversation.messages.length > 500) conversation.messages.splice(0, conversation.messages.length - 500);
    return messageConversationSnapshot(store, conversation, user);
  });
  json(response, 201, result);
}

async function updateOnlineMessage(request, response, user, conversationId, messageId, action) {
  assertSameOrigin(request);
  const body = await readJson(request);
  const result = await mutateStore((store) => {
    const conversation = store.conversations.find((item) => item.id === conversationId && item.participantIds?.includes(user.id));
    if (!conversation) throw new ApiError(404, "Keskustelua ei löytynyt.");
    const message = conversation.messages.find((item) => item.id === messageId);
    if (!message) throw new ApiError(404, "Viestiä ei löytynyt.");
    if (action === "reaction") {
      if (typeof body.emoji !== "string" || [...body.emoji].length > 8) throw new ApiError(400, "Reaktio ei kelpaa.");
      const reactions = message.reactions ??= {};
      const ownReactions = reactions[user.id] ??= [];
      reactions[user.id] = ownReactions.includes(body.emoji)
        ? ownReactions.filter((emoji) => emoji !== body.emoji)
        : [...ownReactions, body.emoji].slice(-8);
    } else if (action === "edit") {
      const text = typeof body.text === "string" ? body.text.trim() : "";
      if (message.senderId !== user.id) throw new ApiError(403, "Voit muokata vain omaa viestiäsi.");
      if (!text || text.length > 2000) throw new ApiError(400, "Viesti ei kelpaa.");
      message.text = text;
      message.editedAt = new Date().toISOString();
    } else {
      if (message.senderId !== user.id) throw new ApiError(403, "Voit poistaa vain oman viestisi.");
      conversation.messages = conversation.messages.filter((item) => item.id !== messageId);
    }
    return messageConversationSnapshot(store, conversation, user);
  });
  json(response, 200, result);
}

const server = createServer(async (request, response) => {
  const pathname = new URL(request.url ?? "/", "http://localhost").pathname;
  try {
    if (request.method === "GET" && pathname === "/health") {
      json(response, 200, { status: "ok" });
      return;
    }
    if (!pathname.startsWith("/api/creator-league/")) {
      json(response, 404, { error: "Reittiä ei löytynyt." });
      return;
    }
    if (request.method === "GET" && pathname === "/api/creator-league/developer/session") {
      json(response, 200, {
        configured: developerConfiguration().configured,
        authenticated: Boolean(getDeveloperSession(request)),
        setupAllowed: developerSetupAllowed(request),
      });
      return;
    }
    if (request.method === "POST" && pathname === "/api/creator-league/developer/setup") {
      await developerSetup(request, response);
      return;
    }
    if (request.method === "POST" && pathname === "/api/creator-league/developer/change") {
      await developerChange(request, response);
      return;
    }
    if (request.method === "POST" && pathname === "/api/creator-league/developer/reset") {
      await developerReset(request, response);
      return;
    }
    if (request.method === "POST" && pathname === "/api/creator-league/developer/login") {
      await developerLogin(request, response);
      return;
    }
    if (request.method === "POST" && pathname === "/api/creator-league/developer/logout") {
      developerLogout(request, response);
      return;
    }
    if (pathname.startsWith("/api/creator-league/developer/")) {
      requireDeveloperSession(request);
      json(response, 404, { error: "Reittiä ei löytynyt." });
      return;
    }
    if (request.method === "POST" && pathname === "/api/creator-league/auth/register") {
      await register(request, response);
      return;
    }
    if (request.method === "POST" && pathname === "/api/creator-league/auth/login") {
      await login(request, response);
      return;
    }
    if (request.method === "POST" && pathname === "/api/creator-league/auth/logout") {
      await logout(request, response);
      return;
    }
    if (request.method === "GET" && pathname === "/api/creator-league/auth/me") {
      const user = getSessionUser(request);
      json(response, 200, { account: user ? publicAccount(user) : null });
      return;
    }
    if (request.method === "GET" && pathname === "/api/creator-league/account/state") {
      const user = requireLeagueUser(request);
      json(response, 200, { state: user.appState ?? null });
      return;
    }
    if (request.method === "PUT" && pathname === "/api/creator-league/account/state") {
      assertSameOrigin(request);
      const user = requireLeagueUser(request);
      const body = await readJson(request, 2 * 1024 * 1024);
      if (!body || typeof body !== "object" || !body.state || typeof body.state !== "object" || Array.isArray(body.state)) {
        throw new ApiError(400, "Tilin tallennustiedot eivät kelpaa.");
      }
      const result = await mutateStore((store) => {
        const account = store.users.find((item) => item.id === user.id);
        if (!account) throw new ApiError(401, "Kirjaudu uudelleen sisään.");
        account.appState = body.state;
        account.appStateUpdatedAt = new Date().toISOString();
        return account.appStateUpdatedAt;
      });
      json(response, 200, { savedAt: result });
      return;
    }
    if (request.method === "GET" && pathname === "/api/creator-league/messages") {
      json(response, 200, getMessagesSnapshot(database, requireLeagueUser(request)));
      return;
    }
    if (request.method === "POST" && pathname === "/api/creator-league/messages/conversations") {
      await createMessageConversation(request, response, requireLeagueUser(request));
      return;
    }
    const messageRoute = pathname.match(/^\/api\/creator-league\/messages\/conversations\/([a-zA-Z0-9-]+)(?:\/messages(?:\/([a-zA-Z0-9-]+)(?:\/(reaction))?)?)?$/);
    if (messageRoute) {
      const [, conversationId, messageId, action] = messageRoute;
      const user = requireLeagueUser(request);
      if (request.method === "POST" && !messageId) {
        await createOnlineMessage(request, response, user, conversationId);
        return;
      }
      if (messageId && action === "reaction" && request.method === "POST") {
        await updateOnlineMessage(request, response, user, conversationId, messageId, "reaction");
        return;
      }
      if (messageId && request.method === "PATCH") {
        await updateOnlineMessage(request, response, user, conversationId, messageId, "edit");
        return;
      }
      if (messageId && request.method === "DELETE") {
        await updateOnlineMessage(request, response, user, conversationId, messageId, "delete");
        return;
      }
    }
    if (request.method === "GET" && pathname === "/api/creator-league/leaderboard") {
      const user = getSessionUser(request);
      const query = new URL(request.url ?? "/", "http://localhost").searchParams;
      const scope = query.get("scope") ?? "global";
      if (!["global", "friends", "country"].includes(scope)) throw new ApiError(400, "Leaderboard-näkymä ei kelpaa.");
      if ((scope === "friends" || scope === "country") && !user) throw new ApiError(401, "Kirjaudu sisään nähdäksesi tämän rankingin.");
      if (scope === "country" && !user.country) throw new ApiError(400, "Lisää tilillesi maakoodi nähdäksesi Country-rankingin.");
      const expiredBattles = finalizeExpiredBattles(database);
      const expiredSeasons = finalizeExpiredSeasons(database);
      const expired = expiredBattles || expiredSeasons;
      let result;
      if (expired) {
        result = await mutateStore((store) => publicSnapshot(store, user, scope));
      } else {
        result = publicSnapshot(database, user, scope);
      }
      json(response, 200, result);
      return;
    }
    if (request.method === "GET" && pathname === "/api/creator-league/rising") {
      json(response, 200, { creators: risingCreators(database) });
      return;
    }
    if (pathname === "/api/creator-league/social" && request.method === "GET") {
      const user = requireLeagueUser(request);
      json(response, 200, socialSnapshot(database, user, new URL(request.url ?? "/", "http://localhost").searchParams.get("q") ?? ""));
      return;
    }
    if (pathname === "/api/creator-league/social/friend-requests" && request.method === "POST") {
      await createFriendRequest(request, response, requireLeagueUser(request));
      return;
    }
    const friendRequestMatch = pathname.match(/^\/api\/creator-league\/social\/friend-requests\/([a-zA-Z0-9-]+)$/);
    if (friendRequestMatch && request.method === "POST") {
      await handleFriendRequest(request, response, requireLeagueUser(request), friendRequestMatch[1]);
      return;
    }
    if (request.method === "GET" && pathname === "/api/creator-league/weekly") {
      const user = requireLeagueUser(request);
      const expired = finalizeExpiredBattles(database);
      if (expired) await mutateStore((store) => ensureWeekBattle(store));
      const battle = database.battles.find((item) => item.id === currentWeek().id) ?? ensureWeekBattle(database);
      json(response, 200, {
        battle: publicBattle(database, battle, user),
        challenges: publicChallenges(database, user),
      });
      return;
    }
    const battleSubmitMatch = pathname.match(/^\/api\/creator-league\/weekly\/battles\/([0-9-]+)\/submissions$/);
    if (battleSubmitMatch && request.method === "POST") {
      await submitBattleVideo(request, response, requireLeagueUser(request), battleSubmitMatch[1]);
      return;
    }
    const battleVoteMatch = pathname.match(/^\/api\/creator-league\/weekly\/battles\/([0-9-]+)\/votes\/([a-zA-Z0-9-]+)$/);
    if (battleVoteMatch && request.method === "POST") {
      await voteInBattle(request, response, requireLeagueUser(request), battleVoteMatch[1], battleVoteMatch[2]);
      return;
    }
    const challengeMatch = pathname.match(/^\/api\/creator-league\/weekly\/challenges\/([a-z0-9-]+)\/complete$/);
    if (challengeMatch && request.method === "POST") {
      await completeWeeklyChallenge(request, response, requireLeagueUser(request), challengeMatch[1]);
      return;
    }
    if (request.method === "GET" && pathname === "/api/creator-league/feed") {
      const user = requireLeagueUser(request);
      json(response, 200, { feed: getCurrentFeed(database, user) });
      return;
    }
    if (request.method === "GET" && pathname === "/api/creator-league/public-feed") {
      json(response, 200, { feed: getCurrentFeed(database) });
      return;
    }
    if (request.method === "POST" && pathname === "/api/creator-league/activities") {
      await recordCreatorActivity(request, response, requireLeagueUser(request));
      return;
    }
    const feedMatch = pathname.match(/^\/api\/creator-league\/feed\/([a-zA-Z0-9-]+)(?:\/(media|interaction))?$/);
    if (feedMatch) {
      const publicationId = feedMatch[1];
      const subroute = feedMatch[2];
      if (request.method === "GET" && subroute === "media") {
        const found = findPublication(database, publicationId);
        if (!found) throw new ApiError(404, "Videota ei löytynyt.");
        await streamPublication(request, response, found.publication);
        return;
      }
      const user = requireLeagueUser(request);
      if (request.method === "POST" && subroute === "interaction") {
        await interactWithPublication(request, response, user, publicationId);
        return;
      }
      if (!subroute && request.method === "GET") {
        const found = findPublication(database, publicationId);
        if (!found) throw new ApiError(404, "Videota ei löytynyt.");
        json(response, 200, getCurrentFeed(database, user).find((item) => item.id === publicationId) ?? null);
        return;
      }
    }
    const publicationMatch = pathname.match(/^\/api\/creator-league\/publications\/([a-zA-Z0-9-]+)$/);
    if (request.method === "POST" && publicationMatch) {
      await savePublication(request, response, requireLeagueUser(request), publicationMatch[1]);
      return;
    }
    json(response, 404, { error: "Reittiä ei löytynyt." });
  } catch (error) {
    if (response.headersSent) {
      response.destroy(error);
      return;
    }
    if (error instanceof ApiError) {
      json(response, error.status, { error: error.message });
      return;
    }
    console.error("Creator League -palvelun pyyntö epäonnistui.", error);
    json(response, 500, { error: "Creator League -palvelussa tapahtui virhe." });
  }
});

await loadDatabase();
finalizeExpiredBattles(database);
finalizeExpiredSeasons(database);
await persistDatabase();
server.listen(port, host, () => console.log(`Creator League API listening on ${host}:${port}`));

function shutdown() {
  server.close(() => process.exit(0));
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
