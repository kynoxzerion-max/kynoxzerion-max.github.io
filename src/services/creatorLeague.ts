import type { ConversationEntry } from "../types";

export interface CreatorLeagueAccount {
  id: string;
  email: string;
  displayName: string;
  username: string;
  friendCode: string;
  country: string;
}

export interface CreatorLeagueReward {
  id: string;
  kind: "badge" | "title" | "achievement" | "border" | "theme" | "trophy" | "effect";
  name: string;
  description: string;
  icon: string;
  effect?: "glow" | "shimmer" | "aurora" | "prism" | "pulse";
}

export interface CreatorLeagueScore {
  total: number;
  content: number;
  creator: number;
  quality: number;
  metrics: {
    views: number;
    watchSeconds: number;
    watchMinutes: number;
    likes: number;
    comments: number;
    saves: number;
    shares: number;
    expectedWatchSeconds: number;
  };
  creatorActions: Record<"publication" | "challenge" | "project" | "community" | "collaboration" | "battleWinner", number>;
}

export interface CreatorLeagueFeedItem {
  id: string;
  title: string;
  gameId?: string;
  creatorName: string;
  creatorId: string;
  createdAt: string;
  durationSeconds: number;
  inBattle: boolean;
  completedChallenges: string[];
  own: boolean;
  viewed: boolean;
  liked: boolean;
  saved: boolean;
  metrics: { views: number; watchSeconds: number; likes: number; comments: number; saves: number; shares: number };
  comments: { id: string; userId: string; displayName: string; text: string; createdAt: string }[];
}

export interface CreatorLeagueSnapshot {
  season: {
    id: string;
    name: string;
    startsAt: string;
    endsAt: string;
    finalizedAt: string | null;
  };
  account: CreatorLeagueAccount | null;
  standings: { userId: string; displayName: string; username: string; country: string; points: number; score: CreatorLeagueScore; rank: number }[];
  clpStandings: { userId: string; displayName: string; username: string; country: string; points: number; rank: number }[];
  myStanding: { points: number; score: CreatorLeagueScore; rank: number | null; videosPublished: number; publicationIds: string[] } | null;
  achievements: (CreatorLeagueReward & { requirement: number; requirementType: "score" | "videos"; earned: boolean })[];
  earnedRewards: CreatorLeagueReward[];
  podiumRewards: { place: number; rewards: CreatorLeagueReward[] }[];
  rankRewards: { tier: string; rewards: CreatorLeagueReward[] }[];
  scoreWeights: { content: number; creator: number; quality: number };
  scope: "global" | "friends" | "country";
  leagueRating: number;
  leagueProfile: CreatorLeagueProfile | null;
  creatorPerformance: (CreatorPerformance & { leaderboardRank: number | null }) | null;
  creatorStandings: (CreatorPerformance & {
    userId: string;
    displayName: string;
    username: string;
    country: string;
    rank: number;
  })[];
}

export interface CreatorScoreRank {
  tier: string;
  division: string;
  label: string;
  score: number;
  progress: number;
  progressMax: number;
  nextRank: string | null;
  nextScore: number;
}

export interface CreatorPerformance {
  score: number;
  maxScore: number;
  windowDays: number;
  videoCount: number;
  qualifiedVideos: number;
  averageVideoScore: number;
  consistencyScore: number;
  creatorRank: CreatorScoreRank;
}

export interface CreatorLeagueRank {
  tier: string;
  division: string;
  label: string;
  rating: number;
  progress: number;
  progressMax: number;
  nextRank: string | null;
  nextRating: number;
}

export interface CreatorLeagueProfile {
  rating: number;
  currentRank: CreatorLeagueRank;
  peakRank: CreatorLeagueRank;
  seasonRank: number | null;
  seasonHistory: {
    seasonId: string;
    seasonName: string;
    rating: number;
    rank: string;
    finalizedAt: string | null;
    achievement: string | null;
  }[];
}

export interface CreatorLeagueWeekly {
  battle: {
    id: string;
    theme: string;
    startsAt: string;
    endsAt: string;
    finalizedAt: string | null;
    ratingAward: number;
    participantCount: number;
    participantLimit: number;
    winner: { id: string; displayName: string } | null;
    submissions: {
      publicationId: string;
      userId: string;
      creatorName: string;
      title: string;
      own: boolean;
      myVote: { creativity: number; editing: number } | null;
      rating: { total: number; creativity: number; editing: number; engagement: number; quality: number; votes: number };
    }[];
  };
  challenges: {
    weekId: string;
    startsAt: string;
    endsAt: string;
    items: { id: string; title: string; description: string; minDuration: number; maxDuration: number; completed: boolean }[];
  };
}

export interface CreatorLeagueSocial {
  account: CreatorLeagueAccount;
  friends: { id: string; username: string; displayName: string; friendCode: string; country: string }[];
  incoming: { id: string; username?: string; displayName?: string; friendCode?: string; country?: string }[];
  outgoing: { id: string; username?: string; displayName?: string; friendCode?: string; country?: string }[];
  search: { id: string; username: string; displayName: string; friendCode: string; country: string }[];
}

