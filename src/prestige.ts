import type { NexusState, ProgressionTrack } from "./types";

export const PRESTIGE_TRACK_LEVEL = 160;
export const PRESTIGE_XP_PER_LEVEL = 500;
export const PRESTIGE_TRACK_XP = (PRESTIGE_TRACK_LEVEL - 1) * PRESTIGE_XP_PER_LEVEL;
export const PRESTIGE_MAX_ROUNDS = 10;

export const PRESTIGE_TRACKS: ProgressionTrack[] = ["creator", "gaming", "social"];

const rarities = [
  { id: "Rare", icon: "✦" },
  { id: "Epic", icon: "❖" },
  { id: "Legendary", icon: "✺" },
  { id: "Mythic", icon: "♛" },
  { id: "Ascendant", icon: "☄" },
  { id: "Celestial", icon: "✧" },
  { id: "Eternal", icon: "∞" },
  { id: "Transcendent", icon: "❂" },
  { id: "Divine", icon: "☀" },
  { id: "Master", icon: "♚" },
  { id: "Sovereign", icon: "◈" },
  { id: "Paragon", icon: "✪" },
  { id: "Astral", icon: "✵" },
  { id: "Infinite", icon: "∞" },
  { id: "Omega", icon: "Ω" },
  { id: "Apex", icon: "▲" },
  { id: "Eclipse", icon: "◑" },
  { id: "Nova", icon: "✹" },
  { id: "Omniscient", icon: "◉" },
  { id: "Aetherbound", icon: "✧" },
] as const;

const titles: Record<ProgressionTrack, string[]> = {
  creator: ["Reforged Creator", "Prismatic Creator", "Golden Auteur", "Mythic Maker", "Ascended Creator", "Celestial Creator", "Eternal Visionary", "Transcendent Maker", "Divine Creator", "Creator Prestige Master", "Sovereign Creator", "Paragon Auteur", "Astral Maker", "Infinite Visionary", "Omega Creator", "Apex Architect", "Eclipse Innovator", "Nova Maker", "Omniscient Creator", "Aetherbound Creator"],
  gaming: ["Reforged Player", "Prismatic Player", "Golden Champion", "Mythic Gamer", "Ascended Player", "Celestial Player", "Eternal Gamer", "Transcendent Player", "Divine Champion", "Gaming Prestige Master", "Sovereign Player", "Paragon Champion", "Astral Gamer", "Infinite Player", "Omega Champion", "Apex Gamer", "Eclipse Tactician", "Nova Player", "Omniscient Gamer", "Aetherbound Champion"],
  social: ["Reforged Connector", "Prismatic Connector", "Golden Host", "Mythic Community Soul", "Ascended Connector", "Celestial Connector", "Eternal Host", "Transcendent Soul", "Divine Connector", "Social Prestige Master", "Sovereign Connector", "Paragon Host", "Astral Community Soul", "Infinite Connector", "Omega Host", "Apex Community Builder", "Eclipse Connector", "Nova Host", "Omniscient Connector", "Aetherbound Social Master"],
};

const romans = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX"];

export interface PrestigeReward {
  id: string;
  track: ProgressionTrack;
  round: number;
  rarity: string;
  icon: string;
  title: string;
  badge: string;
}

export function getPrestigeReward(track: ProgressionTrack, round: number): PrestigeReward {
  const tier = rarities[round - 1];
  const trackLabel = track.charAt(0).toUpperCase() + track.slice(1);
  return {
    id: `prestige-${track}-${round}`,
    track,
    round,
    rarity: tier.id,
    icon: tier.icon,
    title: titles[track][round - 1],
    badge: round === PRESTIGE_MAX_ROUNDS ? `${trackLabel} Prestige Master` : `${trackLabel} Prestige ${romans[round - 1]}`,
  };
}

export function getPrestigeCount(state: NexusState, track: ProgressionTrack): number {
  return state.prestige?.[track]?.count ?? 0;
}

export function getEarnedPrestigeRewards(state: NexusState): PrestigeReward[] {
  return PRESTIGE_TRACKS.flatMap((track) =>
    Array.from({ length: state.developerUnlockedPrestige ? PRESTIGE_MAX_ROUNDS : Math.min(PRESTIGE_MAX_ROUNDS, getPrestigeCount(state, track)) }, (_, index) => getPrestigeReward(track, index + 1)));
}

export function getPrestigeBankedXp(state: NexusState): number {
  return PRESTIGE_TRACKS.reduce((total, track) => total + getPrestigeCount(state, track) * PRESTIGE_TRACK_XP, 0);
}

export interface PrestigeAvatar {
  id: string;
  track: ProgressionTrack;
  trackLabel: string;
  round: number;
  label: string;
  src: string;
  unlocked: boolean;
}

const avatarImages = import.meta.glob("./assets/prestige/*.png", { eager: true, query: "?url", import: "default" }) as Record<string, string>;

// Avatars are listed automatically for every track/round that has an image in assets/prestige.
export const PRESTIGE_AVATARS = PRESTIGE_TRACKS.flatMap((track) =>
  Array.from({ length: PRESTIGE_MAX_ROUNDS }, (_, index) => {
    const round = index + 1;
    const src = avatarImages[`./assets/prestige/${track}-${round}.png`];
    const trackLabel = track.charAt(0).toUpperCase() + track.slice(1);
    return src ? [{
      id: `${track}-${round}`,
      track,
      trackLabel,
      round,
      label: round === PRESTIGE_MAX_ROUNDS ? `${trackLabel} Prestige Master` : `${trackLabel} Prestige ${round}`,
      src,
    }] : [];
  }).flat());
export function getPrestigeAvatars(state: NexusState): PrestigeAvatar[] {
  return PRESTIGE_AVATARS.map((avatar) => ({ ...avatar, unlocked: state.developerUnlockedPrestige === true || getPrestigeCount(state, avatar.track) >= avatar.round }));
}

export function findPrestigeAvatar(state: NexusState, id?: string): PrestigeAvatar | undefined {
  return id ? getPrestigeAvatars(state).find((avatar) => avatar.id === id && avatar.unlocked) : undefined;
}

export function canPrestige(state: NexusState, track: ProgressionTrack): boolean {
  return state.levels[track] >= PRESTIGE_TRACK_LEVEL && getPrestigeCount(state, track) < PRESTIGE_MAX_ROUNDS;
}

export function startPrestige(state: NexusState, track: ProgressionTrack): NexusState {
  if (!canPrestige(state, track)) return state;
  const current = state.prestige?.[track] ?? { count: 0, runs: [] };
  const round = current.count + 1;
  const totals = { ...state.xpSystem.totals, [track]: 0 };
  return {
    ...state,
    prestige: {
      ...state.prestige,
      [track]: {
        count: round,
        runs: [...current.runs, { round, level: state.levels[track], xp: state.xpSystem.totals[track], completedAt: new Date().toISOString() }],
      },
    },
    xpSystem: {
      ...state.xpSystem,
      total: Object.values(totals).reduce((sum, amount) => sum + amount, 0),
      totals,
    },
    levels: { ...state.levels, [track]: 0 },
    xp: { ...state.xp, [track]: 0 },
  };
}
