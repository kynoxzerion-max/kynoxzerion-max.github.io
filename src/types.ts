export type SectionId =
  | "home"
  | "discover"
  | "creator"
  | "clip-forge"
  | "clippo-online"
  | "gaming"
  | "communities"
  | "friends"
  | "projects"
  | "events"
  | "challenges"
  | "messages"
  | "progression"
  | "profile"
  | "settings";

export type ProgressionTrack = "creator" | "gaming" | "social";
export type XpCategory = "activity" | ProgressionTrack;
export interface PrestigeRun {
  round: number;
  level: number;
  xp: number;
  completedAt: string;
}
export interface PrestigeTrack {
  count: number;
  runs: PrestigeRun[];
}
export interface XpDayTotals {
  activitySeconds: number;
  gameSeconds: number;
  activity: number;
  gaming: number;
  creator: number;
  social: number;
  messages: number;
  messageXP: number;
  stories: number;
  videos: number;
}
export interface XpSystemState {
  total: number;
  totals: Record<XpCategory, number>;
  days: Record<string, XpDayTotals>;
  seenEvents: Record<string, string>;
}
export type NexusTheme = "midnight" | "aurora" | "void";
export interface ThemeColors {
  background: string;
  surface: string;
  raisedSurface: string;
  text: string;
  mutedText: string;
  accent: string;
  strongAccent: string;
  softAccent: string;
  sidebar: string;
  topbar: string;
  border: string;
  auroraOne: string;
  auroraTwo: string;
  auroraThree: string;
}

export interface GameEntry {
  id: string;
  name: string;
  status: "playing" | "backlog" | "completed";
  progress: number;
  sessions: number;
}

export interface ProjectTask {
  id: string;
  title: string;
  status: "todo" | "inProgress" | "done";
}

export interface ProjectEntry {
  id: string;
  name: string;
  detail: string;
  tasks: ProjectTask[];
}

export interface CreatorDraft {
  id: string;
  title: string;
  type: "Clip" | "Video" | "Post";
  body: string;
  updatedAt: string;
  gameId?: string;
}

export interface CreatorPublishedPost {
  id: string;
  title: string;
  body: string;
  mediaName: string;
  createdAt: string;
  gameId?: string;
}

export interface XpHistoryEntry {
  id: string;
  track: XpCategory;
  amount: number;
  label: string;
  at: string;
  source: "message" | "story" | "video-story" | "creator-publish" | "community" | "activity" | "gaming" | "creator-battle" | "action";
}

export interface ConversationMessage {
  id: string;
  text: string;
  sentAt: string;
  direction: "incoming" | "outgoing";
  reactions?: string[];
}

export interface CommunityChatMessage {
  id: string;
  author: string;
  text: string;
  sentAt: string;
  own: boolean;
  system?: boolean;
}

export interface CommunityMember {
  id: string;
  name: string;
  role: "owner" | "admin" | "member";
  mutedUntil?: string;
}

export interface ConversationEntry {
  id: string;
  name: string;
  avatar: string;
  color: "violet" | "cyan" | "pink";
  messages: ConversationMessage[];
  online?: boolean;
  peerUserId?: string;
  isGroup?: boolean;
  members?: string[];
  createdBy?: string;
  admins?: string[];
}
export interface FriendEntry {
  id: string;
  name: string;
  username: string;
  friendCode?: string;
  profileVisibility?: Preferences["profileVisibility"];
  profileBanner?: string;
  profileFrame?: string;
  leagueRank?: string;
  prestigeAvatar?: string;
  prestigeAvatars?: string[];
  level?: number;
  trackLevels?: Partial<Record<ProgressionTrack, number>>;
  trackXp?: Partial<Record<ProgressionTrack, number>>;
  achievements?: string[];
  selectedTitles?: string[];
  selectedBadges?: string[];
  selectedTrophies?: string[];
  title?: string;
  badges?: string[];
  trophies?: string[];
  titles?: string[];
  bio: string;
  interests: string[];
  avatar: string;
  status: "online" | "away" | "offline";
}

export type EventRepeat = "none" | "weekly";
export type EventRsvp = "going" | "maybe" | "no";

export interface NexusEvent {
  id: string;
  name: string;
  detail: string;
  startsAt: string;
  category: string;
  attendees: number;
  location?: string;
  durationMin?: number;
  repeat?: EventRepeat;
  reminderMin?: number;
  rsvp?: EventRsvp;
  notes?: string;
}

export interface NexusState {
  profile: {
    name: string;
    username: string;
    friendCode?: string;
    title: string;
    bio: string;
    interests: string[];
    avatar: string;
    bannerImage?: string;
    selectedTitles?: string[];
    selectedBadges?: string[];
    selectedTrophies?: string[];
    leagueBronzeFrame?: "bronze-4" | "bronze-3" | "bronze-2" | "bronze-1" | "silver-4" | "silver-3" | "silver-2" | "silver-1" | "gold-4" | "gold-3" | "gold-2" | "gold-1" | "platinum-4" | "platinum-3" | "platinum-2" | "platinum-1" | "diamond-4" | "diamond-3" | "diamond-2" | "diamond-1" | "master-4" | "master-3" | "master-2" | "master-1" | "grandmaster-4" | "grandmaster-3" | "grandmaster-2" | "grandmaster-1" | "legend-4" | "legend-3" | "legend-2" | "legend-1";
  };
  levels: Record<ProgressionTrack, number>;
  xp: Record<ProgressionTrack, number>;
  xpSystem: XpSystemState;
  xpHistory: XpHistoryEntry[];
  developerUnlockedAchievements?: boolean;
  developerUnlockedLeagueFrames?: boolean;
  developerUnlockedRankRewards?: boolean;
  prestigeAvatar?: string;
  developerUnlockedPrestige?: boolean;
  prestige?: Partial<Record<ProgressionTrack, PrestigeTrack>>;
  quests: { id: string; label: string; done: boolean; track: ProgressionTrack }[];
  activities: { id: string; label: string; time: string }[];
  conversations: ConversationEntry[];
  friends?: FriendEntry[];
  games: GameEntry[];
  projects: ProjectEntry[];
  creatorDrafts: CreatorDraft[];
  creatorPosts: CreatorPublishedPost[];
  communities: { id: string; name: string; category: string; members: number; owned?: boolean }[];
  joinedCommunities: string[];
  communityChats?: Record<string, CommunityChatMessage[]>;
  communityRoster?: Record<string, CommunityMember[]>;
  events: NexusEvent[];
  joinedEvents: string[];
  completedChallenges: string[];
  streakDays: number;
  lastActiveDate: string;
  theme: NexusTheme;
  themeColors?: ThemeColors;
  notificationsEnabled: boolean;
  compactMode: boolean;
  preferences?: Partial<Preferences>;
}

export interface Preferences {
  language: "fi" | "en";
  background: "plain" | "glow" | "grid" | "ocean" | "ember" | "neon" | "sunset" | "forest";
  font: "default" | "serif" | "mono";
  textSize: "small" | "medium" | "large";
  profileVisibility: "everyone" | "friends" | "private";
  messagePrivacy: "everyone" | "friends" | "nobody";
}