export interface CreatorLeagueMessageFriend {
  id: string;
  username: string;
  displayName: string;
  country: string;
}

export interface CreatorLeagueMessages {
  friends: CreatorLeagueMessageFriend[];
  conversations: ConversationEntry[];
}

async function requestJson<T>(path: string, body?: unknown, method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"): Promise<T> {
  const response = await fetch(path, {
    method: method ?? (body === undefined ? "GET" : "POST"),
    credentials: "same-origin",
    cache: "no-store",
    headers: body === undefined ? undefined : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message = payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string"
      ? payload.error
      : "Creator League -palveluun ei saatu yhteyttä.";
    throw new Error(message);
  }
  return payload as T;
}

function onlineConversation(conversation: ConversationEntry): ConversationEntry {
  return { ...conversation, id: `online-${conversation.id}`, online: true };
}

function serverConversationId(conversationId: string): string {
  if (!conversationId.startsWith("online-")) throw new Error("Verkkokeskustelun tunniste ei kelpaa.");
  return encodeURIComponent(conversationId.slice("online-".length));
}

export async function getCreatorLeagueMessages(): Promise<CreatorLeagueMessages> {
  const result = await requestJson<Omit<CreatorLeagueMessages, "conversations"> & { conversations: ConversationEntry[] }>("/api/creator-league/messages");
  return { ...result, conversations: result.conversations.map(onlineConversation) };
}

export async function startCreatorLeagueConversation(friendId: string): Promise<ConversationEntry> {
  const conversation = await requestJson<ConversationEntry>("/api/creator-league/messages/conversations", { friendId });
  return onlineConversation(conversation);
}

export async function sendCreatorLeagueMessage(conversationId: string, text: string): Promise<ConversationEntry> {
  const conversation = await requestJson<ConversationEntry>(
    `/api/creator-league/messages/conversations/${serverConversationId(conversationId)}/messages`,
    { text },
  );
  return onlineConversation(conversation);
}

export async function toggleCreatorLeagueMessageReaction(conversationId: string, messageId: string, emoji: string): Promise<ConversationEntry> {
  const conversation = await requestJson<ConversationEntry>(
    `/api/creator-league/messages/conversations/${serverConversationId(conversationId)}/messages/${encodeURIComponent(messageId)}/reaction`,
    { emoji },
  );
  return onlineConversation(conversation);
}

export async function editCreatorLeagueMessage(conversationId: string, messageId: string, text: string): Promise<ConversationEntry> {
  const conversation = await requestJson<ConversationEntry>(
    `/api/creator-league/messages/conversations/${serverConversationId(conversationId)}/messages/${encodeURIComponent(messageId)}`,
    { text },
    "PATCH",
  );
  return onlineConversation(conversation);
}

export async function deleteCreatorLeagueMessage(conversationId: string, messageId: string): Promise<ConversationEntry> {
  const conversation = await requestJson<ConversationEntry>(
    `/api/creator-league/messages/conversations/${serverConversationId(conversationId)}/messages/${encodeURIComponent(messageId)}`,
    undefined,
    "DELETE",
  );
  return onlineConversation(conversation);
}

export async function getCreatorLeagueAccount(): Promise<CreatorLeagueAccount | null> {
  const payload = await requestJson<{ account: CreatorLeagueAccount | null }>("/api/creator-league/auth/me");
  return payload.account;
}

export async function getCreatorAccountState(): Promise<unknown | null> {
  const payload = await requestJson<{ state: unknown | null }>("/api/creator-league/account/state");
  return payload.state;
}

export async function saveCreatorAccountState(state: unknown): Promise<void> {
  await requestJson<{ savedAt: string }>("/api/creator-league/account/state", { state }, "PUT");
}

export async function getCreatorLeagueSnapshot(scope: "global" | "friends" | "country" = "global"): Promise<CreatorLeagueSnapshot> {
  return requestJson<CreatorLeagueSnapshot>(`/api/creator-league/leaderboard?scope=${scope}`);
}

export async function authenticateCreatorLeague(
  mode: "register" | "login",
  credentials: { email: string; password: string; displayName?: string; country?: string },
): Promise<CreatorLeagueAccount> {
  const payload = await requestJson<{ account: CreatorLeagueAccount }>(`/api/creator-league/auth/${mode}`, credentials);
  return payload.account;
}

export async function logoutCreatorLeague(): Promise<void> {
  await requestJson<{ ok: boolean }>("/api/creator-league/auth/logout", {});
}

export async function getCreatorLeagueFeed(): Promise<CreatorLeagueFeedItem[]> {
  const payload = await requestJson<{ feed: CreatorLeagueFeedItem[] }>("/api/creator-league/feed");
  return payload.feed;
}

export async function getCreatorLeaguePublicFeed(): Promise<CreatorLeagueFeedItem[]> {
  const payload = await requestJson<{ feed: CreatorLeagueFeedItem[] }>("/api/creator-league/public-feed");
  return payload.feed;
}

export async function getCreatorLeagueWeekly(): Promise<CreatorLeagueWeekly> {
  return requestJson<CreatorLeagueWeekly>("/api/creator-league/weekly");
}

export async function getRisingCreators(): Promise<{ creators: { userId: string; displayName: string; username: string; country: string; score: number; recentGrowth: number; engagement: number; quality: number; activity: number; rank: number }[] }> {
  return requestJson("/api/creator-league/rising");
}

export async function submitBattleVideo(battleId: string, publicationId: string): Promise<CreatorLeagueWeekly["battle"]> {
  const result = await requestJson<{ battle: CreatorLeagueWeekly["battle"] }>(`/api/creator-league/weekly/battles/${battleId}/submissions`, { publicationId });
  return result.battle;
}

export async function voteForBattleVideo(battleId: string, publicationId: string, creativity: number, editing: number): Promise<CreatorLeagueWeekly["battle"]> {
  const result = await requestJson<{ battle: CreatorLeagueWeekly["battle"] }>(`/api/creator-league/weekly/battles/${battleId}/votes/${publicationId}`, { creativity, editing });
  return result.battle;
}

export async function completeCreatorChallenge(challengeId: string, publicationId: string): Promise<{ duplicate?: boolean; challenges: CreatorLeagueWeekly["challenges"] }> {
  return requestJson(`/api/creator-league/weekly/challenges/${challengeId}/complete`, { publicationId });
}

export async function getCreatorLeagueSocial(search = ""): Promise<CreatorLeagueSocial> {
  return requestJson(`/api/creator-league/social${search ? `?q=${encodeURIComponent(search)}` : ""}`);
}

export async function sendCreatorFriendRequest(userId: string): Promise<CreatorLeagueSocial> {
  return requestJson("/api/creator-league/social/friend-requests", { userId });
}

export async function respondToCreatorFriendRequest(requestId: string, accept: boolean): Promise<CreatorLeagueSocial> {
  return requestJson(`/api/creator-league/social/friend-requests/${encodeURIComponent(requestId)}`, { accept });
}

export async function interactWithCreatorLeagueVideo(
  publicationId: string,
  interaction: { type: "watch"; currentTime: number } | { type: "like" | "save" | "share" } | { type: "comment"; text: string },
): Promise<CreatorLeagueSnapshot & { feed: CreatorLeagueFeedItem[]; duplicate?: boolean }> {
  return requestJson<CreatorLeagueSnapshot & { feed: CreatorLeagueFeedItem[]; duplicate?: boolean }>(
    `/api/creator-league/feed/${encodeURIComponent(publicationId)}/interaction`,
    interaction,
  );
}

export async function submitCreatorLeagueActivity(
  type: "challenge" | "project" | "community" | "collaboration",
  sourceId: string,
): Promise<void> {
  await requestJson("/api/creator-league/activities", { type, sourceId });
}

export async function readCreatorLeagueVideoDuration(file: File): Promise<number> {
  const video = document.createElement("video");
  const url = URL.createObjectURL(file);
  try {
    return await new Promise<number>((resolve, reject) => {
      const timeout = window.setTimeout(() => reject(new Error("Videon keston lukeminen aikakatkaistiin.")), 15_000);
      video.preload = "metadata";
      video.onloadedmetadata = () => {
        window.clearTimeout(timeout);
        if (!Number.isFinite(video.duration) || video.duration <= 0 || video.duration > 3600) {
          reject(new Error("Creator League hyväksyy videot, joiden kesto on enintään tunti."));
          return;
        }
        resolve(video.duration);
      };
      video.onerror = () => {
        window.clearTimeout(timeout);
        reject(new Error("Videon kestoa ei voitu lukea tässä selaimessa."));
      };
      video.src = url;
    });
  } finally {
    video.removeAttribute("src");
    URL.revokeObjectURL(url);
  }
}

export async function submitCreatorLeagueVideo(publicationId: string, title: string, file: File, gameId?: string): Promise<void> {
  const durationSeconds = await readCreatorLeagueVideoDuration(file);
  const response = await fetch(`/api/creator-league/publications/${encodeURIComponent(publicationId)}`, {
    method: "POST",
    credentials: "same-origin",
    cache: "no-store",
    headers: {
      "content-type": file.type,
      "x-creator-title": encodeURIComponent(title),
      "x-creator-duration": String(durationSeconds),
      ...(gameId ? { "x-creator-game": encodeURIComponent(gameId) } : {}),
    },
    body: file,
  });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message = payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string"
      ? payload.error
      : "Creator League -videota ei voitu lähettää.";
    throw new Error(message);
  }
}
