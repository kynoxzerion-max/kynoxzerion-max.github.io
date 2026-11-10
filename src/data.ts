import type { NexusEvent, NexusState, ProgressionTrack, SectionId, ThemeColors } from "./types";

export const defaultThemeColors: ThemeColors = {
  background: "#090711",
  surface: "#12101c",
  raisedSurface: "#1d172a",
  text: "#f5f0ff",
  mutedText: "#aa9dbb",
  accent: "#e19aff",
  strongAccent: "#b832ed",
  softAccent: "#321746",
  sidebar: "#0d0a15",
  topbar: "#0b0913",
  border: "#49305e",
  auroraOne: "#e64dff",
  auroraTwo: "#765cff",
  auroraThree: "#ff55ae",
};

function upcomingEvent(id: string, name: string, detail: string, daysAhead: number, hour: number, minute: number, category: string, attendees: number): NexusEvent {
  const startsAt = new Date();
  startsAt.setDate(startsAt.getDate() + daysAhead);
  startsAt.setHours(hour, minute, 0, 0);
  return { id, name, detail, startsAt: startsAt.toISOString(), category, attendees };
}

export const initialState: NexusState = {
  profile: {
    name: "Janne",
    username: "jannebuilds",
    friendCode: "NEX-7K4P2",
    title: "Community Builder",
    bio: "Rakennan pelejä, projekteja ja hyviä yhteisöjä.",
    interests: ["Game dev", "Rust", "Video editing", "Design"],
    avatar: "J",
  },
  levels: { creator: 0, gaming: 0, social: 0 },
  xp: { creator: 0, gaming: 0, social: 0 },
  xpSystem: {
    total: 0,
    totals: { activity: 0, gaming: 0, creator: 0, social: 0 },
    days: {},
    seenEvents: {},
  },
  xpHistory: [],
  quests: [
    { id: "challenge", label: "Suorita yksi haaste", done: false, track: "gaming" },
    { id: "project", label: "Edistä projektin tehtävää", done: false, track: "social" },
    { id: "game", label: "Pelaa yksi peli", done: false, track: "gaming" },
  ],
  activities: [
    { id: "a1", label: "Liityit Rust Finland -yhteisöön", time: "2 tuntia sitten" },
    { id: "a2", label: "Saavutit Creator Level 80", time: "Eilen" },
    { id: "a3", label: "Julkaisit ensimmäisen projektisi", time: "3 päivää sitten" },
  ],
  conversations: [
    {
      id: "conversation-alex",
      name: "Alex Morgan",
      avatar: "A",
      color: "violet",
      messages: [{ id: "message-alex-1", text: "Nähdään tournamentissa! 🎮", sentAt: new Date(Date.now() - 12 * 60_000).toISOString(), direction: "incoming" }],
    },
    {
      id: "conversation-mika",
      name: "Mika Studio",
      avatar: "M",
      color: "cyan",
      messages: [{ id: "message-mika-1", text: "Lähetin projektin päivityksen", sentAt: new Date(Date.now() - 60 * 60_000).toISOString(), direction: "incoming" }],
    },
    {
      id: "conversation-samu",
      name: "Samu K.",
      avatar: "S",
      color: "pink",
      messages: [{ id: "message-samu-1", text: "Kiitos avusta eilen!", sentAt: new Date(Date.now() - 3 * 60 * 60_000).toISOString(), direction: "incoming" }],
    },
  ],
  friends: [
    { id: "friend-alex", name: "Alex Morgan", username: "alexmorgan", friendCode: "NEX-ALEX7", profileVisibility: "everyone", title: "Clutch-osaaja", titles: ["Clutch-osaaja", "Turnauskaveri"], badges: ["Aim Master", "Night Owl"], trophies: ["Winter Cup 2026"], bio: "FPS-pelaaja ja turnauskaveri.", interests: ["Valorant", "Clips"], avatar: "A", status: "online" },
    { id: "friend-mika", name: "Mika Studio", username: "mikastudio", friendCode: "NEX-MIKA8", profileVisibility: "everyone", title: "Työkalujen rakentaja", titles: ["Työkalujen rakentaja"], badges: ["First Build", "Design Eye"], trophies: ["Creator Showcase"], bio: "Rakennan pelejä ja työkaluja.", interests: ["Game dev", "Design"], avatar: "M", status: "away" },
  ],
  games: [
    { id: "game-rust", name: "Rust", status: "playing", progress: 68, sessions: 12 },
    { id: "game-minecraft", name: "Minecraft", status: "backlog", progress: 42, sessions: 6 },
    { id: "game-valorant", name: "Valorant", status: "backlog", progress: 24, sessions: 3 },
  ],
  projects: [
    {
      id: "project-northern-lights",
      name: "Northern Lights",
      detail: "Indie game · 6 jäsentä",
      tasks: [
        { id: "task-movement", title: "Add movement", status: "todo" },
        { id: "task-map", title: "Create map", status: "todo" },
        { id: "task-character", title: "Character system", status: "inProgress" },
        { id: "task-menu", title: "Main menu", status: "done" },
      ],
    },
    {
      id: "project-creator-toolkit",
      name: "Creator Toolkit",
      detail: "Web app · 3 jäsentä",
      tasks: [
        { id: "task-design-system", title: "Design system", status: "done" },
        { id: "task-editor", title: "Build editor", status: "inProgress" },
        { id: "task-export", title: "Export flow", status: "todo" },
      ],
    },
  ],
  creatorDrafts: [
    { id: "draft-devlog", title: "My first devlog", type: "Video", body: "", updatedAt: "Muokattu äskettäin" },
    { id: "draft-summer", title: "Summer montage", type: "Clip", body: "", updatedAt: "Muokattu eilen" },
  ],
  creatorPosts: [],
  communities: [
    { id: "community-rust", name: "Rust Finland", category: "Gaming", members: 2400 },
    { id: "community-indie", name: "Indie Dev Hub", category: "Projects", members: 840 },
    { id: "community-creator", name: "Creator Lounge", category: "Creator", members: 1800 },
  ],
  joinedCommunities: ["community-rust"],
  events: [
    upcomingEvent("event-rust", "Rust Tournament", "Rust Finland", 0, 20, 0, "Gaming", 16),
    upcomingEvent("event-meetup", "Indie Dev Meetup", "Creator Lounge", 1, 18, 30, "Creator", 28),
    upcomingEvent("event-clip", "Clip of the Week", "Creator League", 4, 14, 0, "Creator", 42),
  ],
  joinedEvents: [],
  completedChallenges: [],
  streakDays: 0,
  lastActiveDate: "",
  theme: "midnight",
  themeColors: defaultThemeColors,
  notificationsEnabled: true,
  compactMode: false,
};

export const navigation: { label: string; items: { id: SectionId; label: string; icon: string }[] }[] = [
  {
    label: "YOUR SPACE",
    items: [
      { id: "home", label: "Home", icon: "⌂" },
      { id: "discover", label: "Discover", icon: "⌕" },
      { id: "events", label: "Events & Calendar", icon: "▦" },
    ],
  },
  {
    label: "CREATE & PLAY",
    items: [
      { id: "creator", label: "Clippo", icon: "✳" },
      { id: "clip-forge", label: "Clip Forge", icon: "▣" },
      { id: "gaming", label: "Gaming", icon: "◈" },
      { id: "projects", label: "Projects", icon: "▧" },
      { id: "challenges", label: "XP", icon: "⚑" },
    ],
  },
  {
    label: "YOUR PEOPLE",
    items: [
      { id: "friends", label: "Kaverit", icon: "♢" },
      { id: "communities", label: "Communities", icon: "◎" },
      { id: "messages", label: "Messages", icon: "▤" },
    ],
  },
];

export const trackNames: Record<ProgressionTrack, string> = {
  creator: "Creator",
  gaming: "Gaming",
  social: "Social",
};
