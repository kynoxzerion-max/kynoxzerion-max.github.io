import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, CSSProperties, Dispatch, FormEvent, ReactNode, SetStateAction } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Bell,
  Bookmark,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  Circle,
  Clapperboard,
  Clock3,
  Compass,
  Dna,
  Flame,
  FolderKanban,
  Gamepad2,
  Heart,
  Home,
  ImagePlus,
  Menu,
  MoreHorizontal,
  MessageSquare,
  Palette,
  Phone,
  PhoneOff,
  Plus,
  Search,
  Settings2,
  Sparkles,
  Trash2,
  Trophy,
  UsersRound,
  Video,
  X,
  Zap,
} from "lucide-react";
import { defaultThemeColors, initialState, navigation, trackNames } from "./data";
import { AvatarFace } from "./AvatarFace";
import { PRESTIGE_AVATARS, PRESTIGE_MAX_ROUNDS, PRESTIGE_TRACKS, canPrestige, getPrestigeAvatars, getEarnedPrestigeRewards, getPrestigeCount, getPrestigeReward, startPrestige } from "./prestige";
import { applyLanguage, getLocale, setLocale } from "./i18n";
import { EventsPage } from "./EventsPage";
import { getCreatorVideo, saveCreatorVideo } from "./services/creatorVideos";
import { changeDeveloperCredentials, getDeveloperSession, loginDeveloper, logoutDeveloper, resetDeveloper, setupDeveloper } from "./services/developerConsole";
import type { DeveloperSession } from "./services/developerConsole";
import {
  authenticateCreatorLeague,
  deleteCreatorLeagueMessage,
  editCreatorLeagueMessage,
  getCreatorAccountState,
  getCreatorLeagueAccount,
  getCreatorLeagueFeed,
  getCreatorLeagueMessages,
  getCreatorLeaguePublicFeed,
  getCreatorLeagueSnapshot,
  getCreatorLeagueWeekly,
  getCreatorLeagueSocial,
  getRisingCreators,
  completeCreatorChallenge,
  interactWithCreatorLeagueVideo,
  logoutCreatorLeague,
  readCreatorLeagueVideoDuration,
  respondToCreatorFriendRequest,
  sendCreatorFriendRequest,
  submitBattleVideo,
  submitCreatorLeagueActivity,
  submitCreatorLeagueVideo,
  sendCreatorLeagueMessage,
  saveCreatorAccountState,
  startCreatorLeagueConversation,
  toggleCreatorLeagueMessageReaction,
  voteForBattleVideo,
} from "./services/creatorLeague";
import type { CreatorLeagueAccount, CreatorLeagueFeedItem, CreatorLeagueMessageFriend, CreatorLeagueMessages, CreatorLeagueSnapshot, CreatorLeagueSocial, CreatorLeagueWeekly } from "./services/creatorLeague";
import { deleteLocalStory, getLocalStories, saveLocalStory } from "./services/stories";
import { CallSession } from "./services/calls";
import type { CallMode, CallStatus } from "./services/calls";
import type { LocalStory } from "./services/stories";
import type { CommunityMember, ConversationEntry, CreatorDraft, CreatorPublishedPost, FriendEntry, NexusEvent, NexusState, NexusTheme, Preferences, ProgressionTrack, ProjectEntry, ProjectTask, SectionId, ThemeColors, XpCategory, XpDayTotals, XpSystemState } from "./types";

const STORAGE_KEY = "nexus.local.v3";
const PREVIOUS_STORAGE_KEY = "nexus.local.v2";
const LEGACY_STORAGE_KEY = "nexus.local.v1";
const ONE_AETHER_XP_STORAGE_KEY = "one-xp-v1";
const PROGRESSION_RESET_KEY = "nexus.progression.zero-based-v2";
const XP_PER_LEVEL = 500;
const PROFILE_BANNER_MAX_BYTES = 450 * 1024;
const PROFILE_BANNER_MAX_DATA_URL_LENGTH = 650_000;
const MAX_TOTAL_LEVEL = 480;
const MAX_CATEGORY_LEVEL = 160;
const MAX_TOTAL_XP = MAX_TOTAL_LEVEL * XP_PER_LEVEL;
const MAX_CATEGORY_XP = MAX_CATEGORY_LEVEL * XP_PER_LEVEL;
const ACTIVITY_DAILY_CAP = 250;
const leagueProfileFrames = [
  ["bronze-4", "Pronssi 4"],
  ["bronze-3", "Pronssi 3"],
  ["bronze-2", "Pronssi 2"],
  ["bronze-1", "Pronssi 1"],
  ["silver-4", "Hopea 4"],
  ["silver-3", "Hopea 3"],
  ["silver-2", "Hopea 2"],
  ["silver-1", "Hopea 1"],
  ["gold-4", "Kulta 4"],
  ["gold-3", "Kulta 3"],
  ["gold-2", "Kulta 2"],
  ["gold-1", "Kulta 1"],
  ["platinum-4", "Platina 4"],
  ["platinum-3", "Platina 3"],
  ["platinum-2", "Platina 2"],
  ["platinum-1", "Platina 1"],
  ["diamond-4", "Timantti 4"],
  ["diamond-3", "Timantti 3"],
  ["diamond-2", "Timantti 2"],
  ["diamond-1", "Timantti 1"],
  ["master-4", "Master 4"],
  ["master-3", "Master 3"],
  ["master-2", "Master 2"],
  ["master-1", "Master 1"],
  ["grandmaster-4", "Grandmaster 4"],
  ["grandmaster-3", "Grandmaster 3"],
  ["grandmaster-2", "Grandmaster 2"],
  ["grandmaster-1", "Grandmaster 1"],
  ["legend-4", "Legend 4"],
  ["legend-3", "Legend 3"],
  ["legend-2", "Legend 2"],
  ["legend-1", "Legend 1"],
] as const;
const leagueFrameUnlockPoints = (rankIndex: number) => Math.round((200 + rankIndex * (10_000 - 200) / (leagueProfileFrames.length - 1)) / 100) * 100;

function wreathBranchPath(angles: number[], side: "left" | "right", radius: number) {
  const sideAngles = angles.filter((angle) => side === "left" ? angle < 0 : angle > 0);
  if (sideAngles.length === 0) return "";

  const startAngle = (side === "left" ? Math.max(...sideAngles) : Math.min(...sideAngles)) * Math.PI / 180;
  const endAngle = (side === "left" ? Math.min(...sideAngles) : Math.max(...sideAngles)) * Math.PI / 180;
  const direction = Math.sign(endAngle - startAngle);
  const handle = 4 / 3 * Math.tan(Math.abs(endAngle - startAngle) / 4) * radius;
  const point = (angle: number) => [60 + radius * Math.sin(angle), 60 - radius * Math.cos(angle)] as const;
  const tangent = (angle: number) => [direction * Math.cos(angle), direction * Math.sin(angle)] as const;
  const [startX, startY] = point(startAngle);
  const [endX, endY] = point(endAngle);
  const [startTangentX, startTangentY] = tangent(startAngle);
  const [endTangentX, endTangentY] = tangent(endAngle);
  const format = (value: number) => value.toFixed(2);

  return `M${format(startX)} ${format(startY)} C${format(startX + startTangentX * handle)} ${format(startY + startTangentY * handle)} ${format(endX - endTangentX * handle)} ${format(endY - endTangentY * handle)} ${format(endX)} ${format(endY)}`;
}

function LeagueFrameArt({ frameId }: { frameId: string }) {
  const division = Number(frameId.slice(-1));
  if (frameId.startsWith("legend-")) {
    const leafAngles = division === 3
      ? [-160, -135, -110, 110, 135, 160]
      : division === 2
        ? [-169, -151, -133, -115, 115, 133, 151, 169]
        : division === 1
          ? [-172, -157, -142, -127, -112, 112, 127, 142, 157, 172]
          : [];
    const crystalAngles = division === 1
      ? [-90, -70, -50, -30, -10, 10, 30, 50, 70, 90]
      : division === 2
        ? [-90, -55, -20, 20, 55, 90]
        : division === 3
          ? [-90, -45, 0, 45, 90]
          : [0];
    const sparkleAngles = Array.from({ length: division === 1 ? 16 : 12 }, (_, index) => index * (360 / (division === 1 ? 16 : 12)));
    return <svg className={`profile-border-art legend-rank-art border-art-${frameId}`} viewBox="0 0 120 120" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={`legend-violet-${frameId}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f4d9ff" />
          <stop offset=".3" stopColor="#bd84ff" />
          <stop offset=".62" stopColor="#7130b5" />
          <stop offset=".84" stopColor="#e8c2ff" />
          <stop offset="1" stopColor="#3d176c" />
        </linearGradient>
        <linearGradient id={`legend-gold-${frameId}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff4b6" />
          <stop offset=".5" stopColor="#f0c64f" />
          <stop offset="1" stopColor="#a96b17" />
        </linearGradient>
        <radialGradient id={`legend-gem-${frameId}`} cx=".35" cy=".3" r=".8">
          <stop offset="0" stopColor="#fff" />
          <stop offset=".35" stopColor="#f0caff" />
          <stop offset=".7" stopColor="#a344f1" />
          <stop offset="1" stopColor="#481476" />
        </radialGradient>
        <filter id={`legend-glow-${frameId}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
      </defs>
      <circle className="legend-frame-aura" cx="60" cy="60" r={division === 1 ? 54 : 49} />
      <circle className="legend-frame-orbit-track" cx="60" cy="60" r="54" />
      <circle className="legend-frame-shadow" cx="60" cy="60" r="44" />
      <circle className="legend-frame-ring" cx="60" cy="60" r="41" stroke={`url(#legend-violet-${frameId})`} />
      <circle className="legend-frame-sweep" cx="60" cy="60" r="41" />
      <circle className="legend-frame-goldline" cx="60" cy="60" r="35.5" stroke={`url(#legend-gold-${frameId})`} />
      <circle className="legend-frame-inner" cx="60" cy="60" r="33.5" />
      <circle className="legend-frame-dash" cx="60" cy="60" r="51" />
      <g className="legend-frame-orbit">
        {sparkleAngles.map((angle, index) => <g key={angle} transform={`rotate(${angle} 60 60) translate(60 49)`} style={{ "--sparkle-delay": `${index * -0.17}s` } as CSSProperties}>
          <path className="legend-frame-sparkle" d="M0-3.2 1-1 3.2 0 1 1 0 3.2-1 1-3.2 0-1-1Z" />
        </g>)}
      </g>
      <g className="legend-frame-comets">
        {[18, 138, 258].map((angle, index) => <g key={angle} transform={`rotate(${angle} 60 60) translate(60 54)`} style={{ "--comet-delay": `${index * -1.2}s` } as CSSProperties}>
          <circle className="legend-frame-comet-tail" cx="0" cy="0" r="3.5" />
          <circle className="legend-frame-comet-core" cx="0" cy="0" r="1.2" />
        </g>)}
      </g>
      <g className="legend-frame-crystals">
        {crystalAngles.map((angle, index) => {
          const radians = angle * Math.PI / 180;
          const x = 60 + Math.sin(radians) * 55;
          const y = 60 - Math.cos(radians) * 55;
          return <g key={angle} transform={`translate(${x} ${y}) rotate(${angle})`} style={{ "--crystal-delay": `${index * -0.37}s`, "--crystal-duration": `${2.1 + (index % 3) * 0.45}s` } as CSSProperties}>
            <g className="legend-frame-crystal-float">
              <path className="legend-frame-crystal" d="M0-13 6-4 5 5 0 13-5 5-6-4Z" fill={`url(#legend-gem-${frameId})`} />
              <path className="legend-frame-crystal-facet" d="M0-13 0 13M-6-4H6M-5 5H5M-6-4 0 0 6-4M-5 5 0 0 5 5" />
            </g>
          </g>;
        })}
      </g>
      {leafAngles.length > 0 && <g className="legend-frame-wreath" fill={`url(#legend-gold-${frameId})`}>
        <path className="legend-wreath-stem" d={wreathBranchPath(leafAngles, "left", 46)} />
        <path className="legend-wreath-stem" d={wreathBranchPath(leafAngles, "right", 46)} />
        {leafAngles.map((angle) => <g key={angle} transform={`rotate(${angle} 60 60)`}>
          <g transform={`rotate(${angle < 0 ? -angle - 54 : -angle + 86} 60 14)`}>
            <path d="M60 14 C57 10 54 5 56 0 C60 3 63 9 60 14Z" />
            <path className="legend-leaf-vein" d="M60 13 56 1" />
          </g>
        </g>)}
      </g>}
      {division <= 2 && <g className="legend-frame-gem" transform={`translate(60 ${division === 2 ? 13 : 9})`}>
        <path d="M0-8 7 0 0 9-7 0Z" fill={`url(#legend-gem-${frameId})`} />
        <path d="M-7 0H7M0-8 0 9" />
      </g>}
      {division === 1 && <g className="legend-frame-crown" transform="translate(60 13)">
        <path d="M-24 0-28-13-17-7-10-20-4-8 0-26 4-8 10-20 17-7 28-13 24 0Z" fill={`url(#legend-gold-${frameId})`} />
        <rect x="-24" y="-4" width="48" height="5" rx="1" fill={`url(#legend-violet-${frameId})`} />
        <circle cx="-28" cy="-13" r="2.7" /><circle cx="-10" cy="-20" r="2.7" /><circle cy="-26" r="3.2" /><circle cx="10" cy="-20" r="2.7" /><circle cx="28" cy="-13" r="2.7" />
      </g>}
    </svg>;
  }
  if (frameId.startsWith("grandmaster-")) {
    const grandmasterLeafCount = division === 1 ? 20 : division === 2 ? 16 : division === 3 ? 12 : 8;
    return <svg className={`profile-border-art grandmaster-rank-art border-art-${frameId}`} viewBox="0 0 120 120" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={`gm-ring-${frameId}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffe3de" />
          <stop offset=".28" stopColor="#ff6b5e" />
          <stop offset=".55" stopColor="#c4122e" />
          <stop offset=".78" stopColor="#ff9a8a" />
          <stop offset="1" stopColor="#5a0415" />
        </linearGradient>
        <linearGradient id={`gm-gold-${frameId}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff4c2" />
          <stop offset=".5" stopColor="#e8c45a" />
          <stop offset="1" stopColor="#b8892a" />
        </linearGradient>
        <radialGradient id={`gm-gem-${frameId}`} cx=".4" cy=".35" r=".8">
          <stop offset="0" stopColor="#ffe0e0" />
          <stop offset=".5" stopColor="#ff2d4a" />
          <stop offset="1" stopColor="#6b0716" />
        </radialGradient>
        <linearGradient id={`gm-leaf-${frameId}`} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#6b0c20" />
          <stop offset=".48" stopColor="#c52d43" />
          <stop offset=".78" stopColor="#f0b354" />
          <stop offset="1" stopColor="#ffe2a0" />
        </linearGradient>
        <filter id={`gm-glow-${frameId}`} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
      </defs>
      <circle className="gm-frame-aura" cx="60" cy="60" r={division === 1 ? 55 : 48} fill="#ff3b2f" filter={`url(#gm-glow-${frameId})`} />
      <circle className="gm-frame-shadow" cx="60" cy="60" r="46" />
      <circle className="gm-frame-ring" cx="60" cy="60" r="42" stroke={`url(#gm-ring-${frameId})`} />
      <circle className="gm-frame-shine" cx="60" cy="60" r="42" />
      <circle className="gm-frame-goldline" cx="60" cy="60" r="36" stroke={`url(#gm-gold-${frameId})`} />
      <circle className="gm-frame-inner" cx="60" cy="60" r="34" />
      <circle className="gm-frame-dots" cx="60" cy="60" r="48" />
      <g className="gm-frame-wreath" fill={`url(#gm-leaf-${frameId})`}>
        <circle className="gm-wreath-stem" cx="60" cy="60" r="49" />
        {Array.from({ length: grandmasterLeafCount }, (_, index) => {
          const angle = index * (360 / grandmasterLeafCount);
          return <g key={angle} transform={`rotate(${angle} 60 60)`}>
            <path d="M60 11 C56 7 55 2 57-1 C61 3 63 7 60 11Z" />
            <path className="gm-leaf-vein" d="M60 10 57 1" />
          </g>;
        })}
      </g>
      {division <= 2 && <g className="gm-frame-gems">
        <g transform="translate(15 60) scale(.42)"><circle r="13" className="gm-gem-glow" /><circle r="10" className="gm-gem-setting" fill={`url(#gm-gold-${frameId})`} /><path d="M0-8 6-2 0 8-6-2Z" fill={`url(#gm-gem-${frameId})`} /><path d="M-6-2H6M0-8-2-2 0 8M0-8 2-2 0 8" className="gm-gem-facets" /></g>
        <g transform="translate(105 60) scale(.42)"><circle r="13" className="gm-gem-glow" /><circle r="10" className="gm-gem-setting" fill={`url(#gm-gold-${frameId})`} /><path d="M0-8 6-2 0 8-6-2Z" fill={`url(#gm-gem-${frameId})`} /><path d="M-6-2H6M0-8-2-2 0 8M0-8 2-2 0 8" className="gm-gem-facets" /></g>
      </g>}
      {division <= 2 && <g className="gm-frame-crown" transform={`translate(60 ${division === 1 ? 13 : 15}) scale(${division === 1 ? 0.9 : 0.65})`}>
        <path d="M-27 0-30-14-20-8-12-21-6-9 0-28 6-9 12-21 20-8 30-14 27 0Z" fill={`url(#gm-gold-${frameId})`} />
        <rect x="-27" y="-4" width="54" height="5" rx="1" fill={`url(#gm-ring-${frameId})`} />
        <circle cx="-30" cy="-14" r="3" fill={`url(#gm-gem-${frameId})`} /><circle cx="-12" cy="-21" r="3" fill={`url(#gm-gem-${frameId})`} /><circle cy="-28" r="3.5" fill={`url(#gm-gem-${frameId})`} /><circle cx="12" cy="-21" r="3" fill={`url(#gm-gem-${frameId})`} /><circle cx="30" cy="-14" r="3" fill={`url(#gm-gem-${frameId})`} />
      </g>}
      {division === 1 && <g className="gm-frame-stars">
        <path d="m28 24 2 6 6 2-6 2-2 6-2-6-6-2 6-2Z" />
        <path d="m92 24 2 6 6 2-6 2-2 6-2-6-6-2 6-2Z" />
      </g>}
    </svg>;
  }
  const leafAngles = division === 3
    ? [-160, -135, -110, 110, 135, 160]
    : division === 2
      ? [-169, -151, -133, -115, 115, 133, 151, 169]
      : division === 1
        ? [-172, -157, -142, -127, -112, 112, 127, 142, 157, 172]
        : [];
  return <svg className={`profile-border-art border-art-${frameId}`} viewBox="0 0 120 120" aria-hidden="true" focusable="false">
    <g className="rank-frame-wreath">
      {leafAngles.length > 0 && <>
        <path className="rank-wreath-stem" d={wreathBranchPath(leafAngles, "left", 46)} />
        <path className="rank-wreath-stem" d={wreathBranchPath(leafAngles, "right", 46)} />
      </>}
      {leafAngles.map((angle) => <g key={angle} transform={`rotate(${angle} 60 60)`}>
        <g transform={`rotate(${angle < 0 ? -angle - 54 : -angle + 86} 60 14)`}>
          <path d="M60 14 C57 10 54 5 56 0 C60 3 63 9 60 14Z" />
          <path className="rank-leaf-vein" d="M60 13 56 1" />
        </g>
      </g>)}
    </g>
    <circle className="rank-frame-outline" cx="60" cy="60" r="43" />
    <circle className="rank-frame-band" cx="60" cy="60" r="39" />
    <circle className="rank-frame-highlight" cx="60" cy="60" r="34.5" />
    <circle className="rank-frame-inner" cx="60" cy="60" r="33" />
    {division >= 3 && <g className="rank-frame-jewels">
      <path d="m60 13 4 5-4 6-4-6Z" />
      <circle cx="60" cy="18" r="1.5" />
    </g>}
    {division <= 2 && <g className="rank-frame-jewels">
      <path d="m17 56 5 4-5 5-4-5Z" />
      <path d="m103 56 5 4-5 5-4-5Z" />
      <circle cx="17" cy="60" r="1.5" /><circle cx="103" cy="60" r="1.5" />
    </g>}
    {division === 1 && <g className="rank-frame-crown">
      <path d="M45 14 41 5l9 5 10-8 10 8 9-5-4 9Z" />
      <path d="M45 16h30l-2 5H47Z" />
      <circle cx="41" cy="4" r="2" /><circle cx="60" cy="1.8" r="2" /><circle cx="79" cy="4" r="2" />
      <g className="rank-frame-stars">
        <path d="m29 20 1.6 4.4L35 26l-4.4 1.6L29 32l-1.6-4.4L23 26l4.4-1.6Z" />
        <path d="m91 20 1.6 4.4L97 26l-4.4 1.6L91 32l-1.6-4.4L85 26l4.4-1.6Z" />
      </g>
    </g>}
  </svg>;
}

const sectionIds: SectionId[] = ["home", "discover", "creator", "clip-forge", "clippo-online", "gaming", "communities", "friends", "projects", "events", "challenges", "messages", "progression", "profile", "settings"];
const leagueRankEmblems: Record<string, string> = {
  Unranked: "🔰",
  Bronze: "🥉",
  Silver: "🥈",
  Gold: "🥇",
  Platinum: "💠",
  Diamond: "💎",
  Master: "👑",
  Grandmaster: "🔥",
  Challenger: "🏆",
};

const defaultPreferences: Preferences = { language: "fi", background: "glow", font: "default", textSize: "medium", profileVisibility: "everyone", messagePrivacy: "everyone" };
const previousDefaultThemeColors: ThemeColors = {
  background: "#111a14",
  surface: "#1b281e",
  raisedSurface: "#243328",
  text: "#edf1e9",
  mutedText: "#929d8f",
  accent: "#b1d5a0",
  strongAccent: "#739c64",
  softAccent: "#2c412e",
  sidebar: "#141e16",
  topbar: "#111a14",
  border: "#344635",
  auroraOne: "#33e7b1",
  auroraTwo: "#607ceb",
  auroraThree: "#5ee2c2",
};
const themeColorFields: { key: keyof ThemeColors; label: string }[] = [
  { key: "background", label: "Sovelluksen tausta" },
  { key: "surface", label: "Paneelit" },
  { key: "raisedSurface", label: "Korostetut pinnat" },
  { key: "text", label: "Pääteksti" },
  { key: "mutedText", label: "Hillitty teksti" },
  { key: "accent", label: "Korostusväri" },
  { key: "strongAccent", label: "Vahva korostus" },
  { key: "softAccent", label: "Pehmeä korostus" },
  { key: "sidebar", label: "Sivupalkki" },
  { key: "topbar", label: "Yläpalkki" },
  { key: "border", label: "Reunukset" },
  { key: "auroraOne", label: "Revontuliväri 1" },
  { key: "auroraTwo", label: "Revontuliväri 2" },
  { key: "auroraThree", label: "Revontuliväri 3" },
];
const ThemeEditorContext = createContext<{
  colors: ThemeColors;
  onChange: (key: keyof ThemeColors, value: string) => void;
  onReset: () => void;
} | null>(null);

function getThemeColors(state: NexusState): ThemeColors {
  const palette = themePalettes[state.theme];
  return Object.fromEntries(
    Object.entries(palette).map(([key, color]) => {
      const colorKey = key as keyof ThemeColors;
      const savedColor = state.themeColors?.[colorKey];
      return [key, savedColor && savedColor !== defaultThemeColors[colorKey] ? savedColor : color];
    })
  ) as ThemeColors;
}

function sanitizeThemeColors(value: unknown): ThemeColors {
  const colors = value && typeof value === "object" ? value as Partial<ThemeColors> : {};
  return Object.fromEntries(
    Object.entries(defaultThemeColors).map(([key, fallback]) => {
      const color = colors[key as keyof ThemeColors];
      return [key, typeof color === "string" && /^#[\da-f]{6}$/i.test(color) ? color : fallback];
    })
  ) as ThemeColors;
}

function normalizeThemeColors(value: unknown): ThemeColors {
  if (!value || typeof value !== "object") return defaultThemeColors;
  const colors = value as Partial<ThemeColors>;
  const isPreviousDefault = Object.keys(previousDefaultThemeColors).every((key) => {
    const colorKey = key as keyof ThemeColors;
    return colors[colorKey] === previousDefaultThemeColors[colorKey];
  });
  return isPreviousDefault ? defaultThemeColors : sanitizeThemeColors(value);
}

function themeStyle(colors: ThemeColors): CSSProperties {
  return {
    "--bg": colors.background,
    "--surface": colors.surface,
    "--surface-2": colors.raisedSurface,
    "--white": colors.text,
    "--muted": colors.mutedText,
    "--muted-2": colors.mutedText,
    "--accent": colors.accent,
    "--accent-strong": colors.strongAccent,
    "--accent-soft": colors.softAccent,
    "--violet": colors.accent,
    "--cyan": colors.auroraTwo,
    "--pink": colors.auroraThree,
    "--orange": colors.accent,
    "--line": colors.border,
    "--sidebar-bg": colors.sidebar,
    "--topbar-bg": colors.topbar,
    "--aurora-one": colors.auroraOne,
    "--aurora-two": colors.auroraTwo,
    "--aurora-three": colors.auroraThree,
    "--theme-border": colors.border,
  } as CSSProperties;
}

function getPreferences(state: NexusState): Preferences {
  const preferences = { ...defaultPreferences, ...state.preferences };
  if (!["plain", "glow", "grid", "ocean", "ember", "neon", "sunset", "forest"].includes(preferences.background)) {
    return { ...preferences, background: "plain" };
  }
  return preferences;
}

function readSectionFromHash(): SectionId {
  const section = window.location.hash.slice(1);
  return sectionIds.includes(section as SectionId) ? section as SectionId : "home";
}

const iconByName = {
  "⌂": Home,
  "⌕": Compass,
  "✺": Palette,
  "✳": Clapperboard,
  "▣": Video,
  "◉": Video,
  "◈": Gamepad2,
  "✧": Dna,
  "▧": FolderKanban,
  "⚑": Zap,
  "◎": UsersRound,
  "♢": UsersRound,
  "▦": CalendarDays,
  "▤": MessageSquare,
} as const;

const trackColors: Record<XpCategory, string> = {
  activity: "orange",
  creator: "violet",
  gaming: "cyan",
  social: "pink",
};

const themePalettes: Record<NexusTheme, ThemeColors> = {
  midnight: defaultThemeColors,
  aurora: {
    background: "#111a14",
    surface: "#1b281e",
    raisedSurface: "#243328",
    text: "#edf1e9",
    mutedText: "#929d8f",
    accent: "#b1d5a0",
    strongAccent: "#739c64",
    softAccent: "#2c412e",
    sidebar: "#141e16",
    topbar: "#111a14",
    border: "#304432",
    auroraOne: "#8bd7a1",
    auroraTwo: "#62ba9e",
    auroraThree: "#b1d5a0",
  },
  void: {
    background: "#0c120e",
    surface: "#141c16",
    raisedSurface: "#1b261d",
    text: "#edf1e9",
    mutedText: "#929d8f",
    accent: "#8dbb7c",
    strongAccent: "#527449",
    softAccent: "#1d3021",
    sidebar: "#0f1711",
    topbar: "#0c120e",
    border: "#26372b",
    auroraOne: "#8dbb7c",
    auroraTwo: "#527449",
    auroraThree: "#a9d696",
  },
};

const creatorCards = [
  { icon: "▶", title: "Clips", detail: "Lyhyet videot ja hetket", color: "violet" },
  { icon: "▣", title: "Videos", detail: "Oppaat, devlogit ja tarinat", color: "cyan" },
  { icon: "✎", title: "Portfolio", detail: "Näytä parhaat työsi", color: "pink" },
];

function readSavedState(): { state: NexusState; error: string; oneAetherXpInvalid: boolean } {
  try {
    const shouldResetProgress = localStorage.getItem(PROGRESSION_RESET_KEY) !== "1";
    if (shouldResetProgress) localStorage.setItem(PROGRESSION_RESET_KEY, "1");
    const finalizeState = (state: NexusState): NexusState => shouldResetProgress
      ? {
          ...state,
          levels: { creator: 0, gaming: 0, social: 0 },
          xp: { creator: 0, gaming: 0, social: 0 },
          xpSystem: {
            total: 0,
            totals: { activity: 0, gaming: 0, creator: 0, social: 0 },
            days: {},
            seenEvents: {},
          },
          xpHistory: [],
          prestige: {
            creator: { count: 0, runs: [] },
            gaming: { count: 0, runs: [] },
            social: { count: 0, runs: [] },
          },
        }
      : state;
    const oneAetherXpRaw = localStorage.getItem(ONE_AETHER_XP_STORAGE_KEY);
    const oneAetherXp = oneAetherXpRaw === null ? null : importOneAetherXpState(oneAetherXpRaw);
    const oneAetherXpInvalid = oneAetherXpRaw !== null && oneAetherXp === null;
    const applyOneAetherXp = (state: NexusState) => oneAetherXp
      ? normalizeNexusState({ ...state, ...oneAetherXp })
      : state;
    const currentSaved = localStorage.getItem(STORAGE_KEY);
    const previousSaved = currentSaved === null ? localStorage.getItem(PREVIOUS_STORAGE_KEY) : null;
    const legacySaved = currentSaved === null && previousSaved === null
      ? localStorage.getItem(LEGACY_STORAGE_KEY)
      : null;
    const saved = currentSaved ?? previousSaved ?? legacySaved;
    if (!saved) {
      return {
        state: finalizeState(applyOneAetherXp(initialState)),
        error: oneAetherXpInvalid ? "ONE AETHERin XP-tallennetta ei voitu lukea: tiedot ovat virheellisiä." : "",
        oneAetherXpInvalid,
      };
    }
    const value: unknown = JSON.parse(saved);
    if (isNexusState(value)) {
      const normalized = applyOneAetherXp(normalizeNexusState(normalizeLegacyTitle(value)));
      return {
        state: finalizeState(normalized),
        error: oneAetherXpInvalid ? "ONE AETHERin XP-tallennetta ei voitu lukea: tiedot ovat virheellisiä." : "",
        oneAetherXpInvalid,
      };
    }
    if (isLegacyState(value)) {
      const levels = { ...initialState.levels, ...value.levels };
      const xp = initialState.xp;
      const totals = {
        activity: 0,
        creator: levels.creator * XP_PER_LEVEL + xp.creator,
        gaming: levels.gaming * XP_PER_LEVEL + xp.gaming,
        social: levels.social * XP_PER_LEVEL + xp.social,
      };
      const migrated: NexusState = {
        ...initialState,
        profile: { ...initialState.profile, ...value.profile },
        levels,
        xp,
        xpSystem: { total: Object.values(totals).reduce((sum, amount) => sum + amount, 0), totals, days: {}, seenEvents: {} },
        activities: value.activities ?? initialState.activities,
        quests: value.quests,
        joinedEvents: value.joinedEvents ?? [],
        completedChallenges: value.completedChallenges ?? [],
        streakDays: value.streakDays ?? initialState.streakDays,
        lastActiveDate: value.lastActiveDate ?? initialState.lastActiveDate,
        theme: value.theme ?? initialState.theme,
        notificationsEnabled: value.notificationsEnabled ?? true,
        compactMode: value.compactMode ?? false,
      };
      return {
        state: finalizeState(applyOneAetherXp(normalizeNexusState(migrated))),
        error: oneAetherXpInvalid ? "ONE AETHERin XP-tallennetta ei voitu lukea: tiedot ovat virheellisiä." : "",
        oneAetherXpInvalid,
      };
    }

    if (!isNexusState(value)) {
      return {
        state: finalizeState(applyOneAetherXp(initialState)),
        error: "Tallennettu data oli virheellinen. Käytössä on demoprofiili.",
        oneAetherXpInvalid,
      };
    }
    return { state: finalizeState(applyOneAetherXp(initialState)), error: "", oneAetherXpInvalid };
  } catch {
    return {
      state: {
        ...initialState,
        levels: { creator: 0, gaming: 0, social: 0 },
        xp: { creator: 0, gaming: 0, social: 0 },
        xpSystem: {
          total: 0,
          totals: { activity: 0, gaming: 0, creator: 0, social: 0 },
          days: {},
          seenEvents: {},
        },
        xpHistory: [],
      },
      error: "Paikallista dataa ei voitu lukea. Käytössä on demoprofiili.",
      oneAetherXpInvalid: false,
    };
  }
}

function importOneAetherXpState(raw: string): Pick<NexusState, "xpSystem" | "xpHistory"> | null {
  try {
    const value: unknown = JSON.parse(raw);
    if (!isObjectRecord(value) || !isNonNegativeSafeInteger(value.total) || !isObjectRecord(value.totals) ||
      !isObjectRecord(value.days) || !isObjectRecord(value.seenEvents) || !Array.isArray(value.history)) return null;

    const categories: XpCategory[] = ["activity", "gaming", "creator", "social"];
    const totals = {} as Record<XpCategory, number>;
    for (const category of categories) {
      const amount = value.totals[category];
      if (!isNonNegativeSafeInteger(amount)) return null;
      totals[category] = amount;
    }
    const days: Record<string, XpDayTotals> = {};
    for (const [date, dayValue] of Object.entries(value.days)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !isXpDayTotals(dayValue)) return null;
      days[date] = { ...dayValue };
    }
    const seenEvents: Record<string, string> = {};
    for (const [eventKey, date] of Object.entries(value.seenEvents)) {
      if (typeof date !== "string") return null;
      seenEvents[eventKey] = date;
    }
    const xpHistory: NexusState["xpHistory"] = [];
    for (const entry of value.history) {
      if (!isObjectRecord(entry) || typeof entry.id !== "string" ||
        !isXpCategory(entry.category) ||
        !isNonNegativeSafeInteger(entry.amount) || entry.amount < 1 ||
        typeof entry.label !== "string" || typeof entry.at !== "string" || Number.isNaN(Date.parse(entry.at))) return null;
      const source: NexusState["xpHistory"][number]["source"] = entry.id.startsWith("message:")
        ? "message"
        : entry.id.startsWith("story:")
          ? "story"
          : entry.id.startsWith("video:")
            ? "video-story"
            : entry.id.startsWith("creator-publish:")
              ? "creator-publish"
              : entry.id.startsWith("community:")
                ? "community"
                : entry.id.startsWith("creator-battle:")
                  ? "creator-battle"
                  : entry.id.startsWith("gaming:")
                    ? "gaming"
                    : entry.id.startsWith("activity:")
                      ? "activity"
                      : "action";
      xpHistory.push({
        id: entry.id,
        track: entry.category,
        amount: entry.amount,
        label: entry.label,
        at: entry.at,
        source,
      });
    }
    if (value.total !== Object.values(totals).reduce((sum, amount) => sum + amount, 0)) return null;
    return {
      xpSystem: { total: value.total, totals, days, seenEvents },
      xpHistory: xpHistory.slice(0, 100),
    };
  } catch {
    return null;
  }
}

function serializeOneAetherXpState(state: NexusState): string {
  return JSON.stringify({
    ...state.xpSystem,
    history: state.xpHistory.map(({ id, track, amount, label, at }) => ({
      id,
      category: track,
      amount,
      label,
      at,
    })),
  });
}

function isXpCategory(value: unknown): value is XpCategory {
  return value === "activity" || value === "gaming" || value === "creator" || value === "social";
}

async function prepareProfileBanner(file: File): Promise<string> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    throw new Error("Valitse JPG-, PNG- tai WebP-kuva banneriksi.");
  }
  if (file.size > 15 * 1024 * 1024) {
    throw new Error("Bannerikuvan enimmäiskoko on 15 Mt.");
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("Kuvaa ei voitu avata. Valitse toinen kuvatiedosto.");
  }

  try {
    const scale = Math.min(1, 1600 / bitmap.width, 600 / bitmap.height);
    let width = Math.max(1, Math.round(bitmap.width * scale));
    let height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Bannerikuvaa ei voitu käsitellä tässä selaimessa.");

    for (let attempt = 0; attempt < 5; attempt += 1) {
      canvas.width = width;
      canvas.height = height;
      context.clearRect(0, 0, width, height);
      context.drawImage(bitmap, 0, 0, width, height);
      const quality = [0.84, 0.72, 0.6, 0.48, 0.36][attempt];
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
      if (!blob) throw new Error("Bannerikuvaa ei voitu pakata.");
      if (blob.size <= PROFILE_BANNER_MAX_BYTES) {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => typeof reader.result === "string"
            ? resolve(reader.result)
            : reject(new Error("Bannerikuvaa ei voitu lukea."));
          reader.onerror = () => reject(new Error("Bannerikuvan lukeminen epäonnistui."));
          reader.readAsDataURL(blob);
        });
        if (dataUrl.length > PROFILE_BANNER_MAX_DATA_URL_LENGTH) {
          throw new Error("Bannerikuva ei mahtunut paikalliseen tallennustilaan. Valitse pienempi kuva.");
        }
        return dataUrl;
      }
      width = Math.max(1, Math.round(width * 0.75));
      height = Math.max(1, Math.round(height * 0.75));
    }
    throw new Error("Bannerikuva on liian suuri pakkauksen jälkeen. Valitse yksinkertaisempi kuva.");
  } finally {
    bitmap.close();
  }
}

function isXpDayTotals(value: unknown): value is XpDayTotals {
  return isObjectRecord(value) &&
    ["activitySeconds", "gameSeconds", "activity", "gaming", "creator", "social", "messages", "messageXP", "stories", "videos"]
      .every((key) => isNonNegativeSafeInteger(value[key]));
}

function isLegacyState(value: unknown): value is Partial<NexusState> & Pick<NexusState, "profile" | "levels" | "quests"> {
  if (!value || typeof value !== "object") return false;
  const data = value as Partial<NexusState>;
  const profile = data.profile;
  const levels = data.levels;
  return Boolean(
    profile &&
    typeof profile.name === "string" &&
    typeof profile.username === "string" &&
    (profile.friendCode === undefined || typeof profile.friendCode === "string") &&
    typeof profile.title === "string" &&
    typeof profile.bio === "string" &&
    typeof profile.avatar === "string" &&
    Array.isArray(profile.interests) &&
    profile.interests.every((interest) => typeof interest === "string") &&
    levels &&
    (["creator", "gaming", "social"] as const).every((key) =>
      Number.isInteger(levels[key]) && levels[key] >= 0 && levels[key] <= 150
    ) &&
    Array.isArray(data.quests) &&
    data.quests.every((quest) =>
      quest &&
      typeof quest.id === "string" &&
      typeof quest.label === "string" &&
      typeof quest.done === "boolean" &&
      ["creator", "gaming", "social"].includes(quest.track)
    )
  );
}

function isNexusState(value: unknown): value is NexusState {
  if (!value || typeof value !== "object") return false;
  const data = value as Partial<NexusState>;
  const profile = data.profile;
  const levels = data.levels;
  const isStringArray = (items: unknown): items is string[] =>
    Array.isArray(items) && items.every((item) => typeof item === "string");
  return Boolean(
    profile &&
    typeof profile.name === "string" &&
    typeof profile.username === "string" &&
    typeof profile.title === "string" &&
    typeof profile.bio === "string" &&
    typeof profile.avatar === "string" &&
    (profile.bannerImage === undefined || (typeof profile.bannerImage === "string" && profile.bannerImage.startsWith("data:image/jpeg;base64,") && profile.bannerImage.length <= PROFILE_BANNER_MAX_DATA_URL_LENGTH)) &&
    (profile.leagueBronzeFrame === undefined || leagueProfileFrames.some(([id]) => id === profile.leagueBronzeFrame)) &&
    (data.developerUnlockedAchievements === undefined || typeof data.developerUnlockedAchievements === "boolean") &&
    (data.developerUnlockedLeagueFrames === undefined || typeof data.developerUnlockedLeagueFrames === "boolean") &&
    (data.developerUnlockedRankRewards === undefined || typeof data.developerUnlockedRankRewards === "boolean") &&
    isStringArray(profile.interests) &&
    levels &&
    (["creator", "gaming", "social"] as const).every((key) =>
      Number.isInteger(levels[key]) && levels[key] >= 0 && levels[key] <= 150
    ) &&
    data.xp &&
    (["creator", "gaming", "social"] as const).every((key) =>
      Number.isInteger(data.xp?.[key]) && (data.xp?.[key] ?? -1) >= 0 && (data.xp?.[key] ?? XP_PER_LEVEL) < XP_PER_LEVEL
    ) &&
    (data.xpHistory === undefined || (Array.isArray(data.xpHistory) && data.xpHistory.every((entry) =>
      entry &&
      typeof entry.id === "string" &&
      ["activity", "creator", "gaming", "social"].includes(entry.track) &&
      Number.isInteger(entry.amount) && entry.amount > 0 &&
      typeof entry.label === "string" &&
      typeof entry.at === "string" && !Number.isNaN(Date.parse(entry.at)) &&
      ["message", "story", "video-story", "creator-publish", "community", "activity", "gaming", "creator-battle", "action"].includes(entry.source)
    ))) &&
    (data.xpSystem === undefined || (() => {
      const system = data.xpSystem;
      const categories = ["activity", "gaming", "creator", "social"] as const;
      const isEventRecord = (record: unknown): record is Record<string, string> =>
        Boolean(record && typeof record === "object" && !Array.isArray(record) &&
          Object.values(record).every((item) => typeof item === "string"));
      return Boolean(system &&
        Number.isSafeInteger(system.total) && system.total >= 0 &&
        system.total < MAX_TOTAL_XP &&
        system.totals && categories.every((category) =>
          Number.isSafeInteger(system.totals[category]) && system.totals[category] >= 0 &&
          (category === "activity" || system.totals[category] < MAX_CATEGORY_XP)
        ) &&
        system.total === Object.values(system.totals).reduce((total, amount) => total + amount, 0) &&
        system.days && typeof system.days === "object" && !Array.isArray(system.days) &&
        Object.values(system.days).every((day) =>
          day && ["activitySeconds", "gameSeconds", ...categories, "messages", "messageXP", "stories", "videos"]
            .every((key) => Number.isSafeInteger(day[key as keyof XpDayTotals]) && day[key as keyof XpDayTotals] >= 0) &&
          day.activitySeconds <= ACTIVITY_DAILY_CAP * 300 &&
          day.activity <= ACTIVITY_DAILY_CAP &&
          day.messages <= 20 &&
          day.videos <= 2
        ) &&
        isEventRecord(system.seenEvents)
      );
    })()) &&
    Array.isArray(data.quests) &&
    data.quests.every((quest) =>
      quest &&
      typeof quest.id === "string" &&
      typeof quest.label === "string" &&
      typeof quest.done === "boolean" &&
      ["creator", "gaming", "social"].includes(quest.track)
    ) &&
    Array.isArray(data.activities) &&
    data.activities.every((activity) =>
      activity &&
      typeof activity.id === "string" &&
      typeof activity.label === "string" &&
      typeof activity.time === "string"
    ) &&
    (data.conversations === undefined || (Array.isArray(data.conversations) && data.conversations.every((conversation) =>
      conversation &&
      typeof conversation.id === "string" &&
      typeof conversation.name === "string" &&
      typeof conversation.avatar === "string" &&
      ["violet", "cyan", "pink"].includes(conversation.color) &&
      (conversation.isGroup === undefined || typeof conversation.isGroup === "boolean") &&
      (conversation.members === undefined || (Array.isArray(conversation.members) && conversation.members.every((member) => typeof member === "string"))) &&
      (conversation.createdBy === undefined || typeof conversation.createdBy === "string") &&
      (conversation.admins === undefined || (Array.isArray(conversation.admins) && conversation.admins.every((admin) => typeof admin === "string"))) &&
      Array.isArray(conversation.messages) &&
      conversation.messages.every((message) =>
        message &&
        typeof message.id === "string" &&
        typeof message.text === "string" &&
        typeof message.sentAt === "string" && !Number.isNaN(Date.parse(message.sentAt)) &&
        ["incoming", "outgoing"].includes(message.direction) &&
        (message.reactions === undefined || (
          Array.isArray(message.reactions) &&
          message.reactions.length <= 8 &&
          message.reactions.every((emoji) => typeof emoji === "string" && emoji.length > 0 && emoji.length <= 16) &&
          new Set(message.reactions).size === message.reactions.length
        ))
      )
    ))) &&
    isStringArray(data.joinedEvents) &&
    isStringArray(data.joinedCommunities) &&
    isStringArray(data.completedChallenges) &&
    typeof data.streakDays === "number" && Number.isInteger(data.streakDays) && data.streakDays >= 0 &&
    typeof data.lastActiveDate === "string" && (data.lastActiveDate === "" || /^\d{4}-\d{2}-\d{2}$/.test(data.lastActiveDate)) &&
    typeof data.theme === "string" && ["midnight", "aurora", "void"].includes(data.theme) &&
    Array.isArray(data.games) &&
    data.games.every((game) =>
      game &&
      typeof game.id === "string" &&
      typeof game.name === "string" &&
      ["playing", "backlog", "completed"].includes(game.status) &&
      Number.isInteger(game.progress) && game.progress >= 0 && game.progress <= 100 &&
      Number.isInteger(game.sessions) && game.sessions >= 0
    ) &&
    Array.isArray(data.projects) &&
    data.projects.every((project) =>
      project &&
      typeof project.id === "string" &&
      typeof project.name === "string" &&
      typeof project.detail === "string" &&
      Array.isArray(project.tasks) &&
      project.tasks.every((task) =>
        task &&
        typeof task.id === "string" &&
        typeof task.title === "string" &&
        ["todo", "inProgress", "done"].includes(task.status)
      )
    ) &&
    Array.isArray(data.creatorDrafts) &&
    data.creatorDrafts.every((draft) =>
      draft &&
      typeof draft.id === "string" &&
      typeof draft.title === "string" &&
      ["Clip", "Video", "Post"].includes(draft.type) &&
      typeof draft.body === "string" &&
      typeof draft.updatedAt === "string"
    ) &&
    (data.creatorPosts === undefined || (Array.isArray(data.creatorPosts) && data.creatorPosts.every((post) =>
      post &&
      typeof post.id === "string" &&
      typeof post.title === "string" &&
      typeof post.body === "string" &&
      typeof post.mediaName === "string" &&
      typeof post.createdAt === "string" && !Number.isNaN(Date.parse(post.createdAt)) &&
      (post.gameId === undefined || typeof post.gameId === "string")
    ))) &&
    Array.isArray(data.communities) &&
    data.communities.every((community) =>
      community &&
      typeof community.id === "string" &&
      typeof community.name === "string" &&
      typeof community.category === "string" &&
      Number.isInteger(community.members) && community.members >= 0
    ) &&
    Array.isArray(data.events) &&
    data.events.every((event) =>
      event &&
      typeof event.id === "string" &&
      typeof event.name === "string" &&
      typeof event.detail === "string" &&
      typeof event.startsAt === "string" &&
      !Number.isNaN(Date.parse(event.startsAt)) &&
      typeof event.category === "string" &&
      Number.isInteger(event.attendees) && event.attendees >= 0
    ) &&
    typeof data.notificationsEnabled === "boolean" &&
    typeof data.compactMode === "boolean"
  );
}

function normalizeNexusState(state: NexusState): NexusState {
  const migratedDays: Record<string, XpDayTotals> = {};
  for (const entry of state.xpHistory ?? []) {
    const date = getLocalDateKey(Date.parse(entry.at));
    const day = migratedDays[date] ?? emptyXpDay();
    if (entry.source === "message") day.messages += 1;
    if (entry.source === "video-story" || entry.source === "creator-publish") day.videos += 1;
    migratedDays[date] = day;
  }
  const xpSystem: XpSystemState = state.xpSystem ? {
    ...state.xpSystem,
    totals: { ...state.xpSystem.totals },
    days: { ...state.xpSystem.days },
    seenEvents: { ...state.xpSystem.seenEvents },
  } : {
    total: (["creator", "gaming", "social"] as const).reduce(
      (total, track) => total + state.levels[track] * XP_PER_LEVEL + state.xp[track],
      0,
    ),
    totals: {
      activity: 0,
      creator: state.levels.creator * XP_PER_LEVEL + state.xp.creator,
      gaming: state.levels.gaming * XP_PER_LEVEL + state.xp.gaming,
      social: state.levels.social * XP_PER_LEVEL + state.xp.social,
    },
    days: migratedDays,
    seenEvents: {},
  };
  for (const track of ["creator", "gaming", "social"] as const) {
    xpSystem.totals[track] = Math.min(MAX_CATEGORY_XP, xpSystem.totals[track]);
  }
  xpSystem.total = Math.min(
    MAX_TOTAL_XP,
    Object.values(xpSystem.totals).reduce((total, amount) => total + amount, 0),
  );
  return {
    ...state,
    profile: {
      ...state.profile,
      friendCode: state.profile.friendCode ?? "NEX-7K4P2",
    },
    xpSystem,
    levels: {
      creator: Math.min(MAX_CATEGORY_LEVEL, Math.floor(xpSystem.totals.creator / XP_PER_LEVEL)),
      gaming: Math.min(MAX_CATEGORY_LEVEL, Math.floor(xpSystem.totals.gaming / XP_PER_LEVEL)),
      social: Math.min(MAX_CATEGORY_LEVEL, Math.floor(xpSystem.totals.social / XP_PER_LEVEL)),
    },
    xp: {
      creator: xpSystem.totals.creator % XP_PER_LEVEL,
      gaming: xpSystem.totals.gaming % XP_PER_LEVEL,
      social: xpSystem.totals.social % XP_PER_LEVEL,
    },
    xpHistory: state.xpHistory ?? [],
    creatorPosts: state.creatorPosts ?? [],
    conversations: (state.conversations ?? initialState.conversations).map((conversation) => conversation.isGroup ? {
      ...conversation,
      members: conversation.members ?? [],
      admins: conversation.admins ?? [],
      createdBy: conversation.createdBy ?? state.profile.username,
    } : conversation),
  };
}

function getLocalDateKey(timestamp = Date.now()): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getPreviousLocalDateKey(timestamp = Date.now()): string {
  const date = new Date(timestamp);
  date.setDate(date.getDate() - 1);
  return getLocalDateKey(date.getTime());
}

function updateDailyStreak(state: NexusState): NexusState {
  const today = getLocalDateKey();
  if (state.lastActiveDate === today && state.streakDays > 0) return state;
  const streakDays = state.lastActiveDate === getPreviousLocalDateKey()
    ? state.streakDays + 1
    : 1;
  return { ...state, streakDays, lastActiveDate: today };
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isNonNegativeSafeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

async function fetchSameOriginApi(path: string): Promise<unknown> {
  const response = await fetch(path, { credentials: "same-origin", cache: "no-store" });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message = isObjectRecord(payload) && typeof payload.error === "string"
      ? payload.error
      : `ONE AETHER -palvelin palautti virheen (${response.status}).`;
    throw new Error(message);
  }
  return payload;
}

async function getTodayGamingSeconds(): Promise<number> {
  const selectedSource = localStorage.getItem("one-activity-source");
  const source = selectedSource === "steam" ? "steam" : "one";
  const payload = await fetchSameOriginApi(
    `/api/activity?source=${source}&timezoneOffset=${new Date().getTimezoneOffset()}`,
  );
  if (!isObjectRecord(payload) || !Array.isArray(payload.daily) || typeof payload.today !== "string") {
    throw new TypeError("Peliaikatietojen API palautti virheellistä dataa.");
  }
  const today = payload.daily.find((item): item is Record<string, unknown> =>
    isObjectRecord(item) && item.date === payload.today
  );
  if (!today || !isNonNegativeSafeInteger(today.seconds)) {
    throw new TypeError("Peliaikatieto ei ollut kelvollinen.");
  }
  return today.seconds;
}

async function getCreatorBattleRewardIds(): Promise<string[]> {
  const payload = await fetchSameOriginApi("/api/social/creator-battles");
  if (!isObjectRecord(payload) || !Array.isArray(payload.rewards)) {
    throw new TypeError("Creator Battle -rajapinta palautti virheellisiä palkintotietoja.");
  }
  const battleIds: string[] = [];
  for (const reward of payload.rewards) {
    if (!isObjectRecord(reward) || typeof reward.battleId !== "string" || !reward.battleId) {
      throw new TypeError("Creator Battle -rajapinta palautti virheellisiä palkintotietoja.");
    }
    battleIds.push(reward.battleId);
  }
  return battleIds;
}

function addActivity(state: NexusState, label: string): NexusState {
  const streakState = updateDailyStreak(state);
  return {
    ...streakState,
    activities: [{ id: crypto.randomUUID(), label, time: "Juuri nyt" }, ...streakState.activities].slice(0, 12),
  };
}

function awardXp(
  state: NexusState,
  category: XpCategory,
  amount: number,
  eventKey: string,
  label: string,
  dailyEventLimit?: { counter: "messages" | "videos"; limit: number },
  source: NexusState["xpHistory"][number]["source"] = category === "activity" ? "activity" : category === "gaming" ? "gaming" : "action",
): { state: NexusState; levelsGained: number; amountAwarded: number } {
  if (state.xpSystem.seenEvents[eventKey]) return { state, levelsGained: 0, amountAwarded: 0 };
  const date = getLocalDateKey();
  const day = state.xpSystem.days[date] ?? emptyXpDay();
  if (dailyEventLimit && day[dailyEventLimit.counter] >= dailyEventLimit.limit) {
    return { state, levelsGained: 0, amountAwarded: 0 };
  }
  const categoryCap = category === "activity" ? Number.MAX_SAFE_INTEGER : MAX_CATEGORY_XP;
  const amountAwarded = Math.min(
    amount,
    Math.max(0, MAX_TOTAL_XP - state.xpSystem.total),
    Math.max(0, categoryCap - state.xpSystem.totals[category]),
  );
  if (!amountAwarded) return { state, levelsGained: 0, amountAwarded: 0 };
  const priorTrackLevel = category === "activity" ? 0 : state.levels[category];
  const totals = { ...state.xpSystem.totals, [category]: state.xpSystem.totals[category] + amountAwarded };
  const levels = {
    ...state.levels,
    ...(category === "activity" ? {} : {
      [category]: Math.min(MAX_CATEGORY_LEVEL, Math.floor(totals[category] / XP_PER_LEVEL)),
    }),
  };
  const xp = {
    ...state.xp,
    ...(category === "activity" ? {} : { [category]: totals[category] % XP_PER_LEVEL }),
  };
  const updatedDay = {
    ...day,
    [category]: day[category] + amountAwarded,
    ...(dailyEventLimit ? { [dailyEventLimit.counter]: day[dailyEventLimit.counter] + 1 } : {}),
  };
  const historyEntry = {
    id: eventKey,
    track: category,
    amount: amountAwarded,
    label,
    at: new Date().toISOString(),
    source,
  };
  return {
    state: {
      ...state,
      xpSystem: {
        ...state.xpSystem,
        total: state.xpSystem.total + amountAwarded,
        totals,
        days: { ...state.xpSystem.days, [date]: updatedDay },
        seenEvents: { ...state.xpSystem.seenEvents, [eventKey]: date },
      },
      xpHistory: [historyEntry, ...state.xpHistory].slice(0, 100),
      levels,
      xp,
    },
    levelsGained: category === "activity" ? 0 : levels[category] - priorTrackLevel,
    amountAwarded,
  };
}

function emptyXpDay(): XpDayTotals {
  return {
    activitySeconds: 0,
    gameSeconds: 0,
    activity: 0,
    gaming: 0,
    creator: 0,
    social: 0,
    messages: 0,
    messageXP: 0,
    stories: 0,
    videos: 0,
  };
}

function getTotalXp(state: NexusState): number {
  return state.xpSystem.total;
}

function getTotalLevel(state: NexusState): number {
  return Math.min(MAX_TOTAL_LEVEL, Math.floor(getTotalXp(state) / XP_PER_LEVEL));
}

function getTrackLevel(state: NexusState, track: "creator" | "gaming" | "social"): number {
  return Math.min(MAX_CATEGORY_LEVEL, Math.max(1, Math.floor(state.xpSystem.totals[track] / XP_PER_LEVEL)));
}

function setDeveloperXp(state: NexusState, category: XpCategory | "total", requestedAmount: number): NexusState {
  const amount = Math.min(category === "activity" ? MAX_TOTAL_XP : category === "total" ? MAX_TOTAL_XP : MAX_CATEGORY_XP,
    Math.max(0, Math.floor(Number.isFinite(requestedAmount) ? requestedAmount : 0)));
  const totals = { ...state.xpSystem.totals };

  if (category === "total") {
    const categoryTotal = totals.creator + totals.gaming + totals.social;
    const preservedTotal = Math.min(categoryTotal, amount);
    const scale = categoryTotal > 0 ? preservedTotal / categoryTotal : 0;
    totals.creator = Math.floor(totals.creator * scale);
    totals.gaming = Math.floor(totals.gaming * scale);
    totals.social = Math.floor(totals.social * scale);
    let remainder = preservedTotal - totals.creator - totals.gaming - totals.social;
    for (const track of ["creator", "gaming", "social"] as const) {
      if (remainder === 0) break;
      totals[track] += 1;
      remainder -= 1;
    }
    totals.activity = amount - totals.creator - totals.gaming - totals.social;
  } else {
    totals[category] = amount;
    let overflow = Math.max(0, Object.values(totals).reduce((sum, item) => sum + item, 0) - MAX_TOTAL_XP);
    const reducibleCategories = (["activity", "creator", "gaming", "social"] as const).filter((item) => item !== category);
    for (const item of reducibleCategories) {
      const reduction = Math.min(totals[item], overflow);
      totals[item] -= reduction;
      overflow -= reduction;
      if (overflow === 0) break;
    }
  }

  const total = Object.values(totals).reduce((sum, item) => sum + item, 0);
  return {
    ...state,
    xpSystem: { ...state.xpSystem, total, totals },
    levels: {
      creator: Math.min(MAX_CATEGORY_LEVEL, Math.floor(totals.creator / XP_PER_LEVEL)),
      gaming: Math.min(MAX_CATEGORY_LEVEL, Math.floor(totals.gaming / XP_PER_LEVEL)),
      social: Math.min(MAX_CATEGORY_LEVEL, Math.floor(totals.social / XP_PER_LEVEL)),
    },
    xp: {
      creator: totals.creator % XP_PER_LEVEL,
      gaming: totals.gaming % XP_PER_LEVEL,
      social: totals.social % XP_PER_LEVEL,
    },
  };
}

type RewardCategory = "Badge" | "Title" | "Item";
type Reward = { id: string; name: string; type: RewardCategory; level: number; icon: string };

function getRewardCategoryLabel(type: RewardCategory): string {
  if (getLocale() === "en-GB") return type;
  return type === "Title" ? "Titteli" : type === "Item" ? "Keräilyesine" : "Merkki";
}

const totalLevelRewardLevels = [
  ...Array.from({ length: 15 }, (_, index) => (index + 1) * 10),
  ...Array.from({ length: 15 }, (_, index) => 170 + index * 20),
  MAX_TOTAL_LEVEL,
];

const namedTotalLevelMilestones: Record<number, {
  title: string;
  item: string;
  itemIcon: string;
  badge: string;
  badgeIcon: string;
}> = {
  10: { title: "Aetherin kulkija", item: "Ensiaskeleen kehys", itemIcon: "◈", badge: "Ensisoihtu", badgeIcon: "✦" },
  20: { title: "Polun avaaja", item: "Kimalteleva kompassi", itemIcon: "◇", badge: "Suunnan merkki", badgeIcon: "✧" },
  30: { title: "Aetherin tutkija", item: "Sumuverhon sirpale", itemIcon: "✦", badge: "Tutkijan silmä", badgeIcon: "★" },
  40: { title: "Virran tuntija", item: "Virran kristalli", itemIcon: "◈", badge: "Aetherin virta", badgeIcon: "✧" },
  50: { title: "Rajojen rikkoja", item: "Kultainen solmu", itemIcon: "◇", badge: "Murtajan sinetti", badgeIcon: "✦" },
  60: { title: "Tähtien seuraaja", item: "Tähtipölyn pullo", itemIcon: "✦", badge: "Tähden merkki", badgeIcon: "★" },
  70: { title: "Hiljaisuuden vartija", item: "Yönvartijan naamio", itemIcon: "◈", badge: "Vartijan silmä", badgeIcon: "✧" },
  80: { title: "Valon kerääjä", item: "Aamunkoiton siru", itemIcon: "◇", badge: "Valon merkki", badgeIcon: "✦" },
  90: { title: "Syvyyksien tuntija", item: "Syvänteen helmi", itemIcon: "✦", badge: "Syvyyden sinetti", badgeIcon: "★" },
  100: { title: "Ensimmäinen legenda", item: "Legendan ydin", itemIcon: "◈", badge: "Legendan merkki", badgeIcon: "✧" },
  110: { title: "Aetherin rakentaja", item: "Rakentajan prisma", itemIcon: "◇", badge: "Luomisen merkki", badgeIcon: "✦" },
  120: { title: "Kipinän kantaja", item: "Ikuinen kipinä", itemIcon: "✦", badge: "Kipinän merkki", badgeIcon: "★" },
  130: { title: "Verkoston yhdistäjä", item: "Yhteyksien rengas", itemIcon: "◈", badge: "Yhteyden merkki", badgeIcon: "✧" },
  140: { title: "Aetherin mestari", item: "Mestarin riipus", itemIcon: "◇", badge: "Mestarin sinetti", badgeIcon: "✦" },
  150: { title: "Rajattoman polun kulkija", item: "Rajattomuuden avain", itemIcon: "✦", badge: "Rajojen merkki", badgeIcon: "★" },
  170: { title: "Uuden aikakauden avaaja", item: "Aikakauden sirpale", itemIcon: "◈", badge: "Uuden aamun merkki", badgeIcon: "✧" },
  190: { title: "Kosmoksen kartoittaja", item: "Kosmoksen kartta", itemIcon: "◇", badge: "Kartoittajan tähti", badgeIcon: "✦" },
  210: { title: "Ajattoman virran kulkija", item: "Ajattoman virran helmi", itemIcon: "✦", badge: "Ajattomuuden merkki", badgeIcon: "★" },
  230: { title: "Aetherin arkkitehti", item: "Arkkitehdin kuutio", itemIcon: "◈", badge: "Arkkitehdin sinetti", badgeIcon: "✧" },
  250: { title: "Tähtien muovaaja", item: "Tähtien muotti", itemIcon: "◇", badge: "Muovaajan merkki", badgeIcon: "✦" },
  270: { title: "Ikuisen liekin vartija", item: "Ikuinen liekki", itemIcon: "✦", badge: "Liekin kruunu", badgeIcon: "★" },
  290: { title: "Hiljaisuuden yläpuolella", item: "Tyhjiön kristalli", itemIcon: "◈", badge: "Tyhjiön silmä", badgeIcon: "✧" },
  310: { title: "Aetherin suunnannäyttäjä", item: "Suunnannäyttäjän neula", itemIcon: "◇", badge: "Pohjantähden merkki", badgeIcon: "✦" },
  330: { title: "Katoamattoman kipinän kantaja", item: "Katoamaton kipinä", itemIcon: "✦", badge: "Kipinän kruunu", badgeIcon: "★" },
  350: { title: "Maailmojen yhdistäjä", item: "Maailmojen solmu", itemIcon: "◈", badge: "Yhdistäjän merkki", badgeIcon: "✧" },
  370: { title: "Aetherin ylin vartija", item: "Ylimmän vartijan reliikki", itemIcon: "◇", badge: "Ylivartijan sinetti", badgeIcon: "✦" },
  390: { title: "Loputtoman matkan mestari", item: "Loputtoman matkan kompassi", itemIcon: "✦", badge: "Matkan mestarin merkki", badgeIcon: "★" },
  410: { title: "Aetherin valonkantaja", item: "Valonkantajan kruunu", itemIcon: "◈", badge: "Valonkantajan merkki", badgeIcon: "✧" },
  430: { title: "Kaiken virran tuntija", item: "Kaiken virran ydin", itemIcon: "◇", badge: "Virran mestarin merkki", badgeIcon: "✦" },
  450: { title: "Ikuisuuden kulkija", item: "Ikuisuuden avain", itemIcon: "✦", badge: "Ikuisuuden merkki", badgeIcon: "★" },
  470: { title: "Aetherin kruunattu", item: "Kruunattu prisma", itemIcon: "◈", badge: "Kruunun merkki", badgeIcon: "✧" },
  480: { title: "Aetherin huipentuma", item: "Aetherin huipentuma", itemIcon: "✦", badge: "Aetherin huipentuman merkki", badgeIcon: "★" },
};

const totalLevelMilestones = totalLevelRewardLevels.map((level) => namedTotalLevelMilestones[level] ? {
  level,
  ...namedTotalLevelMilestones[level],
} : {
  level,
  title: `Aetherin taso ${level}`,
  item: `Aetherin tason ${level} reliikki`,
  itemIcon: level >= 170 ? "✦" : "◈",
  badge: `Aetherin tason ${level} merkki`,
  badgeIcon: level >= 170 ? "★" : "✧",
});

const rewardCatalog: Reward[] = [
  ...totalLevelMilestones.flatMap((milestone) => [
    { id: `total-title-${milestone.level}`, name: milestone.title, type: "Title" as const, level: milestone.level, icon: "✧" },
    { id: `total-item-${milestone.level}`, name: milestone.item, type: "Item" as const, level: milestone.level, icon: milestone.itemIcon },
    { id: `total-badge-${milestone.level}`, name: milestone.badge, type: "Badge" as const, level: milestone.level, icon: milestone.badgeIcon },
  ]),
].sort((first, second) => first.level - second.level);

function getUnlockedRewards(totalLevel: number): Reward[] {
  return rewardCatalog.filter((reward) => totalLevel >= reward.level);
}

function normalizeLegacyTitle(state: NexusState): NexusState {
  const colors = normalizeThemeColors(state.themeColors);
  const unlockedTitles = getUnlockedRewards(getTotalLevel(state)).filter((reward) => reward.type === "Title");
  const latestUnlockedTitle = unlockedTitles[unlockedTitles.length - 1]?.name ?? "";
  const prestigeTitles = getEarnedPrestigeRewards(state).map((reward) => reward.title);
  const title = state.profile.title === initialState.profile.title || prestigeTitles.includes(state.profile.title) || rewardCatalog.some((reward) =>
    reward.type === "Title" && reward.name === state.profile.title && reward.level <= getTotalLevel(state)
  ) ? state.profile.title : latestUnlockedTitle;
  const normalized = { ...state, profile: { ...state.profile, title }, themeColors: colors } as NexusState & {
    profileBorderId?: string;
    profileBorderVisible?: boolean;
  };
  delete normalized.profileBorderId;
  delete normalized.profileBorderVisible;
  return normalized;
}

function App() {
  const [loaded] = useState(readSavedState);
  const [state, setState] = useState<NexusState>(loaded.state);
  const latestState = useRef(state);
  latestState.current = state;
  const language = getPreferences(state).language;
  setLocale(language);
  useEffect(() => { document.documentElement.lang = language; applyLanguage(language); }, [language]);
  useEffect(() => {
    setState((current) => updateDailyStreak(current));
  }, []);
  const [activeSection, setActiveSection] = useState<SectionId>(readSectionFromHash);
  const [toast, setToast] = useState(loaded.error);
  const [creatorLeagueAccount, setCreatorLeagueAccount] = useState<CreatorLeagueAccount | null>(null);
  const [creatorLeagueAccountLoading, setCreatorLeagueAccountLoading] = useState(true);
  const [accountDataReady, setAccountDataReady] = useState(false);
  const [accountAuthMode, setAccountAuthMode] = useState<"register" | "login">("register");
  const [accountEmail, setAccountEmail] = useState("");
  const [accountPassword, setAccountPassword] = useState("");
  const [accountDisplayName, setAccountDisplayName] = useState("");
  const [accountAuthError, setAccountAuthError] = useState("");
  const [accountAuthSubmitting, setAccountAuthSubmitting] = useState(false);
  const [accountCloudSaveError, setAccountCloudSaveError] = useState("");
  const [onlineMessages, setOnlineMessages] = useState<CreatorLeagueMessages>({ friends: [], conversations: [] });
  const [onlineMessagesError, setOnlineMessagesError] = useState("");
  const [search, setSearch] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [importError, setImportError] = useState("");
  const toastTimer = useRef<number | undefined>(undefined);
  const saveFailed = useRef(false);
  const cloudSaveErrorShown = useRef(false);
  const oneAetherXpInvalid = useRef(loaded.oneAetherXpInvalid);
  const previousTotalLevel = useRef(getTotalLevel(state));

  useEffect(() => {
    let active = true;
    getCreatorLeagueAccount()
      .then(async (account) => {
        if (!active) return;
        if (account) {
          const remoteState = await getCreatorAccountState();
          if (!active) return;
          if (remoteState !== null) {
            if (!isNexusState(remoteState)) throw new Error("Tilille tallennettu sovellustila ei kelpaa. Paikallinen varmuuskopio säilyy tässä selaimessa.");
            const restored = normalizeNexusState(normalizeLegacyTitle(remoteState));
            setState(restored);
            latestState.current = restored;
          } else {
            await saveCreatorAccountState(state);
          }
          if (!active) return;
          setAccountDataReady(true);
        }
        setCreatorLeagueAccount(account);
      })
      .catch((error: unknown) => {
        if (active) {
          console.error("Tilin tietojen lataaminen epäonnistui.", error);
          setAccountAuthError(error instanceof Error ? error.message : "Tilin tietoja ei voitu ladata.");
        }
      })
      .finally(() => { if (active) setCreatorLeagueAccountLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!creatorLeagueAccount || !accountDataReady) return;
    let active = true;
    const timer = window.setTimeout(() => {
      void saveCreatorAccountState(state).then(() => {
        if (!active) return;
        cloudSaveErrorShown.current = false;
        setAccountCloudSaveError("");
      }).catch((error: unknown) => {
        if (!active) return;
        const message = error instanceof Error ? error.message : "Tilin tietoja ei voitu tallentaa palvelimelle.";
        setAccountCloudSaveError(message);
        if (!cloudSaveErrorShown.current) {
          setToast(`Tilin tietojen verkkotallennus epäonnistui: ${message}`);
          cloudSaveErrorShown.current = true;
        }
      });
    }, 800);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [accountDataReady, creatorLeagueAccount?.id, state]);

  useEffect(() => {
    if (!creatorLeagueAccount) {
      setOnlineMessages({ friends: [], conversations: [] });
      setOnlineMessagesError("");
      return;
    }
    if (activeSection !== "messages") return;
    let active = true;
    let syncing = false;
    const refresh = async () => {
      if (syncing) return;
      syncing = true;
      try {
        const messages = await getCreatorLeagueMessages();
        if (active) {
          setOnlineMessages(messages);
          setOnlineMessagesError("");
        }
      } catch (error) {
        if (active) setOnlineMessagesError(error instanceof Error ? error.message : "Verkkoviestejä ei voitu ladata.");
      } finally {
        syncing = false;
      }
    };
    void refresh();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 3000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [activeSection, creatorLeagueAccount?.id]);

  const visibleConversations = useMemo(
    () => [...onlineMessages.conversations, ...state.conversations],
    [onlineMessages.conversations, state.conversations],
  );
  const messageState = useMemo(
    () => ({ ...state, conversations: visibleConversations }),
    [state, visibleConversations],
  );

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      if (!oneAetherXpInvalid.current) {
        const sharedXp = localStorage.getItem(ONE_AETHER_XP_STORAGE_KEY);
        if (sharedXp !== null && !importOneAetherXpState(sharedXp)) {
          oneAetherXpInvalid.current = true;
          setToast("ONE AETHERin XP-tallennetta ei voitu päivittää: tiedot ovat virheellisiä.");
        } else {
          localStorage.setItem(ONE_AETHER_XP_STORAGE_KEY, serializeOneAetherXpState(state));
        }
      }
      saveFailed.current = false;
    } catch {
      if (!saveFailed.current) {
        setToast("Tallennus epäonnistui. Tarkista selaimen tallennustila.");
        saveFailed.current = true;
      }
    }
  }, [state]);

  useEffect(() => {
    const syncOneAetherXp = (event: StorageEvent) => {
      if (event.key !== ONE_AETHER_XP_STORAGE_KEY) return;
      const imported = event.newValue === null
        ? { xpSystem: initialState.xpSystem, xpHistory: initialState.xpHistory }
        : importOneAetherXpState(event.newValue);
      if (!imported) {
        oneAetherXpInvalid.current = true;
        setToast("ONE AETHERin XP-tallennetta ei voitu lukea: tiedot ovat virheellisiä.");
        return;
      }
      oneAetherXpInvalid.current = false;
      setState((current) => {
        const synchronized = normalizeNexusState({ ...current, ...imported });
        return serializeOneAetherXpState(synchronized) === serializeOneAetherXpState(current)
          ? current
          : synchronized;
      });
    };
    window.addEventListener("storage", syncOneAetherXp);
    return () => window.removeEventListener("storage", syncOneAetherXp);
  }, []);

  useEffect(() => {
    let lastTick = Date.now();
    let lastInteraction = Date.now();
    const resetTick = () => { lastTick = Date.now(); };
    const recordInteraction = () => { lastInteraction = Date.now(); };
    const tickActiveTime = () => {
      const now = Date.now();
      const elapsed = Math.min(60, Math.max(0, Math.floor((now - lastTick) / 1000)));
      lastTick = now;
      if (!elapsed || document.visibilityState !== "visible" || !document.hasFocus() ||
        now - lastInteraction > 5 * 60_000) return;

      const date = getLocalDateKey(now);
      setState((current) => {
        const day = current.xpSystem.days[date] ?? emptyXpDay();
        if (day.activity >= ACTIVITY_DAILY_CAP || current.xpSystem.total >= MAX_TOTAL_XP) return current;
        const activitySeconds = Math.min(ACTIVITY_DAILY_CAP * 300, day.activitySeconds + elapsed);
        if (activitySeconds === day.activitySeconds) return current;
        const xpBefore = Math.floor(day.activitySeconds / 300);
        const xpAfter = Math.floor(activitySeconds / 300);
        const earned = Math.min(Math.max(0, xpAfter - xpBefore), ACTIVITY_DAILY_CAP - day.activity);
        const withActivityTime: NexusState = {
          ...current,
          xpSystem: {
            ...current.xpSystem,
            days: {
              ...current.xpSystem.days,
              [date]: { ...day, activitySeconds },
            },
          },
        };
        return earned
          ? awardXp(withActivityTime, "activity", earned, `activity:${date}:${xpAfter}`, "Aktiivista aikaa sovelluksessa").state
          : withActivityTime;
      });
    };
    const inputEvents = ["pointerdown", "keydown", "touchstart", "wheel"];
    inputEvents.forEach((eventName) => document.addEventListener(eventName, recordInteraction, { passive: true }));
    window.addEventListener("focus", resetTick);
    window.addEventListener("blur", resetTick);
    document.addEventListener("visibilitychange", resetTick);
    const timer = window.setInterval(tickActiveTime, 30_000);
    return () => {
      window.clearInterval(timer);
      inputEvents.forEach((eventName) => document.removeEventListener(eventName, recordInteraction));
      window.removeEventListener("focus", resetTick);
      window.removeEventListener("blur", resetTick);
      document.removeEventListener("visibilitychange", resetTick);
    };
  }, []);

  useEffect(() => {
    if (location.protocol === "file:") return;
    let active = true;
    let syncing = false;
    let lastError = "";
    const syncGamingTime = async () => {
      const current = latestState.current;
      if (syncing || current.xpSystem.total >= MAX_TOTAL_XP ||
        current.xpSystem.totals.gaming >= MAX_CATEGORY_XP) return;
      syncing = true;
      try {
        const seconds = await getTodayGamingSeconds();
        if (!active) return;
        const date = getLocalDateKey();
        setState((latest) => {
          const day = latest.xpSystem.days[date] ?? emptyXpDay();
          const gameSeconds = Math.max(day.gameSeconds, seconds);
          const eligibleTotal = Math.floor(gameSeconds / 300) * 2;
          const earnedTotal = Math.max(day.gaming, eligibleTotal);
          const earned = Math.max(0, earnedTotal - day.gaming);
          if (!earned && gameSeconds === day.gameSeconds) return latest;
          const withGameTime: NexusState = {
            ...latest,
            xpSystem: {
              ...latest.xpSystem,
              days: {
                ...latest.xpSystem.days,
                [date]: { ...day, gameSeconds },
              },
            },
          };
          return earned
            ? awardXp(withGameTime, "gaming", earned, `gaming:${date}:${earnedTotal}`, "Pelattu peliä", undefined, "gaming").state
            : withGameTime;
        });
        lastError = "";
      } catch (error) {
        if (!active) return;
        const message = error instanceof Error ? error.message : "Peliaikatietoja ei voitu synkronoida.";
        if (message !== lastError) console.error("ONE AETHER-peliajan synkronointi epäonnistui.", error);
        lastError = message;
        lastError = message;
      } finally {
        syncing = false;
      }
    };
    void syncGamingTime();
    const timer = window.setInterval(() => void syncGamingTime(), 60_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (activeSection !== "creator" || location.protocol === "file:") return;
    let active = true;
    let syncing = false;
    let lastError = "";
    const syncCreatorBattles = async () => {
      if (syncing) return;
      syncing = true;
      try {
        const battleIds = await getCreatorBattleRewardIds();
        if (!active) return;
        setState((current) => battleIds.reduce(
          (updated, battleId) => awardXp(
            updated,
            "creator",
            500,
            `creator-battle:${battleId}`,
            "Voitettu Creator Battle",
            undefined,
            "creator-battle",
          ).state,
          current,
        ));
        lastError = "";
        lastError = "";
      } catch (error) {
        if (!active) return;
        const message = error instanceof Error ? error.message : "Creator Battle -palkintoja ei voitu synkronoida.";
        if (message !== lastError) console.error("ONE AETHER Creator Battle -palkintojen synkronointi epäonnistui.", error);
        lastError = message;
        lastError = message;
      } finally {
        syncing = false;
      }
    };
    void syncCreatorBattles();
    const timer = window.setInterval(() => void syncCreatorBattles(), 60_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [activeSection]);

  useEffect(() => {
    if (!toast) return;
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(""), 3500);
    return () => window.clearTimeout(toastTimer.current);
  }, [toast]);

  useEffect(() => {
    const currentLevel = getTotalLevel(state);
    const oldLevel = previousTotalLevel.current;
    previousTotalLevel.current = currentLevel;
    if (currentLevel <= oldLevel) return;

    const unlocked = rewardCatalog.filter((reward) => reward.level > oldLevel && reward.level <= currentLevel);
    const latestReward = unlocked[unlocked.length - 1];
    if (!latestReward) {
      showToast(getLocale() === "en-GB" ? `Level up! You reached level ${currentLevel}.` : `Uusi taso! Saavutit tason ${currentLevel}.`);
      return;
    }
    const message = getLocale() === "en-GB"
      ? `Level ${latestReward.level}! Unlocked ${latestReward.type}: ${latestReward.name}.`
      : `Taso ${latestReward.level}! Avattu ${latestReward.type}: ${latestReward.name}.`;
    showToast(message);
  }, [state.xpSystem.total]);

  const [seenMessages, setSeenMessages] = useState<Record<string, string>>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("nexus-seen-messages") ?? "null");
      if (saved && typeof saved === "object") return saved as Record<string, string>;
    } catch { /* use initial snapshot */ }
    return Object.fromEntries(state.conversations.map((conversation) => [
      conversation.id,
      conversation.messages.filter((message) => message.direction === "incoming").reduce((latest, message) => message.sentAt > latest ? message.sentAt : latest, ""),
    ]));
  });
  const unreadMessages = visibleConversations.reduce(
    (total, conversation) => total + conversation.messages.filter((message) => message.direction === "incoming" && message.sentAt > (seenMessages[conversation.id] ?? "")).length,
    0,
  );
  const previousUnread = useRef(unreadMessages);

  useEffect(() => {
    localStorage.setItem("nexus-seen-messages", JSON.stringify(seenMessages));
  }, [seenMessages]);

  useEffect(() => {
    if (activeSection !== "messages") return;
    setSeenMessages((current) => {
      let changed = false;
      const next = { ...current };
      visibleConversations.forEach((conversation) => {
        conversation.messages.forEach((message) => {
          if (message.direction === "incoming" && message.sentAt > (next[conversation.id] ?? "")) {
            next[conversation.id] = message.sentAt;
            changed = true;
          }
        });
      });
      return changed ? next : current;
    });
  }, [activeSection, visibleConversations]);

  useEffect(() => {
    if (unreadMessages > previousUnread.current && state.notificationsEnabled) {
      showToast(getLocale() === "en-GB" ? "You have a new message." : "Sait uuden viestin.");
    }
    previousUnread.current = unreadMessages;
  }, [unreadMessages]);

  useEffect(() => {
    const handleRouteChange = () => setActiveSection(readSectionFromHash());
    window.addEventListener("hashchange", handleRouteChange);
    return () => window.removeEventListener("hashchange", handleRouteChange);
  }, []);

  const totalLevel = getTotalLevel(state);
  const pageTitle = activeSection === "home"
    ? "Your universe, in sync"
    : activeSection === "creator"
      ? "Clippo"
    : activeSection === "clippo-online"
      ? "Clippo Klipit"
    : activeSection === "events"
      ? "Events & Calendar"
    : activeSection === "friends"
      ? "Kaverit"
    : activeSection === "challenges"
      ? "XP"
    : activeSection === "profile"
      ? "My Profile"
      : activeSection === "settings"
        ? "Settings"
        : activeSection.charAt(0).toUpperCase() + activeSection.slice(1);

  function showToast(message: string) {
    setToast(message);
  }

  function completeQuest(id: string) {
    const quest = state.quests.find((item) => item.id === id);
    if (!quest || quest.done) return;
    setState((current) => {
      const updated = {
        ...current,
        quests: current.quests.map((item) => item.id === id ? { ...item, done: true } : item),
      };
      return addActivity(updated, `Suoritit tehtävän: ${quest.label}`);
    });
    void recordLeagueActivity("challenge", `${new Date().toISOString().slice(0, 10)}:${id}`);
    showToast("Tehtävä valmis.");
  }

  function recordLeagueActivity(type: "challenge" | "project" | "community" | "collaboration", sourceId: string) {
    if (!creatorLeagueAccount) return;
    void submitCreatorLeagueActivity(type, sourceId).catch((error: unknown) => {
      showToast(error instanceof Error ? error.message : "Creator League -toimintoa ei voitu tallentaa.");
    });
  }

  function doActivity(track: ProgressionTrack, label: string) {
    setState((current) => addActivity({
      ...current,
      quests: track === "gaming"
        ? current.quests.map((quest) => quest.id === "game" ? { ...quest, done: true } : quest)
        : current.quests,
    }, label));
    showToast("Hienoa · toiminta tallennettu.");
  }

  function rewardWeeklyLeagueChallenge(challengeId: string) {
    const label = "Suoritit Creator League -viikkohaasteen";
    setState((current) => addActivity(
      awardXp(current, "creator", 25, `league-challenge:${challengeId}`, label, undefined, "action").state,
      label,
    ));
    showToast("Haaste suoritettu.");
  }

  function joinEvent(name: string) {
    if (state.joinedEvents.includes(name)) return;
    setState((current) => addActivity({
      ...current,
      joinedEvents: [...current.joinedEvents, name],
      events: current.events.map((event) => event.name === name ? { ...event, attendees: event.attendees + 1 } : event),
    }, `Ilmoittauduit tapahtumaan: ${name}`));
    showToast(`Ilmoittauduit: ${name}`);
  }

  function joinCommunity(id: string) {
    if (state.joinedCommunities.includes(id)) return;
    const community = state.communities.find((item) => item.id === id);
    if (!community) return;
    const preview = awardXp(state, "social", 10, `community:${id}`, "Liitytty yhteisöön", undefined, "community");
    recordLeagueActivity("community", id);
    setState((current) => {
      const joined = { ...current, joinedCommunities: [...current.joinedCommunities, id] };
      const rewarded = awardXp(joined, "social", 10, `community:${id}`, `Liitytty yhteisöön`, undefined, "community").state;
      return addActivity(rewarded, `Liityit yhteisöön: ${community.name}`);
    });
    showToast(preview.amountAwarded ? `Liityit yhteisöön ${community.name} · +10 Social XP` : `Liityit yhteisöön ${community.name}. XP-enimmäismäärä saavutettu.`);
  }

  function getCommunityRoster(current: NexusState, communityId: string): CommunityMember[] {
    const community = current.communities.find((item) => item.id === communityId);
    return current.communityRoster?.[communityId] ?? (community ? defaultCommunityRoster(community, current.profile.name) : []);
  }

  function moderateCommunity(communityId: string, update: (roster: CommunityMember[]) => CommunityMember[], notice: string) {
    setState((current) => {
      const before = getCommunityRoster(current, communityId);
      const roster = update(before);
      const removed = before.length - roster.length;
      const systemMessage = { id: crypto.randomUUID(), author: "Järjestelmä", text: notice, sentAt: new Date().toISOString(), own: false, system: true };
      return {
        ...current,
        communityRoster: { ...current.communityRoster, [communityId]: roster },
        communities: removed > 0 ? current.communities.map((item) => item.id === communityId ? { ...item, members: Math.max(1, item.members - removed) } : item) : current.communities,
        communityChats: { ...current.communityChats, [communityId]: [...(current.communityChats?.[communityId] ?? []), systemMessage].slice(-200) },
      };
    });
  }

  function sendCommunityMessage(communityId: string, text: string) {
    const cleanText = text.trim().slice(0, 500);
    if (!cleanText || !state.joinedCommunities.includes(communityId)) return;
    const me = getCommunityRoster(state, communityId).find((member) => member.id === "me");
    if (me?.mutedUntil && Date.parse(me.mutedUntil) > Date.now()) {
      showToast("Sinulla on tauko tässä yhteisössä, et voi lähettää viestejä.");
      return;
    }
    const message = { id: crypto.randomUUID(), author: state.profile.name, text: cleanText, sentAt: new Date().toISOString(), own: true };
    setState((current) => ({
      ...current,
      communityChats: {
        ...current.communityChats,
        [communityId]: [...(current.communityChats?.[communityId] ?? []), message].slice(-200),
      },
    }));
  }

  function replaceOnlineConversation(updated: ConversationEntry) {
    setOnlineMessages((current) => ({
      ...current,
      conversations: [updated, ...current.conversations.filter((item) => item.id !== updated.id)]
        .sort((first, second) => (second.messages[second.messages.length - 1]?.sentAt ?? "").localeCompare(first.messages[first.messages.length - 1]?.sentAt ?? "")),
    }));
  }

  async function beginOnlineConversation(friendId: string) {
    const conversation = await startCreatorLeagueConversation(friendId);
    replaceOnlineConversation(conversation);
    return conversation;
  }

  function sendMessage(conversationId: string, text: string) {
    const cleanText = text.trim();
    if (!cleanText) return;
    const conversation = visibleConversations.find((item) => item.id === conversationId);
    if (!conversation) {
      showToast("Keskustelua ei löytynyt.");
      return;
    }
    if (conversation.online) {
      void sendCreatorLeagueMessage(conversationId, cleanText).then((updated) => {
        replaceOnlineConversation(updated);
        const message = updated.messages[updated.messages.length - 1];
        if (!message) throw new Error("Palvelin ei palauttanut lähetettyä viestiä.");
        const current = latestState.current;
        const xpAwarded = awardXp(current, "social", 2, `message:${message.id}`, "Lähetetty viesti", { counter: "messages", limit: 20 }, "message").amountAwarded;
        setState((latest) => {
          const withMessage = {
            ...latest,
            conversations: latest.conversations.map((item) => item.id === conversationId
              ? { ...item, messages: [...item.messages, message].slice(-100) }
              : item),
          };
          return addActivity(awardXp(
            withMessage,
            "social",
            2,
            `message:${message.id}`,
            "Lähetetty viesti",
            { counter: "messages", limit: 20 },
            "message",
          ).state, `Lähetit viestin: ${conversation.name}`);
        });
        showToast(xpAwarded
          ? "Viesti lähetetty · +2 Social XP"
          : (current.xpSystem.days[getLocalDateKey()]?.messages ?? 0) >= 20
            ? "Viesti lähetetty · päivän viestien XP-raja täynnä"
            : "Viesti lähetetty, mutta XP-enimmäismäärä saavutettu.");
      }).catch((error: unknown) => showToast(error instanceof Error ? error.message : "Verkkoviestiä ei voitu lähettää."));
      return;
    }

    const message = {
      id: crypto.randomUUID(),
      text: cleanText,
      sentAt: new Date().toISOString(),
      direction: "outgoing" as const,
    };
    if (conversation.isGroup) recordLeagueActivity("collaboration", message.id);
    const xpAwarded = awardXp(state, "social", 2, `message:${message.id}`, "Lähetetty viesti", { counter: "messages", limit: 20 }, "message").amountAwarded;
    setState((current) => {
    const withMessage = {
        ...current,
        conversations: current.conversations.map((item) => item.id === conversationId
          ? { ...item, messages: [...item.messages, message].slice(-100) }
          : item),
      };
      const updated = awardXp(
        withMessage,
        "social",
        2,
        `message:${message.id}`,
        "Lähetetty viesti",
        { counter: "messages", limit: 20 },
        "message",
      ).state;
      return addActivity(updated, `Lähetit viestin: ${conversation.name}`);
    });
    showToast(xpAwarded
      ? "Viesti lähetetty · +2 Social XP"
      : (state.xpSystem.days[getLocalDateKey()]?.messages ?? 0) >= 20
        ? "Viesti lähetetty · päivän viestien XP-raja täynnä"
        : "Viesti lähetetty, mutta XP-enimmäismäärä saavutettu.");
  }

  function toggleMessageReaction(conversationId: string, messageId: string, emoji: string) {
    if (visibleConversations.find((item) => item.id === conversationId)?.online) {
      void toggleCreatorLeagueMessageReaction(conversationId, messageId, emoji)
        .then(replaceOnlineConversation)
        .catch((error: unknown) => showToast(error instanceof Error ? error.message : "Reaktiota ei voitu tallentaa."));
      return;
    }
    setState((current) => ({
        ...current,
        conversations: current.conversations.map((conversation) => conversation.id !== conversationId ? conversation : {
          ...conversation,
          messages: conversation.messages.map((message) => {
            if (message.id !== messageId) return message;
            const reactions = message.reactions ?? [];
            return {
              ...message,
              reactions: reactions.includes(emoji)
                ? reactions.filter((reaction) => reaction !== emoji)
                : [...reactions, emoji].slice(-8),
            };
          }),
        }),
    }));
  }

  function editMessage(conversationId: string, messageId: string, text: string) {
    const cleanText = text.trim();
    if (!cleanText) return;
    if (visibleConversations.find((item) => item.id === conversationId)?.online) {
      void editCreatorLeagueMessage(conversationId, messageId, cleanText)
        .then(replaceOnlineConversation)
        .catch((error: unknown) => showToast(error instanceof Error ? error.message : "Viestiä ei voitu muokata."));
      return;
    }
    setState((current) => ({
      ...current,
      conversations: current.conversations.map((conversation) => conversation.id !== conversationId ? conversation : {
        ...conversation,
        messages: conversation.messages.map((message) => message.id === messageId && message.direction === "outgoing"
          ? { ...message, text: cleanText }
          : message),
      }),
    }));
  }

  function deleteMessage(conversationId: string, messageId: string) {
    if (visibleConversations.find((item) => item.id === conversationId)?.online) {
      void deleteCreatorLeagueMessage(conversationId, messageId)
        .then(replaceOnlineConversation)
        .catch((error: unknown) => showToast(error instanceof Error ? error.message : "Viestiä ei voitu poistaa."));
      return;
    }
    setState((current) => ({
      ...current,
      conversations: current.conversations.map((conversation) => {
        if (conversation.id !== conversationId) return conversation;
        const message = conversation.messages.find((item) => item.id === messageId);
        const isGroupModerator = Boolean(conversation.isGroup
          && (conversation.createdBy === current.profile.username || conversation.admins?.includes(current.profile.username)));
        if (!message || (message.direction !== "outgoing" && !isGroupModerator)) return conversation;
        return { ...conversation, messages: conversation.messages.filter((message) => message.id !== messageId) };
      }),
    }));
  }

  function awardStoryXp(storyId: string, isVideo: boolean) {
    const socialPreview = awardXp(state, "social", 10, `story:${storyId}`, "Julkaistu oma tarina", undefined, "story");
    const creatorPreview = isVideo
      ? awardXp(socialPreview.state, "creator", 25, `video:${storyId}`, "Julkaistu videotarina", { counter: "videos", limit: 2 }, "video-story")
      : null;
    setState((current) => {
      let updated = awardXp(current, "social", 10, `story:${storyId}`, "Julkaistu oma tarina", undefined, "story").state;
      if (isVideo) updated = awardXp(
        updated,
        "creator",
        25,
        `video:${storyId}`,
        "Julkaistu videotarina",
        { counter: "videos", limit: 2 },
        "video-story",
      ).state;
      return addActivity(updated, isVideo ? "Julkaisit videotarina" : "Julkaisit tarinan");
    });
    const awardedText = [
      socialPreview.amountAwarded ? `+${socialPreview.amountAwarded} Social XP` : "",
      creatorPreview?.amountAwarded ? `+${creatorPreview.amountAwarded} Creator XP` : "",
    ].filter(Boolean).join(" ja ");
    showToast(awardedText ? `Tarina julkaistu · ${awardedText}.` : "Tarina julkaistu, mutta XP-enimmäismäärä saavutettu.");
  }

  function addGame(name: string) {
    const cleanName = name.trim();
    if (!cleanName) return;
    if (state.games.some((game) => game.name.toLocaleLowerCase() === cleanName.toLocaleLowerCase())) {
      showToast("Tämä peli on jo kirjastossasi.");
      return;
    }
    setState((current) => addActivity({
      ...current,
      games: [...current.games, {
        id: crypto.randomUUID(),
        name: cleanName,
        status: "backlog",
        progress: 0,
        sessions: 0,
      }],
    }, `Lisäsit pelin kirjastoosi: ${cleanName}`));
    showToast(`${cleanName} lisättiin pelikirjastoosi.`);
  }

  function playGame(id: string) {
    const game = state.games.find((item) => item.id === id);
    if (!game) return;
    setState((current) => addActivity({
      ...current,
      games: current.games.map((item) => item.id === id
        ? { ...item, sessions: item.sessions + 1, progress: Math.min(100, item.progress + 2), status: item.progress + 2 >= 100 ? "completed" : "playing" }
        : item),
      quests: current.quests.map((quest) => quest.id === "game" ? { ...quest, done: true } : quest),
    }, `Pelattu peliä ${game.name}`));
    showToast("Pelikirja päivitetty.");
  }

  function createDraft(draft: Pick<CreatorDraft, "title" | "type">) {
    if (!draft.title.trim()) return;
    const item: CreatorDraft = { ...draft, id: crypto.randomUUID(), title: draft.title.trim(), body: "", updatedAt: "Juuri nyt" };
    setState((current) => addActivity({ ...current, creatorDrafts: [item, ...current.creatorDrafts] }, `Aloitit uuden ${item.type.toLowerCase()}-luonnoksen`));
    showToast(`${draft.type}-luonnos luotu.`);
  }

  function removeDraft(id: string) {
    const draft = state.creatorDrafts.find((item) => item.id === id);
    if (!draft) return;
    setState((current) => addActivity({
      ...current,
      creatorDrafts: current.creatorDrafts.filter((item) => item.id !== id),
    }, `Poistit luonnoksen: ${draft.title}`));
    showToast("Luonnos poistettu.");
  }

  async function publishCreatorVideo(id: string, file: File) {
    const draft = state.creatorDrafts.find((item) => item.id === id);
    if (!draft || draft.type !== "Video" || !file.type.startsWith("video/")) {
      showToast("Valitse videoluonnos ja kelvollinen videotiedosto.");
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      showToast("Videon enimmäiskoko on 100 Mt.");
      return;
    }
    if (state.creatorPosts.some((post) => post.id === id)) {
      showToast("Tämä video on jo julkaistu.");
      return;
    }

    const xpPreview = awardXp(
      state,
      "creator",
      25,
      `creator-publish:${id}`,
      "Julkaistu Creator Studio -video",
      { counter: "videos", limit: 2 },
      "creator-publish",
    );
    const post: CreatorPublishedPost = {
      id,
      title: draft.title,
      body: draft.body,
      mediaName: file.name,
      createdAt: new Date().toISOString(),
      gameId: draft.gameId,
    };

    try {
      await saveCreatorVideo(id, file);
      setState((current) => {
        if (!current.creatorDrafts.some((item) => item.id === id) || current.creatorPosts.some((item) => item.id === id)) {
          return current;
        }
        const published = {
          ...current,
          creatorDrafts: current.creatorDrafts.filter((item) => item.id !== id),
          creatorPosts: [post, ...current.creatorPosts],
        };
        return addActivity(
          awardXp(
            published,
            "creator",
            25,
            `creator-publish:${id}`,
            "Julkaistu Creator Studio -video",
            { counter: "videos", limit: 2 },
            "creator-publish",
          ).state,
          `Julkaisit Creator-videon: ${draft.title}`,
        );
      });
      showToast(xpPreview.amountAwarded
        ? `Video julkaistu · +${xpPreview.amountAwarded} Creator XP`
        : (state.xpSystem.days[getLocalDateKey()]?.videos ?? 0) >= 2
          ? "Video julkaistu · päivän Creator-videoiden XP-raja täynnä"
          : "Video julkaistu, mutta XP-enimmäismäärä saavutettu.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Videon julkaiseminen epäonnistui.";
      console.error("Creator-videon paikallinen tallennus epäonnistui.", error);
      showToast(message);
      throw error;
    }
  }

  function createProject(name: string) {
    const cleanName = name.trim();
    if (!cleanName) return;
    const project: ProjectEntry = { id: crypto.randomUUID(), name: cleanName, detail: "Oma projekti · 1 jäsen", tasks: [] };
    recordLeagueActivity("project", project.id);
    setState((current) => addActivity({ ...current, projects: [...current.projects, project] }, `Loi projektin: ${cleanName}`));
    showToast("Projekti luotu.");
  }

  function createCommunity(name: string, category: string) {
    const cleanName = name.trim();
    if (!cleanName) return;
    if (state.communities.filter((item) => item.owned).length >= MAX_OWN_COMMUNITIES) {
      showToast(`Voit luoda enintään ${MAX_OWN_COMMUNITIES} yhteisöä.`);
      return;
    }
    const community = { id: crypto.randomUUID(), name: cleanName, category, members: DEMO_COMMUNITY_MEMBERS.length + 1, owned: true };
    const preview = awardXp(state, "social", 10, `community:${community.id}`, "Liitytty yhteisöön", undefined, "community");
    setState((current) => {
      const created = {
        ...current,
        communities: [community, ...current.communities],
        joinedCommunities: [...current.joinedCommunities, community.id],
      };
      const rewarded = awardXp(created, "social", 10, `community:${community.id}`, "Liitytty yhteisöön", undefined, "community").state;
      return addActivity(rewarded, `Loi yhteisön: ${cleanName}`);
    });
    showToast(preview.amountAwarded ? "Yhteisö luotu · +10 Social XP" : "Yhteisö luotu, mutta XP-enimmäismäärä saavutettu.");
  }

  function createEvent(event: Omit<NexusEvent, "id" | "attendees">) {
    const eventDate = new Date(event.startsAt);
    if (!event.name.trim() || Number.isNaN(eventDate.getTime())) {
      showToast("Anna tapahtumalle nimi ja kelvollinen ajankohta.");
      return;
    }
    const newEvent: NexusEvent = { ...event, id: crypto.randomUUID(), name: event.name.trim(), startsAt: eventDate.toISOString(), attendees: 1 };
    setState((current) => addActivity({
      ...current,
      events: [newEvent, ...current.events],
      joinedEvents: [...current.joinedEvents, newEvent.name],
    }, `Loi tapahtuman: ${newEvent.name}`));
    showToast("Tapahtuma luotu.");
  }

  function startTrackPrestige(track: ProgressionTrack) {
    if (!canPrestige(latestState.current, track)) return;
    const round = getPrestigeCount(latestState.current, track) + 1;
    const reward = getPrestigeReward(track, round);
    setState((current) => addActivity(startPrestige(current, track), `Aloitit ${trackNames[track]} Prestige ${round} -kierroksen`));
    showToast(getLocale() === "en-GB"
      ? `Prestige ${round} started! Unlocked ${reward.rarity} title: ${reward.title}.`
      : `Prestige ${round} alkoi! Avasit ${reward.rarity}-tittelin: ${reward.title}.`);
  }

  function updateEvent(id: string, patch: Partial<NexusEvent>) {
    setState((current) => ({ ...current, events: current.events.map((event) => event.id === id ? { ...event, ...patch } : event) }));
  }

  function deleteEvent(id: string) {
    setState((current) => ({ ...current, events: current.events.filter((event) => event.id !== id) }));
    showToast(getLocale() === "en-GB" ? "Event deleted." : "Tapahtuma poistettu.");
  }

  function exportData() {
    const file = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = "nexus-backup.json";
    link.click();
    URL.revokeObjectURL(url);
    showToast("NEXUS-varmuuskopio ladattu.");
  }

  async function importData(file?: File) {
    setImportError("");
    if (!file) return;
    try {
      const value: unknown = JSON.parse(await file.text());
      if (!isNexusState(value)) throw new Error("Tiedosto ei ole kelvollinen NEXUS-varmuuskopio.");
      setState(normalizeNexusState(normalizeLegacyTitle(value)));
      showToast("Varmuuskopio palautettu.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Tiedostoa ei voitu lukea.";
      setImportError(message);
      showToast("Varmuuskopion tuonti epäonnistui.");
    }
  }

  async function submitAccountAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAccountAuthError("");
    setAccountAuthSubmitting(true);
    try {
      const email = accountEmail.trim();
      const displayName = accountDisplayName.trim() || email.split("@")[0];
      const account = await authenticateCreatorLeague(accountAuthMode, {
        email,
        password: accountPassword,
        ...(accountAuthMode === "register" ? { displayName } : {}),
      });
      const remoteState = await getCreatorAccountState();
      let restored = state;
      if (remoteState !== null) {
        if (!isNexusState(remoteState)) throw new Error("Tilille tallennettu sovellustila ei kelpaa. Paikallinen varmuuskopio säilyy tässä selaimessa.");
        restored = normalizeNexusState(normalizeLegacyTitle(remoteState));
      } else {
        restored = normalizeNexusState({
          ...state,
          profile: { ...state.profile, name: displayName },
        });
        await saveCreatorAccountState(restored);
      }
      setState(restored);
      latestState.current = restored;
      setCreatorLeagueAccount(account);
      setAccountDataReady(true);
      setAccountPassword("");
      setAccountAuthError("");
    } catch (error) {
      setAccountAuthError(error instanceof Error ? error.message : "Tiliin ei voitu kirjautua.");
    } finally {
      setAccountAuthSubmitting(false);
    }
  }

  async function signOutAccount() {
    try {
      await logoutCreatorLeague();
      setCreatorLeagueAccount(null);
      setAccountDataReady(false);
      setOnlineMessages({ friends: [], conversations: [] });
      setAccountAuthMode("login");
      setAccountAuthError("");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Uloskirjautuminen epäonnistui.");
    }
  }

  const setPage = (section: SectionId) => {
    if (window.location.hash !== `#${section}`) window.history.pushState(null, "", `#${section}`);
    setActiveSection(section);
    setMobileOpen(false);
    setSearch("");
  };

  if (creatorLeagueAccountLoading) {
    return <main className="account-gate"><section className="account-gate-card"><div className="brand-mark"><span>N</span><i /></div><h1>NEXUS</h1><p>Tarkistetaan tiliä ja ladataan tallennettuja tietoja…</p></section></main>;
  }

  if (!creatorLeagueAccount || !accountDataReady) {
    return <main className="account-gate">
      <form className="account-gate-card" onSubmit={(event) => void submitAccountAuth(event)}>
        <div className="brand-mark"><span>N</span><i /></div>
        <span className="eyebrow">YOUR UNIVERSE, IN SYNC</span>
        <h1>{accountAuthMode === "register" ? "Luo NEXUS-tili" : "Kirjaudu NEXUS-tilille"}</h1>
        <p>{accountAuthMode === "register"
          ? "Luo tili sähköpostilla ja salasanalla. Sovelluksen tiedot tallennetaan tilillesi, jotta voit käyttää niitä myös toisella laitteella."
          : "Kirjaudu sisään sähköpostilla ja salasanalla avataksesi tilisi tiedot."}</p>
        {accountAuthMode === "register" && <label>Nimi (valinnainen)<input autoComplete="name" maxLength={40} value={accountDisplayName} onChange={(event) => setAccountDisplayName(event.target.value)} placeholder="Nimesi" /></label>}
        <label>Sähköposti<input type="email" autoComplete="email" required maxLength={254} value={accountEmail} onChange={(event) => setAccountEmail(event.target.value)} placeholder="sinä@example.com" /></label>
        <label>Salasana<input type="password" autoComplete={accountAuthMode === "register" ? "new-password" : "current-password"} required minLength={accountAuthMode === "register" ? 12 : 1} maxLength={128} value={accountPassword} onChange={(event) => setAccountPassword(event.target.value)} placeholder={accountAuthMode === "register" ? "Vähintään 12 merkkiä" : "Salasana"} /></label>
        {accountAuthError && <p className="account-gate-error" role="alert">{accountAuthError}</p>}
        <button className="button button-primary account-gate-submit" type="submit" disabled={accountAuthSubmitting}>
          {accountAuthSubmitting ? "Käsitellään…" : accountAuthMode === "register" ? "Luo tili ja jatka" : "Kirjaudu sisään"}
        </button>
        <button className="text-button account-gate-switch" type="button" disabled={accountAuthSubmitting} onClick={() => {
          setAccountAuthError("");
          setAccountAuthMode((mode) => mode === "register" ? "login" : "register");
        }}>{accountAuthMode === "register" ? "Onko sinulla jo tili? Kirjaudu sisään" : "Uusi käyttäjä? Luo tili"}</button>
        <small>Salasana tallennetaan palvelimelle suojattuna tiivisteenä, ei selväkielisenä.</small>
      </form>
    </main>;
  }

  return (
    <div key={language} className={`app-shell theme-${state.theme}${state.compactMode ? " compact-mode" : ""} bg-${getPreferences(state).background} font-${getPreferences(state).font} text-${getPreferences(state).textSize}`} style={themeStyle(getThemeColors(state))}>
      <aside className={`sidebar${mobileOpen ? " sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark"><span>N</span><i /></div>
          <span className="brand-name">NEXUS</span>
          <span className="brand-beta">BETA</span>
          <button className="icon-button sidebar-close" onClick={() => setMobileOpen(false)} aria-label="Sulje navigaatio"><X size={18} /></button>
        </div>
        <div className="workspace-switch">
          <span className="workspace-icon">J</span>
          <span className="workspace-copy"><strong>{state.profile.name}{language === "en" ? "'s space" : " – työtila"}</strong><small>Personal workspace</small></span>
          <ChevronRight size={15} className="workspace-chevron" />
        </div>
        <nav className="primary-nav" aria-label="Päänavigaatio">
          {navigation.map((group) => (
            <div className="nav-group" key={group.label}>
              <span className="nav-group-title">{group.label}</span>
              {group.items.map((item) => {
                const Icon = iconByName[item.icon as keyof typeof iconByName];
                return (
                  <button
                    className={`nav-item${activeSection === item.id ? " active" : ""}`}
                    key={item.id}
                    aria-label={item.label}
                    title={item.label}
                    onClick={() => setPage(item.id)}
                  >
                    <Icon size={18} strokeWidth={1.8} />
                    <span>{item.label}</span>
                    {item.id === "messages" && state.notificationsEnabled && unreadMessages > 0 && <span className="nav-badge">{unreadMessages > 99 ? "99+" : unreadMessages}</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-level">
            <div className="sidebar-level-head"><span><Sparkles size={14} /> ONE AETHER LEVEL</span><strong>{totalLevel}<small>/{MAX_TOTAL_LEVEL}</small></strong></div>
            <div className="level-track"><span style={{ width: `${(totalLevel / MAX_TOTAL_LEVEL) * 100}%` }} /></div>
            <button className="sidebar-level-link" onClick={() => setPage("progression")}>Katso eteneminen <ArrowUpRight size={13} /></button>
          </div>
          <button className={`nav-item${activeSection === "profile" ? " active" : ""}`} aria-label="My Profile" title="My Profile" onClick={() => setPage("profile")}><div className="avatar avatar-small"><AvatarFace state={state} /></div><span>My Profile</span></button>
          <button className={`nav-item${activeSection === "settings" ? " active" : ""}`} aria-label="Settings" title="Settings" onClick={() => setPage("settings")}><Settings2 size={18} /><span>Settings</span></button>
          <div className="sidebar-account"><span className="online-dot" /><span title={creatorLeagueAccount.email}>{creatorLeagueAccount.email}</span><button type="button" className="text-button" onClick={() => void signOutAccount()}>Kirjaudu ulos</button></div>
          {accountCloudSaveError && <p className="account-gate-error" role="alert">{accountCloudSaveError}</p>}
        </div>
      </aside>

      {mobileOpen && <button className="mobile-backdrop" onClick={() => setMobileOpen(false)} aria-label="Sulje valikko" />}

      <main className="main-content">
        <header className="topbar">
          <div className="topbar-left">
            <button className="icon-button mobile-menu" onClick={() => setMobileOpen(true)} aria-label="Avaa navigaatio"><Menu size={20} /></button>
            <div className="breadcrumbs"><span>Workspace</span><ChevronRight size={14} /><strong>{pageTitle}</strong></div>
          </div>
          <div className="topbar-actions">
            <label className="search-box"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search anything..." aria-label="Haku" /><kbd>⌘ K</kbd></label>
            <button className="icon-button notification-button" onClick={() => { if (state.notificationsEnabled && unreadMessages > 0) setPage("messages"); else showToast(state.notificationsEnabled ? "Olet ajan tasalla — uusia ilmoituksia ei ole." : "Ilmoitukset on poistettu käytöstä asetuksissa."); }} aria-label="Ilmoitukset"><Bell size={18} />{state.notificationsEnabled && unreadMessages > 0 && <i />}</button>
            <button className="top-avatar" onClick={() => setPage("profile")} aria-label="Avaa profiili"><AvatarFace state={state} /></button>
          </div>
        </header>

        <div className="page-wrap">
          {activeSection === "home" && (
            <HomePage
              state={state}
              totalLevel={totalLevel}
              onPage={setPage}
              onQuest={completeQuest}
              onJoin={joinEvent}
              onPlayGame={playGame}
              search={search}
            />
          )}
          {activeSection === "discover" && <DiscoverPage onPage={setPage} onActivity={doActivity} search={search} />}
          {activeSection === "creator" && <CreatorPage state={state} onAccountChange={setCreatorLeagueAccount} onChallengeReward={rewardWeeklyLeagueChallenge} onCreate={createDraft} onDelete={removeDraft} onPublish={publishCreatorVideo} onUpdate={(id, changes) => setState((current) => ({ ...current, creatorDrafts: current.creatorDrafts.map((draft) => draft.id === id ? { ...draft, ...changes, updatedAt: "Juuri nyt" } : draft) }))} />}
          {activeSection === "clip-forge" && <ClipForgePage />}
          {activeSection === "clippo-online" && <ClippoOnlinePage state={state} />}
          {activeSection === "gaming" && <GamingPage state={state} onAddGame={addGame} onPlayGame={playGame} onActivity={doActivity} />}
          {activeSection === "communities" && <CommunitiesPage state={state} onJoin={joinCommunity} onCreate={createCommunity} onSend={sendCommunityMessage} onModerate={moderateCommunity} getRoster={getCommunityRoster} onOpenMyProfile={() => setPage("profile")} />}
          {activeSection === "friends" && <FriendsPage state={state} onAdd={(friend) => {
            setState((current) => {
              const friends = current.friends ?? [];
              if (friends.some((item) => item.id === friend.id)) return current;
              return { ...current, friends: [...friends, friend] };
            });
            showToast(`${friend.name} lisättiin kavereihin.`);
          }} />}
          {activeSection === "projects" && <ProjectsPage state={state} onCreate={createProject} onAddTask={(projectId, title) => setState((current) => ({ ...current, projects: current.projects.map((project) => project.id === projectId ? { ...project, tasks: [...project.tasks, { id: crypto.randomUUID(), title: title.trim(), status: "todo" as const }] } : project) }))} onMoveTask={(projectId, taskId) => setState((current) => {
            let completed = false;
            const projects = current.projects.map((project) => project.id === projectId ? {
              ...project,
              tasks: project.tasks.map((task) => {
                if (task.id !== taskId) return task;
                const next: ProjectTask["status"] = task.status === "todo" ? "inProgress" : task.status === "inProgress" ? "done" : "todo";
                completed = next === "done";
                return { ...task, status: next };
              }),
            } : project);
            const updated = { ...current, projects };
            return completed ? addActivity({
              ...updated,
              quests: updated.quests.map((quest) => quest.id === "project" ? { ...quest, done: true } : quest),
            }, "Suoritit projektitehtävän") : updated;
          })} />}
          {activeSection === "events" && <EventsPage state={state} onJoin={joinEvent} onCreate={createEvent} onUpdate={updateEvent} onDelete={deleteEvent} />}
          {activeSection === "challenges" && <XpProgressPage state={state} onPrestige={startTrackPrestige} />}
          {activeSection === "messages" && <MessagesPage state={messageState} onlineAccount={creatorLeagueAccount} onlineAccountLoading={creatorLeagueAccountLoading} onlineFriends={onlineMessages.friends} onlineMessagesError={onlineMessagesError} onStartOnlineConversation={beginOnlineConversation} onNavigateToCreator={() => setPage("creator")} onSendMessage={sendMessage} onCreateGroup={(group) => setState((current) => ({ ...current, conversations: [group, ...current.conversations] }))} onUpdateGroup={(groupId, updates) => setState((current) => ({
            ...current,
            conversations: current.conversations.map((conversation) => conversation.id === groupId && conversation.isGroup
              ? { ...conversation, ...updates }
              : conversation),
          }))} onToggleReaction={toggleMessageReaction} onEditMessage={editMessage} onDeleteMessage={deleteMessage} onStoryCreated={awardStoryXp} onToast={showToast} />}
          {activeSection === "progression" && <ProgressionPage state={state} totalLevel={totalLevel} />}
          {activeSection === "profile" && <ProfilePage state={state} totalLevel={totalLevel} onActivity={doActivity} onEdit={() => setPage("settings")} onSetBanner={(bannerImage) => setState((current) => ({ ...current, profile: { ...current.profile, bannerImage } }))} onSetState={setState} onSelectLeagueFrame={(frame) => setState((current) => ({ ...current, profile: { ...current.profile, leagueBronzeFrame: frame } }))} />}
          {activeSection === "settings" && (
            <ThemeEditorContext.Provider value={{
              colors: getThemeColors(state),
              onChange: (key, value) => setState((current) => ({ ...current, themeColors: { ...getThemeColors(current), [key]: value } })),
              onReset: () => {
                setState((current) => ({ ...current, themeColors: defaultThemeColors }));
                showToast("Teeman oletusvärit palautettu.");
              },
            }}>
              <SettingsPage
                state={state}
                setState={setState}
                onExport={exportData}
                onImport={importData}
                importError={importError}
                onToast={showToast}
              />
            </ThemeEditorContext.Provider>
          )}
          <footer className="page-footer"><span>Made for your universe.</span><span>NEXUS <b>·</b> Local-first experience <b>·</b> v0.1</span></footer>
        </div>
      </main>
      {toast && <div className="toast" role="status"><CheckCircle2 size={17} />{toast}<button onClick={() => setToast("")} aria-label="Sulje ilmoitus"><X size={15} /></button></div>}
    </div>
  );
}

function PageHeading({ eyebrow, title, subtitle, action }: { eyebrow: string; title: string; subtitle: string; action?: ReactNode }) {
  return <div className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{subtitle}</p></div>{action && <div className="heading-action">{action}</div>}</div>;
}

function ProgressCard({ track, level, xp = 0, onClick }: { track: ProgressionTrack; level: number; xp?: number; onClick?: () => void }) {
  return (
    <div className={`progress-card ${trackColors[track]}`}>
      <div className="progress-card-top"><span className={`track-icon ${track}`}><Sparkles size={15} /></span><span className="progress-card-name">{trackNames[track]}</span>{onClick ? <button className="mini-more" onClick={onClick} aria-label={`Näytä ${trackNames[track]}-eteneminen`}><ArrowUpRight size={15} /></button> : <span className="mini-more" aria-hidden="true"><ArrowUpRight size={15} /></span>}</div>
      <div className="progress-number">{level}<span> / {MAX_CATEGORY_LEVEL}</span></div>
      <div className="progress-bar"><span style={{ width: `${level >= MAX_CATEGORY_LEVEL ? 100 : (xp / XP_PER_LEVEL) * 100}%` }} /></div>
      <div className="progress-card-foot"><span>{level >= MAX_CATEGORY_LEVEL ? "Maksimitaso saavutettu" : `${xp} / ${XP_PER_LEVEL} XP seuraavaan leveliin`}</span><span>{level} / {MAX_CATEGORY_LEVEL}</span></div>
    </div>
  );
}

function formatConversationTime(timestamp?: string): string {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  const isToday = getLocalDateKey(date.getTime()) === getLocalDateKey();
  return isToday
    ? new Intl.DateTimeFormat(getLocale(), { hour: "2-digit", minute: "2-digit" }).format(date)
    : new Intl.DateTimeFormat(getLocale(), { day: "numeric", month: "short" }).format(date);
}

const CALL_HISTORY_STORAGE_KEY = "nexus.call-history.v1";
type CallOutcome = "completed" | "missed";
interface CallHistoryEntry {
  id: string;
  conversationId: string;
  contactName: string;
  mode: CallMode;
  startedAt: string;
  durationSeconds: number;
  outcome: CallOutcome;
}

function readCallHistory(): { entries: CallHistoryEntry[]; error: string } {
  try {
    const raw = localStorage.getItem(CALL_HISTORY_STORAGE_KEY);
    if (raw === null) return { entries: [], error: "" };
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value) || value.length > 100) throw new TypeError("Puheluhistorian tiedot ovat virheellisiä.");
    const entries = value.map((item): CallHistoryEntry => {
      if (!isObjectRecord(item) ||
        typeof item.id !== "string" ||
        typeof item.conversationId !== "string" ||
        typeof item.contactName !== "string" ||
        (item.mode !== "audio" && item.mode !== "video") ||
        typeof item.startedAt !== "string" ||
        !Number.isFinite(Date.parse(item.startedAt)) ||
        !isNonNegativeSafeInteger(item.durationSeconds) ||
        (item.outcome !== "completed" && item.outcome !== "missed")) {
        throw new TypeError("Puheluhistorian tiedot ovat virheellisiä.");
      }
      return {
        id: item.id,
        conversationId: item.conversationId,
        contactName: item.contactName,
        mode: item.mode,
        startedAt: item.startedAt,
        durationSeconds: item.durationSeconds,
        outcome: item.outcome,
      };
    });
    return { entries, error: "" };
  } catch (error) {
    return {
      entries: [],
      error: error instanceof Error ? error.message : "Puheluhistoriaa ei voitu lukea.",
    };
  }
}

function formatCallDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  return [hours, minutes, remainingSeconds]
    .map((part) => String(part).padStart(2, "0"))
    .slice(hours ? 0 : 1)
    .join(":");
}

function ConversationAvatar({ avatar, color, online = false }: { avatar: string; color: ConversationEntry["color"]; online?: boolean }) {
  const imageSource = avatar.trim();
  const isImage = imageSource.startsWith("data:image/");
  return <span className={`conversation-avatar conv-${color}${isImage ? " has-image" : ""}`}>
    {isImage ? <img src={imageSource} alt="" /> : avatar}
    {online && <i />}
  </span>;
}

function HomePage({ state, totalLevel, onPage, onQuest, onJoin, onPlayGame, search }: {
  state: NexusState;
  totalLevel: number;
  onPage: (section: SectionId) => void;
  onQuest: (id: string) => void;
  onJoin: (name: string) => void;
  onPlayGame: (id: string) => void;
  search: string;
}) {
  const filteredActivities = state.activities.filter((item) => item.label.toLowerCase().includes(search.toLowerCase()));
  const nextEvent = state.events.filter((event) => Date.parse(event.startsAt) >= Date.now()).sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))[0];
  const nextEventTime = nextEvent
    ? new Intl.DateTimeFormat(getLocale(), { weekday: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(nextEvent.startsAt))
    : "Ei tapahtumia";
  const totalXp = getTotalXp(state);
  const conversationPreviews = state.conversations.map((conversation) => {
    const latest = conversation.messages[conversation.messages.length - 1];
    return {
      conversation,
      message: latest?.text ?? "Aloita keskustelu",
      time: formatConversationTime(latest?.sentAt),
    };
  }).slice(0, 3);
  const today = new Date();
  const monthName = new Intl.DateTimeFormat(getLocale(), { month: "long", year: "numeric" }).format(today);
  const firstWeekday = (new Date(today.getFullYear(), today.getMonth(), 1).getDay() + 6) % 7;
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const calendarCells: (number | null)[] = [...Array<null>(firstWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, index) => index + 1)];
  const eventDays = new Set(state.events.map((event) => new Date(event.startsAt)).filter((date) => date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth()).map((date) => date.getDate()));
  return (
    <>
      <section className="welcome-row">
        <div><div className="eyebrow"><span className="status-pulse" /> {new Intl.DateTimeFormat(getLocale(), { weekday: "long", day: "numeric", month: "long" }).format(new Date()).toLocaleUpperCase(getLocale())}</div><h1>Hyvää {new Date().getHours() < 10 ? "huomenta" : new Date().getHours() < 18 ? "päivää" : "iltaa"}, {state.profile.name} <span className="wave">✦</span></h1><p>Valmis viemään universumiasi eteenpäin?</p></div>
        <button className="button button-primary" onClick={() => onPage("discover")}><Compass size={16} /> Tutki NEXUSia <ArrowRight size={15} /></button>
      </section>

      <section className="bento-grid">
        <button className="bento-card bento-xp" onClick={() => onPage("progression")} aria-label="Avaa eteneminen">
          <div className="bento-xp-ring"><svg viewBox="0 0 140 140" role="img" aria-label={`ONE AETHER Level ${totalLevel} / ${MAX_TOTAL_LEVEL}`}><circle className="ring-bg" cx="70" cy="70" r="59" /><circle className="ring-progress" cx="70" cy="70" r="59" style={{ strokeDasharray: `${(totalLevel / MAX_TOTAL_LEVEL) * 371} 371` }} /></svg><div className="ring-label"><span>LEVEL</span><strong>{totalLevel}</strong></div></div>
          <div className="bento-xp-main">
            <div className="eyebrow">ONE AETHER XP</div>
            <h2>{totalXp} XP kerätty</h2>
            <div className="progress-bar" role="progressbar" aria-valuemin={0} aria-valuemax={MAX_TOTAL_LEVEL} aria-valuenow={totalLevel}><span style={{ width: `${(totalLevel / MAX_TOTAL_LEVEL) * 100}%` }} /></div>
            <p>{totalLevel >= MAX_TOTAL_LEVEL ? "Maksimitaso saavutettu." : `Level ${totalLevel} / ${MAX_TOTAL_LEVEL} · ${MAX_TOTAL_LEVEL - totalLevel} tasoa maksimiin`}</p>
          </div>
        </button>

        <div className="bento-card bento-calendar">
          <div className="bento-head"><div><div className="eyebrow">KALENTERI</div><h2>{monthName}</h2></div><button className="icon-button subtle" onClick={() => onPage("events")} aria-label="Avaa tapahtumat"><ArrowUpRight size={16} /></button></div>
          <div className="mini-calendar" role="grid" aria-label={monthName}>
            {["Ma", "Ti", "Ke", "To", "Pe", "La", "Su"].map((day) => <span className="mini-cal-weekday" key={day}>{day}</span>)}
            {calendarCells.map((day, index) => day === null ? <span key={`blank-${index}`} /> : <span key={day} className={`mini-cal-day${day === today.getDate() ? " is-today" : ""}${eventDays.has(day) ? " has-event" : ""}`}>{day}</span>)}
          </div>
          <div className="bento-event-line">{nextEvent ? <><Clock3 size={13} /><span><strong>{nextEvent.name}</strong> · {nextEventTime}</span></> : <span>Ei tulevia tapahtumia</span>}</div>
          {nextEvent && <button className="event-join" onClick={() => onJoin(nextEvent.name)} disabled={state.joinedEvents.includes(nextEvent.name)}>{state.joinedEvents.includes(nextEvent.name) ? <><Check size={14} /> Olet mukana</> : <>Ilmoittaudu <ArrowRight size={14} /></>}</button>}
        </div>

        <div className="bento-card bento-messages">
          <div className="bento-head"><div><div className="eyebrow">UUDET VIESTIT</div><h2>Messages <span className="count-pill">{conversationPreviews.length}</span></h2></div><button className="icon-button subtle" onClick={() => onPage("messages")} aria-label="Avaa viestit"><ArrowUpRight size={16} /></button></div>
          <div className="bento-message-list">{conversationPreviews.map(({ conversation, message, time }) => <button className="conversation-row" key={conversation.id} onClick={() => onPage("messages")}><ConversationAvatar avatar={conversation.avatar} color={conversation.color} online={!conversation.isGroup} /><span className="conversation-copy"><strong>{conversation.name}</strong><small>{message}</small></span><span className="conversation-time">{time}</span></button>)}</div>
        </div>

        <div className="bento-card bento-quests">
          <div className="bento-head"><div><div className="eyebrow">PYSY LIIKKEESSÄ</div><h2>Today's quests <span className="count-pill">{state.quests.filter((quest) => quest.done).length}/{state.quests.length}</span></h2></div><button className="text-button" onClick={() => onPage("challenges")}>Kaikki <ArrowRight size={14} /></button></div>
          <div className="quest-list">{state.quests.map((quest) => <button className={`quest-row${quest.done ? " quest-done" : ""}`} key={quest.id} onClick={() => onQuest(quest.id)} disabled={quest.done}><span className={`quest-check${quest.done ? " checked" : ""}`}>{quest.done && <Check size={13} />}</span><span className="quest-label">{quest.label}</span></button>)}</div>
        </div>

        <div className="bento-card bento-streak">
          <Flame size={22} />
          <strong>{state.streakDays}</strong>
          <span>päivän putki</span>
        </div>
      </section>

      <section className="section-block">
        <div className="section-title-row"><div><div className="eyebrow">SINULLE VALITTU</div><h2>Pick up where you left off</h2></div><button className="text-button" onClick={() => onPage("gaming")}>Avaa Game Library <ArrowRight size={14} /></button></div>
        <div className="game-grid">{state.games.slice(0, 3).map((game, index) => {
          const palette = index % 3 === 0 ? "orange" : index % 3 === 1 ? "green" : "red";
          return <button className={`game-card game-${palette}`} key={game.id} onClick={() => onPlayGame(game.id)}><div className="game-art"><span className="game-art-label">{game.status.toUpperCase()}</span><span className="game-art-index">0{index + 1}</span><Gamepad2 size={30} /></div><div className="game-card-content"><div><strong>{game.name}</strong><span>{game.progress}% · {game.sessions} sessiota</span></div><ChevronRight size={16} /></div><div className="game-progress"><span style={{ width: `${game.progress}%` }} /></div></button>;
        })}</div>
      </section>

      <section className="dashboard-grid bottom-grid">
        <div className="panel activity-panel">
          <div className="panel-heading"><div><div className="eyebrow">UNIVERSUMISI LIIKE</div><h2>Recent activity</h2></div><button className="icon-button subtle" onClick={() => onPage("profile")} aria-label="Avaa profiili"><ArrowUpRight size={16} /></button></div>
          <div className="activity-list">{filteredActivities.length ? filteredActivities.slice(0, 3).map((item, index) => <div className="activity-row" key={item.id}><span className={`activity-dot dot-${index}`} /><span className="activity-text">{item.label}</span><span className="activity-time">{item.time}</span></div>) : <p className="empty-inline">Ei hakutuloksia aktiviteeteista.</p>}</div>
        </div>
        <div className="level-tip"><div className="tip-icon"><Sparkles size={17} /></div><span className="eyebrow">A LITTLE INSPIRATION</span><h3>Yksi teko. Yksi level.</h3><p>Jaa klippi, suorita haaste tai auta yhteisöäsi kasvamaan.</p><button className="text-button" onClick={() => onPage("creator")}>Tee jotain uutta <ArrowRight size={14} /></button></div>
      </section>
    </>
  );
}

function DiscoverPage({ onPage, onActivity, search }: { onPage: (section: SectionId) => void; onActivity: (track: ProgressionTrack, label: string) => void; search: string }) {
  const discovery = [
    { title: "Clippo", desc: "Sisältöä, joka inspiroi tekemään.", tag: "RISING CREATORS", icon: <Clapperboard size={20} />, section: "creator" as const },
    { title: "Gaming", desc: "Pelit, tavoitteet ja uudet haasteet.", tag: "PLAYER PICKS", icon: <Gamepad2 size={20} />, section: "gaming" as const },
    { title: "Communities", desc: "Löydä porukka, joka ymmärtää.", tag: "FIND YOUR PEOPLE", icon: <UsersRound size={20} />, section: "communities" as const },
    { title: "Projects", desc: "Rakenna jotain yhdessä.", tag: "OPEN COLLABS", icon: <FolderKanban size={20} />, section: "projects" as const },
  ];
  const matches = discovery.filter((item) => `${item.title} ${item.desc}`.toLowerCase().includes(search.toLowerCase()));
  return <><PageHeading eyebrow="EXPLORE THE NEXUS" title="Discover something new." subtitle="Löydä ihmiset, ideat ja seuraava juttu, johon haluat tarttua." action={<button className="button button-secondary" onClick={() => onPage("events")}><CalendarDays size={16} /> Tapahtumat</button>} /><section className="discover-feature"><div className="feature-copy"><span className="feature-tag"><Sparkles size={13} /> RISING THIS WEEK</span><h2>Good things are<br />happening here.</h2><p>Pienet creatorit, uudet projektit ja yhteisöt, jotka kannattaa tuntea.</p><button className="button button-primary" onClick={() => onActivity("social", "Tutustuit Rising-osioon")}>Tutustu nouseviin <ArrowRight size={15} /></button></div><div className="feature-art"><div className="feature-star star-a">✳</div><div className="feature-star star-b">✦</div><div className="feature-ribbon">RISING<br />TOGETHER</div></div></section><div className="section-title-row discover-heading"><div><div className="eyebrow">EXPLORE YOUR WAY</div><h2>Find your next thing</h2></div></div><section className="discover-grid">{matches.map((item, index) => <button className={`discover-card discover-${index}`} key={item.title} onClick={() => onPage(item.section)}><div className="discover-card-icon">{item.icon}</div><span className="eyebrow">{item.tag}</span><h3>{item.title}</h3><p>{item.desc}</p><span className="discover-arrow"><ArrowUpRight size={17} /></span></button>)}</section></>;
}

function OnlineClipsSection({ state, clips, loading, error }: {
  state: NexusState;
  clips: CreatorLeagueFeedItem[];
  loading: boolean;
  error: string;
}) {
  const [activeView, setActiveView] = useState<"games" | "general">("games");
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const gameNames = new Map(state.games.map((game) => [game.id, game.name]));
  const gameCounts = new Map<string, number>();
  clips.forEach((clip) => {
    const gameId = clip.gameId ?? "";
    gameCounts.set(gameId, (gameCounts.get(gameId) ?? 0) + 1);
  });
  const selectedClips = selectedGameId === null
    ? clips
    : clips.filter((clip) => (clip.gameId ?? "") === selectedGameId);

  return <section className="panel creator-online-clips">
    <div className="panel-heading">
      <div><div className="eyebrow">CLIPPO KLIPIT</div><h2>Pelaajien klipit</h2></div>
      <span className="soft-label">{clips.length} klippiä</span>
    </div>
    <p className="panel-copy">Katso muiden pelaajien julkaisemia klippejä pelin mukaan tai selaa kaikkia uusimpia videoita yleisestä syötteestä.</p>
    <div className="online-clips-tabs" role="tablist" aria-label="Online-klippien näkymä">
      <button type="button" role="tab" aria-selected={activeView === "games"} className={activeView === "games" ? "is-active" : ""} onClick={() => setActiveView("games")}>Pelit</button>
      <button type="button" role="tab" aria-selected={activeView === "general"} className={activeView === "general" ? "is-active" : ""} onClick={() => setActiveView("general")}>Yleinen syöte</button>
    </div>
    {error && <p className="creator-publish-error" role="alert">{error}</p>}
    {loading
      ? <p className="empty-inline">Ladataan online-klippejä…</p>
      : activeView === "games"
        ? clips.length
          ? <>
            <div className="online-game-list" aria-label="Pelit, joissa on klippejä">
              {[...gameCounts.entries()].map(([gameId, count]) => (
                <button type="button" key={gameId || "unassigned"} className={`online-game-button${selectedGameId === gameId ? " is-active" : ""}`} aria-pressed={selectedGameId === gameId} onClick={() => setSelectedGameId(selectedGameId === gameId ? null : gameId)}>
                  <Gamepad2 size={14} /><span>{gameId ? (gameNames.get(gameId) ?? "Muu peli") : "Peliä ei määritetty"}</span><small>{count}</small>
                </button>
              ))}
            </div>
            <div className="creator-online-grid">{selectedClips.map((clip) => <article className="creator-online-card" key={clip.id}>
              <video src={`/api/creator-league/feed/${encodeURIComponent(clip.id)}/media`} controls preload="metadata" />
              <div className="creator-online-card-copy">
                <strong>{clip.title}</strong>
                <span>{clip.creatorName}{clip.own ? " · Oma klippi" : ""}</span>
                <small>{clip.gameId ? (gameNames.get(clip.gameId) ?? "Muu peli") : "Peliä ei määritetty"} · {clip.metrics.views} katselua</small>
              </div>
            </article>)}</div>
          </>
          : <p className="empty-inline">Online-klippejä ei ole vielä julkaistu.</p>
        : clips.length
          ? <div className="creator-online-grid">{clips.map((clip) => <article className="creator-online-card" key={clip.id}>
            <video src={`/api/creator-league/feed/${encodeURIComponent(clip.id)}/media`} controls preload="metadata" />
            <div className="creator-online-card-copy">
              <strong>{clip.title}</strong>
              <span>{clip.creatorName}{clip.own ? " · Oma klippi" : ""}</span>
              <small>{clip.gameId ? (gameNames.get(clip.gameId) ?? "Muu peli") : "Peliä ei määritetty"} · {clip.metrics.views} katselua</small>
            </div>
          </article>)}</div>
          : <p className="empty-inline">Yleiseen syötteeseen ei ole vielä julkaistu videoita.</p>}
  </section>;
}

interface ForgeClip {
  id: string;
  name: string;
  url: string;
  duration: number;
  start: number;
  end: number;
}

function ClipForgePage() {
  const [clips, setClips] = useState<ForgeClip[]>([]);
  const [title, setTitle] = useState("");
  const [effect, setEffect] = useState<"none" | "mono" | "neon">("none");
  const [transition, setTransition] = useState<"none" | "fade">("fade");
  const [volume, setVolume] = useState(1);
  const [audioUrl, setAudioUrl] = useState("");
  const [rendering, setRendering] = useState(false);
  const [renderedUrl, setRenderedUrl] = useState("");
  const [error, setError] = useState("");
  const [selectedClipId, setSelectedClipId] = useState("");
  const [activeTool, setActiveTool] = useState("general");
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const previewRef = useRef<HTMLVideoElement>(null);
  const libraryInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => {
    clips.forEach((clip) => URL.revokeObjectURL(clip.url));
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    if (renderedUrl) URL.revokeObjectURL(renderedUrl);
  }, []);

  const addClips = async (files: FileList | null) => {
    if (!files?.length) return;
    setError("");
    const added = await Promise.all(Array.from(files).map(async (file) => {
      const url = URL.createObjectURL(file);
      const duration = await new Promise<number>((resolve) => {
        const probe = document.createElement("video");
        probe.preload = "metadata";
        probe.onloadedmetadata = () => { resolve(Number.isFinite(probe.duration) ? probe.duration : 0); };
        probe.onerror = () => { resolve(0); };
        probe.src = url;
      });
      return { id: crypto.randomUUID(), name: file.name, url, duration, start: 0, end: duration };
    }));
    if (!selectedClipId && added[0]) setSelectedClipId(added[0].id);
    setClips((current) => [...current, ...added]);
  };

  const moveClip = (index: number, direction: -1 | 1) => {
    setClips((current) => {
      const next = [...current];
      const target = index + direction;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };
  const updateClipTrim = (id: string, field: "start" | "end", value: number) => {
    setClips((current) => current.map((clip) => {
      if (clip.id !== id) return clip;
      const nextValue = Math.max(0, Math.min(clip.duration, value));
      return field === "start"
        ? { ...clip, start: Math.min(nextValue, clip.end - 0.05) }
        : { ...clip, end: Math.max(nextValue, clip.start + 0.05) };
    }));
  };

  const renderVideo = async () => {
    if (!clips.length || rendering) return;
    setRendering(true);
    setError("");
    setRenderedUrl("");
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 1280;
      canvas.height = 720;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Renderöintikanvasta ei voitu avata.");
      const canvasStream = canvas.captureStream(30);
      const audioContext = new AudioContext();
      const audioDestination = audioContext.createMediaStreamDestination();
      audioDestination.stream.getAudioTracks().forEach((track) => canvasStream.addTrack(track));
      const audio = audioUrl ? document.createElement("audio") : undefined;
      if (audio) {
        audio.src = audioUrl;
        audio.preload = "auto";
        audio.volume = volume;
        audio.crossOrigin = "anonymous";
        audioContext.createMediaElementSource(audio).connect(audioDestination);
      }
      const recorder = new MediaRecorder(canvasStream, { mimeType: "video/webm;codecs=vp9" });
      const chunks: Blob[] = [];
      recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
      const finished = new Promise<void>((resolve, reject) => {
        recorder.onstop = () => resolve();
        recorder.onerror = () => reject(new Error("Videon renderöinti epäonnistui."));
      });
      recorder.start();
      if (audio) void audio.play();
      const drawFrame = (video: HTMLVideoElement, opacity = 1) => {
        const scale = Math.max(canvas.width / video.videoWidth, canvas.height / video.videoHeight);
        const width = video.videoWidth * scale;
        const height = video.videoHeight * scale;
        context.save();
        context.globalAlpha = opacity;
        context.filter = effect === "mono" ? "grayscale(1)" : effect === "neon" ? "saturate(1.7) contrast(1.15)" : "none";
        context.fillStyle = "#080912";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(video, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
        if (title.trim()) {
          context.font = "700 42px Arial";
          context.textAlign = "center";
          context.fillStyle = "#ffffff";
          context.shadowColor = "#000000aa";
          context.shadowBlur = 12;
          context.fillText(title.trim(), canvas.width / 2, canvas.height - 54);
        }
        context.restore();
      };
      for (let index = 0; index < clips.length; index += 1) {
        const clip = clips[index];
        const video = document.createElement("video");
        video.src = clip.url;
        video.muted = false;
        video.volume = volume;
        video.playsInline = true;
        await new Promise<void>((resolve, reject) => {
          video.onloadedmetadata = () => resolve();
          video.onerror = () => reject(new Error(`Videota "${clip.name}" ei voitu ladata.`));
        });
        audioContext.createMediaElementSource(video).connect(audioDestination);
        video.currentTime = Math.min(clip.start, Math.max(0, video.duration - 0.05));
        await video.play();
        const endAt = Math.min(Number.isFinite(video.duration) ? video.duration : clip.duration, clip.end);
        while (video.currentTime < endAt - 0.04) {
          const remaining = endAt - video.currentTime;
          const fade = transition === "fade" && index > 0 && video.currentTime < 0.35 ? video.currentTime / 0.35 : 1;
          drawFrame(video, Math.min(1, fade));
          await new Promise((resolve) => window.setTimeout(resolve, Math.min(34, Math.max(12, remaining * 1000))));
        }
        video.pause();
      }
      recorder.stop();
      await finished;
      await audioContext.close();
      setRenderedUrl(URL.createObjectURL(new Blob(chunks, { type: "video/webm" })));
    } catch (renderError) {
      setError(renderError instanceof Error ? renderError.message : "Renderöinti epäonnistui.");
    } finally {
      setRendering(false);
    }
  };

  const selectedClip = clips.find((clip) => clip.id === selectedClipId) ?? clips[0];
  const previewVideo = previewRef.current;
  const togglePreview = () => {
    if (!previewVideo) return;
    if (previewVideo.paused) {
      void previewVideo.play();
      setIsPreviewPlaying(true);
    } else {
      previewVideo.pause();
      setIsPreviewPlaying(false);
    }
  };
  const seekPreview = (event: ChangeEvent<HTMLInputElement>) => {
    if (previewVideo) previewVideo.currentTime = Number(event.target.value);
  };

  return <><PageHeading eyebrow="CLIPPO · VIDEO WORKSHOP" title="Clip Forge" subtitle="Rakenna video samalla tavalla kuin oikeassa editointityökalussa." /><div className="clip-forge-editor"><div className="clip-forge-editor-main"><div className="clip-forge-workspace"><nav className="clip-forge-tool-rail" aria-label="Clip Forge työkalut"><button type="button" className={activeTool === "library" ? "is-active" : ""} onClick={() => { setActiveTool("library"); libraryInputRef.current?.click(); }}><Video size={18} /><span>Kirjasto</span></button><button type="button" className={activeTool === "text" ? "is-active" : ""} onClick={() => setActiveTool("text")}><span className="clip-forge-tool-glyph">T</span><span>Teksti</span></button><button type="button" className={activeTool === "effects" ? "is-active" : ""} onClick={() => setActiveTool("effects")}><Sparkles size={18} /><span>Efektit</span></button><button type="button" className={activeTool === "transitions" ? "is-active" : ""} onClick={() => setActiveTool("transitions")}><ChevronRight size={18} /><span>Siirtymät</span></button><button type="button" className={activeTool === "audio" ? "is-active" : ""} onClick={() => setActiveTool("audio")}><span className="clip-forge-tool-glyph">♪</span><span>Ääni</span></button></nav><div className="clip-forge-preview-stage">{selectedClip ?     <video key={selectedClip.id} ref={previewRef} className={`clip-forge-preview-video effect-${effect}`} src={selectedClip.url} onLoadedMetadata={(event) => { event.currentTarget.currentTime = selectedClip.start; event.currentTarget.volume = volume; }} onVolumeChange={(event) => setVolume(event.currentTarget.volume)} onPlay={() => setIsPreviewPlaying(true)} onPause={() => setIsPreviewPlaying(false)} playsInline controls /> : <div className="clip-forge-preview-empty"><Video size={34} /><strong>Esikatselu</strong><span>Lisää video aloittaaksesi editoinnin</span></div>}<div className="clip-forge-preview-badge">{selectedClip ? selectedClip.name : "Ei klippiä valittuna"}</div></div><aside className="clip-forge-inspector"><div className="clip-forge-inspector-head"><strong>{activeTool === "text" ? "Teksti" : activeTool === "effects" ? "Efektit" : activeTool === "audio" ? "Ääni" : activeTool === "transitions" ? "Siirtymät" : "Yleiset"}</strong><span>×</span></div>{activeTool === "text" ? <label className="clip-forge-inspector-field"><span>Teksti videon päälle</span><input value={title} maxLength={70} onChange={(event) => setTitle(event.target.value)} placeholder="Kirjoita otsikko" /></label> : activeTool === "effects" ? <label className="clip-forge-inspector-field"><span>Efekti</span><select value={effect} onChange={(event) => setEffect(event.target.value as typeof effect)}><option value="none">Ei efektiä</option><option value="mono">Mustavalkoinen</option><option value="neon">Neon-värit</option></select></label> : activeTool === "transitions" ? <label className="clip-forge-inspector-field"><span>Siirtymä klippien välillä</span><select value={transition} onChange={(event) => setTransition(event.target.value as typeof transition)}><option value="fade">Pehmeä häivytys</option><option value="none">Ei siirtymää</option></select></label>   : <><label className="clip-forge-inspector-field"><span>Nopeus</span><select defaultValue="1"><option value="0.5">0.5×</option><option value="1">1×</option><option value="1.5">1.5×</option><option value="2">2×</option></select></label>{selectedClip && <div className="clip-forge-trim-controls"><strong>Leikkaa klippi</strong><label><span>Alku</span><input type="number" min="0" max={Math.max(0, selectedClip.end - 0.05)} step="0.1" value={selectedClip.start.toFixed(1)} onChange={(event) => updateClipTrim(selectedClip.id, "start", Number(event.target.value))} /></label><label><span>Loppu</span><input type="number" min={Math.min(selectedClip.duration, selectedClip.start + 0.05)} max={selectedClip.duration} step="0.1" value={selectedClip.end.toFixed(1)} onChange={(event) => updateClipTrim(selectedClip.id, "end", Number(event.target.value))} /></label><input className="clip-forge-trim-range" type="range" min="0" max={selectedClip.duration} step="0.1" value={selectedClip.end} onChange={(event) => updateClipTrim(selectedClip.id, "end", Number(event.target.value))} aria-label="Klipin loppukohta" /><small>{(selectedClip.end - selectedClip.start).toFixed(1)} sekuntia käytössä</small></div>}  <label className="clip-forge-inspector-field clip-forge-volume-field"><span>Videon ääni {Math.round(volume * 100)}%</span><input type="range" min="0" max="1" step="0.01" value={volume} onChange={(event) => setVolume(Number(event.target.value))} aria-label="Videon äänenvoimakkuus" /></label><div className="clip-forge-inspector-divider" /><button type="button" className="clip-forge-freeze-button">Lisää freeze frame</button></>}</aside></div><div className="clip-forge-transport"><button type="button" className="icon-button" onClick={togglePreview} aria-label={isPreviewPlaying ? "Pysäytä esikatselu" : "Toista esikatselu"}>{isPreviewPlaying ? "Ⅱ" : "▶"}</button><span>{selectedClip ? selectedClip.name : "00:00.0 / 00:00.0"}</span><input type="range" min="0" max={selectedClip?.duration || 0} step="0.01" defaultValue="0" onChange={seekPreview} aria-label="Esikatselun aikajana" /></div><div className="clip-forge-timeline"><div className="clip-forge-timeline-ruler"><span>00:00</span><span>00:05</span><span>00:10</span><span>00:15</span><span>00:20</span><span>00:25</span></div><div className="clip-forge-timeline-track">{clips.map((clip, index) => <button type="button" className={`clip-forge-timeline-clip${selectedClip?.id === clip.id ? " is-selected" : ""}`} key={clip.id} onClick={() => { setSelectedClipId(clip.id); setIsPreviewPlaying(false); }}><Video size={13} /><span>{index + 1}. {clip.name}</span><small>{clip.duration ? `${clip.duration.toFixed(1)} s` : "—"}</small></button>)}{!clips.length && <span className="clip-forge-timeline-empty">Lisää videoita aikajanalle</span>}</div></div></div>  <input ref={libraryInputRef} className="clip-forge-hidden-input" type="file" accept="video/*" multiple onChange={(event) => { void addClips(event.target.files); event.target.value = ""; }} /><div className="clip-forge-editor-actions"><label className="button button-secondary clip-forge-add-button"><Plus size={15} /> Lisää klippejä<input type="file" accept="video/*" multiple onChange={(event) => { void addClips(event.target.files); event.target.value = ""; }} /></label><label className="button button-secondary clip-forge-add-button"><span>♪</span> Lisää ääniraita<input type="file" accept="audio/*" onChange={(event) => { const file = event.target.files?.[0]; if (audioUrl) URL.revokeObjectURL(audioUrl); setAudioUrl(file ? URL.createObjectURL(file) : ""); }} /></label><button className="button button-primary" type="button" disabled={!clips.length || rendering} onClick={() => void renderVideo()}>{rendering ? "Renderöidään..." : "Renderöi ja lataa"}</button></div>{error && <p className="import-error" role="alert">{error}</p>}{renderedUrl && <a className="button button-secondary clip-forge-download" href={renderedUrl} download="clip-forge-video.webm">Lataa valmis video</a>}</div></>;

  return <><PageHeading eyebrow="CLIPPO · VIDEO WORKSHOP" title="Clip Forge" subtitle="Yhdistä klipit, tekstit, efektit, siirtymät ja äänet yhdeksi videoksi selaimessa." /><div className="clip-forge-layout"><section className="panel clip-forge-panel"><div className="clip-forge-section-head"><div><span className="eyebrow">YOUR MATERIALS</span><h2>Videopätkät</h2></div><label className="button button-primary"><Plus size={15} /> Lisää videoita<input type="file" accept="video/*" multiple onChange={(event) => { void addClips(event.target.files); event.target.value = ""; }} /></label></div>{clips.length ? <div className="clip-forge-list">{clips.map((clip, index) => <div className="clip-forge-item" key={clip.id}><Video size={16} /><div><strong>{clip.name}</strong><small>{clip.duration ? `${clip.duration.toFixed(1)} s` : "Kestoa ei voitu lukea"}</small></div><div className="clip-forge-item-actions"><button type="button" className="icon-button" disabled={index === 0} onClick={() => moveClip(index, -1)} aria-label="Siirrä klippiä ylös">↑</button><button type="button" className="icon-button" disabled={index === clips.length - 1} onClick={() => moveClip(index, 1)} aria-label="Siirrä klippiä alas">↓</button><button type="button" className="icon-button" onClick={() => setClips((current) => current.filter((item) => item.id !== clip.id))} aria-label={`Poista ${clip.name}`}><Trash2 size={14} /></button></div></div>)}</div> : <div className="clip-forge-empty"><Video size={25} /><p>Lisää omat videopätkäsi tähän ja järjestä ne aikajanalle.</p></div>}</section><aside className="panel clip-forge-panel clip-forge-controls"><span className="eyebrow">MAKE IT YOURS</span><h2>Projektin asetukset</h2><label className="setting-field"><span>Teksti videon päälle</span><input value={title} maxLength={70} onChange={(event) => setTitle(event.target.value)} placeholder="Esimerkiksi: Best moments" /></label><label className="setting-field"><span>Efekti</span><select value={effect} onChange={(event) => setEffect(event.target.value as typeof effect)}><option value="none">Ei efektiä</option><option value="mono">Mustavalkoinen</option><option value="neon">Neon-värit</option></select></label><label className="setting-field"><span>Siirtymä</span><select value={transition} onChange={(event) => setTransition(event.target.value as typeof transition)}><option value="fade">Pehmeä häivytys</option><option value="none">Ei siirtymää</option></select></label><label className="setting-field"><span>Ääniraita</span><input type="file" accept="audio/*" onChange={(event) => { const file = event.target.files?.[0]; if (audioUrl) URL.revokeObjectURL(audioUrl); setAudioUrl(file ? URL.createObjectURL(file) : ""); }} /></label><button className="button button-primary clip-forge-render" type="button" disabled={!clips.length || rendering} onClick={() => void renderVideo()}>{rendering ? "Renderöidään..." : "Renderöi video"}</button>{error && <p className="import-error" role="alert">{error}</p>}{renderedUrl && <a className="button button-secondary clip-forge-download" href={renderedUrl} download="clip-forge-video.webm">Lataa valmis video</a>}</aside></div></>;
}

function ClippoOnlinePage({ state }: { state: NexusState }) {
  const [clips, setClips] = useState<CreatorLeagueFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    getCreatorLeaguePublicFeed()
      .then((feed) => {
        if (active) {
          setClips(feed);
          setError("");
        }
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : "Clippo Klippejä ei voitu ladata.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  return <>
    <PageHeading
      eyebrow="CLIPPO · COMMUNITY HIGHLIGHTS"
      title="Clippo Klipit"
      subtitle="Katso pelaajien parhaat hetket. Valitse peli tai selaa koko yhteisön uusinta syötettä."
      action={<button className="button button-primary" onClick={() => { window.location.hash = "creator"; }}><Clapperboard size={16} /> Tee oma klippi</button>}
    />
    <section className="clippo-online-hero">
      <div>
        <span className="feature-tag"><Flame size={13} /> COMMUNITY HIGHLIGHTS</span>
        <h2>Yksi paikka kaikille peliklippien parhaille hetkille.</h2>
        <p>Uudet julkaisut, clutchit ja hauskat pelitilanteet löytyvät nyt omalta sivultaan.</p>
      </div>
      <div className="clippo-online-hero-art"><Video size={42} /><span>WATCH<br />THE MOMENT</span></div>
    </section>
    <OnlineClipsSection state={state} clips={clips} loading={loading} error={error} />
  </>;
}

function CreatorPage({ state, onCreate, onUpdate, onDelete, onPublish, onAccountChange, onChallengeReward }: {
  state: NexusState;
  onAccountChange: (account: CreatorLeagueAccount | null) => void;
  onChallengeReward: (challengeId: string) => void;
  onCreate: (draft: Pick<CreatorDraft, "title" | "type" | "gameId">) => void;
  onUpdate: (id: string, changes: Pick<CreatorDraft, "title" | "body">) => void;
  onDelete: (id: string) => void;
  onPublish: (id: string, file: File) => Promise<void>;
}) {
  const [draftTitle, setDraftTitle] = useState("");
  const [creatorView, setCreatorView] = useState<"studio" | "league" | "online">("studio");
  const [draftType, setDraftType] = useState<CreatorDraft["type"]>("Clip");
  const [draftGameId, setDraftGameId] = useState("");
  const [selectedVideos, setSelectedVideos] = useState<Record<string, File>>({});
  const [publishedVideoUrls, setPublishedVideoUrls] = useState<Record<string, string>>({});
  const [videoError, setVideoError] = useState("");
  const [publishedVideoError, setPublishedVideoError] = useState("");
  const [publishingId, setPublishingId] = useState("");
  const [leagueAccount, setLeagueAccount] = useState<CreatorLeagueAccount | null>(null);
  const [leagueSnapshot, setLeagueSnapshot] = useState<CreatorLeagueSnapshot | null>(null);
  const [leagueFeed, setLeagueFeed] = useState<CreatorLeagueFeedItem[]>([]);
  const [publicFeed, setPublicFeed] = useState<CreatorLeagueFeedItem[]>([]);
  const [leagueWeekly, setLeagueWeekly] = useState<CreatorLeagueWeekly | null>(null);
  const [leagueSocial, setLeagueSocial] = useState<CreatorLeagueSocial | null>(null);
  const [risingCreators, setRisingCreators] = useState<Awaited<ReturnType<typeof getRisingCreators>>["creators"]>([]);
  const [leagueScope, setLeagueScope] = useState<"global" | "friends" | "country">("global");
  const [leagueCountry, setLeagueCountry] = useState("");
  const [friendSearch, setFriendSearch] = useState("");
  const [battlePublicationId, setBattlePublicationId] = useState("");
  const [battleSubmitting, setBattleSubmitting] = useState(false);
  const [challengePublicationIds, setChallengePublicationIds] = useState<Record<string, string>>({});
  const [challengeSubmittingId, setChallengeSubmittingId] = useState("");
  const [battleScores, setBattleScores] = useState<Record<string, { creativity: number; editing: number }>>({});
  const battleClipInput = useRef<HTMLInputElement>(null);
  const challengeClipInputs = useRef<Record<string, HTMLInputElement | null>>({});
  const [leagueLoading, setLeagueLoading] = useState(true);
  const [leagueError, setLeagueError] = useState("");
  const [leagueAuthMode, setLeagueAuthMode] = useState<"register" | "login">("register");
  const [leagueEmail, setLeagueEmail] = useState("");
  const [leaguePassword, setLeaguePassword] = useState("");
  const [leagueDisplayName, setLeagueDisplayName] = useState(state.profile.name);
  const [leagueSubmitting, setLeagueSubmitting] = useState(false);
  const [leagueComments, setLeagueComments] = useState<Record<string, string>>({});
  const lastWatchReported = useRef<Record<string, number>>({});
  const makeDraft = () => {
    if (!draftTitle.trim()) return;
    onCreate({ title: draftTitle, type: draftType, gameId: draftGameId || undefined });
    setDraftTitle("");
  };
  async function refreshLeague() {
    const account = await getCreatorLeagueAccount();
    const [snapshot, rising, publicFeed] = await Promise.all([
      getCreatorLeagueSnapshot(account ? leagueScope : "global"),
      getRisingCreators(),
      getCreatorLeaguePublicFeed(),
    ]);
    setPublicFeed(publicFeed);
    setLeagueAccount(account);
    setLeagueSnapshot(snapshot);
    setRisingCreators(rising.creators);
    onAccountChange(account);
    if (account) {
      const [feed, weekly, social] = await Promise.all([getCreatorLeagueFeed(), getCreatorLeagueWeekly(), getCreatorLeagueSocial()]);
      setLeagueFeed(feed);
      setLeagueWeekly(weekly);
      setLeagueSocial(social);
    } else {
      setLeagueFeed([]);
      setLeagueWeekly(null);
      setLeagueSocial(null);
    }
    return snapshot;
  }
  useEffect(() => {
    let active = true;
    Promise.all([getCreatorLeagueAccount(), getCreatorLeagueSnapshot(), getRisingCreators(), getCreatorLeaguePublicFeed()])
      .then(async ([account, snapshot, rising, publicFeed]) => {
        if (!active) return;
        setLeagueAccount(account);
        setLeagueSnapshot(snapshot);
        setRisingCreators(rising.creators);
        setPublicFeed(publicFeed);
        onAccountChange(account);
        if (account) {
          const [feed, weekly, social] = await Promise.all([getCreatorLeagueFeed(), getCreatorLeagueWeekly(), getCreatorLeagueSocial()]);
          if (!active) return;
          setLeagueFeed(feed);
          setLeagueWeekly(weekly);
          setLeagueSocial(social);
        } else setLeagueFeed([]);
        setLeagueError("");
      })
      .catch((error: unknown) => {
        if (active) setLeagueError(error instanceof Error ? error.message : "Creator Leaguea ei voitu ladata.");
      })
      .finally(() => { if (active) setLeagueLoading(false); });
    return () => { active = false; };
  }, [onAccountChange]);

  async function changeLeagueScope(scope: "global" | "friends" | "country") {
    setLeagueScope(scope);
    try {
      setLeagueSnapshot(await getCreatorLeagueSnapshot(scope));
    } catch (error) {
      setLeagueError(error instanceof Error ? error.message : "Leaderboardia ei voitu ladata.");
    }
  }

  async function refreshSocial(search = friendSearch) {
    try {
      setLeagueSocial(await getCreatorLeagueSocial(search));
    } catch (error) {
      setLeagueError(error instanceof Error ? error.message : "Kaveritietoja ei voitu ladata.");
    }
  }

  async function sendFriendRequest(userId: string) {
    try {
      setLeagueSocial(await sendCreatorFriendRequest(userId));
      setFriendSearch("");
    } catch (error) {
      setLeagueError(error instanceof Error ? error.message : "Kaveripyyntöä ei voitu lähettää.");
    }
  }

  async function handleFriendRequest(requestId: string, accept: boolean) {
    try {
      setLeagueSocial(await respondToCreatorFriendRequest(requestId, accept));
      if (leagueScope === "friends" && accept) setLeagueSnapshot(await getCreatorLeagueSnapshot("friends"));
    } catch (error) {
      setLeagueError(error instanceof Error ? error.message : "Kaveripyyntöä ei voitu käsitellä.");
    }
  }

  async function enterBattle() {
    if (!leagueWeekly || !battlePublicationId) return;
    try {
      const battle = await submitBattleVideo(leagueWeekly.battle.id, battlePublicationId);
      setLeagueWeekly((current) => current ? { ...current, battle } : current);
      setBattlePublicationId("");
    } catch (error) {
      setLeagueError(error instanceof Error ? error.message : "Battle-videota ei voitu lähettää.");
    }
  }

  async function uploadBattleClip(file: File) {
    if (!leagueWeekly) return;
    setLeagueError("");
    setBattleSubmitting(true);
    try {
      if (!file.type.startsWith("video/")) throw new Error("Valitse videotiedosto.");
      if (file.size > 100 * 1024 * 1024) throw new Error("Battle-klipin enimmäiskoko on 100 Mt.");
      const publicationId = crypto.randomUUID();
      const title = file.name.replace(/\.[^.]+$/, "").trim().slice(0, 80) || "Weekly Clip Battle";
      await submitCreatorLeagueVideo(publicationId, title, file);
      const battle = await submitBattleVideo(leagueWeekly.battle.id, publicationId);
      setLeagueWeekly((current) => current ? { ...current, battle } : current);
      await refreshLeague();
    } catch (error) {
      setLeagueError(error instanceof Error ? error.message : "Battle-klippiä ei voitu lähettää.");
    } finally {
      setBattleSubmitting(false);
      if (battleClipInput.current) battleClipInput.current.value = "";
    }
  }

  async function voteBattle(publicationId: string) {
    if (!leagueWeekly) return;
    const scores = battleScores[publicationId] ?? { creativity: 3, editing: 3 };
    try {
      const battle = await voteForBattleVideo(leagueWeekly.battle.id, publicationId, scores.creativity, scores.editing);
      setLeagueWeekly((current) => current ? { ...current, battle } : current);
    } catch (error) {
      setLeagueError(error instanceof Error ? error.message : "Battle-ääntä ei voitu tallentaa.");
    }
  }

  async function completeChallenge(challengeId: string) {
    const publicationId = challengePublicationIds[challengeId];
    if (!publicationId) return;
    try {
      const result = await completeCreatorChallenge(challengeId, publicationId);
      setLeagueWeekly((current) => current ? { ...current, challenges: result.challenges } : current);
      onChallengeReward(`${result.challenges.weekId}:${challengeId}`);
      await refreshLeague();
    } catch (error) {
      setLeagueError(error instanceof Error ? error.message : "Haastetta ei voitu suorittaa.");
    }
  }

  async function uploadChallengeClip(challengeId: string, file: File) {
    const challenge = leagueWeekly?.challenges.items.find((item) => item.id === challengeId);
    if (!challenge) return;
    setLeagueError("");
    setChallengeSubmittingId(challengeId);
    try {
      if (!file.type.startsWith("video/")) throw new Error("Valitse videotiedosto.");
      if (file.size > 100 * 1024 * 1024) throw new Error("Videon enimmäiskoko on 100 Mt.");
      const duration = await readCreatorLeagueVideoDuration(file);
      if (duration < challenge.minDuration || duration > challenge.maxDuration) {
        throw new Error(`Videon keston tulee olla ${challenge.minDuration}–${challenge.maxDuration} sekuntia.`);
      }
      const publicationId = crypto.randomUUID();
      const title = file.name.replace(/\.[^.]+$/, "").trim().slice(0, 80) || challenge.title;
      await submitCreatorLeagueVideo(publicationId, title, file);
      const result = await completeCreatorChallenge(challengeId, publicationId);
      setLeagueWeekly((current) => current ? { ...current, challenges: result.challenges } : current);
      onChallengeReward(`${result.challenges.weekId}:${challengeId}`);
      await refreshLeague();
    } catch (error) {
      setLeagueError(error instanceof Error ? error.message : "Haastevideota ei voitu lähettää.");
    } finally {
      setChallengeSubmittingId("");
      const input = challengeClipInputs.current[challengeId];
      if (input) input.value = "";
    }
  }

  async function authenticateLeague(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLeagueSubmitting(true);
    setLeagueError("");
    try {
      const account = await authenticateCreatorLeague(leagueAuthMode, {
        email: leagueEmail,
        password: leaguePassword,
        ...(leagueAuthMode === "register" ? { displayName: leagueDisplayName, country: leagueCountry.toUpperCase() } : {}),
      });
      setLeagueAccount(account);
      onAccountChange(account);
      setLeaguePassword("");
      await refreshLeague();
    } catch (error) {
      setLeagueError(error instanceof Error ? error.message : "Creator League -tiliä ei voitu avata.");
    } finally {
      setLeagueSubmitting(false);
    }
  }

  async function leaveLeague() {
    setLeagueSubmitting(true);
    setLeagueError("");
    try {
      await logoutCreatorLeague();
      setLeagueAccount(null);
      onAccountChange(null);
      setLeagueScope("global");
      setLeagueCountry("");
      await refreshLeague();
    } catch (error) {
      setLeagueError(error instanceof Error ? error.message : "Uloskirjautuminen epäonnistui.");
    } finally {
      setLeagueSubmitting(false);
    }
  }

  async function interactWithLeagueVideo(
    publicationId: string,
    interaction: { type: "watch"; currentTime: number } | { type: "like" | "save" | "share" } | { type: "comment"; text: string },
  ) {
    try {
      const result = await interactWithCreatorLeagueVideo(publicationId, interaction);
      setLeagueFeed(result.feed);
      setLeagueSnapshot(result);
    } catch (error) {
      setLeagueError(error instanceof Error ? error.message : "Creator League -videon toimintoa ei voitu tallentaa.");
    }
  }

  function reportLeagueWatch(publicationId: string, video: HTMLVideoElement, force = false) {
    if ((!force && video.paused) || !leagueAccount || (!force && video.currentTime - (lastWatchReported.current[publicationId] ?? -5) < 5)) return;
    lastWatchReported.current[publicationId] = video.currentTime;
    void interactWithLeagueVideo(publicationId, { type: "watch", currentTime: video.currentTime });
  }

  async function submitLeagueComment(event: FormEvent<HTMLFormElement>, publicationId: string) {
    event.preventDefault();
    const text = (leagueComments[publicationId] ?? "").trim();
    if (!text) return;
    await interactWithLeagueVideo(publicationId, { type: "comment", text });
    setLeagueComments((current) => ({ ...current, [publicationId]: "" }));
  }

  async function enterLeagueWithPublishedVideo(post: CreatorPublishedPost) {
    setPublishingId(post.id);
    setLeagueError("");
    try {
      const video = await getCreatorVideo(post.id);
      if (!video) throw new Error("Paikallista videotiedostoa ei löytynyt tältä laitteelta.");
      await submitCreatorLeagueVideo(post.id, post.title, new File([video], post.mediaName, { type: video.type || "video/mp4" }), post.gameId);
      await refreshLeague();
    } catch (error) {
      setLeagueError(error instanceof Error ? error.message : "Videota ei voitu lisätä Creator Leagueen.");
    } finally {
      setPublishingId("");
    }
  }
  useEffect(() => {
    let active = true;
    const urls: string[] = [];
    Promise.all(state.creatorPosts.map(async (post) => ({
      id: post.id,
      media: await getCreatorVideo(post.id),
    })))
      .then((items) => {
        if (!active) return;
        if (items.some((item) => !item.media)) {
          throw new Error("Julkaistua videotiedostoa ei löytynyt.");
        }
        const nextUrls: Record<string, string> = {};
        for (const item of items) {
          if (!item.media) continue;
          const url = URL.createObjectURL(item.media);
          urls.push(url);
          nextUrls[item.id] = url;
        }
        setPublishedVideoUrls(nextUrls);
      })
      .catch((error: unknown) => {
        if (active) setPublishedVideoError(error instanceof Error ? error.message : "Julkaistuja videoita ei voitu ladata.");
      });
    return () => {
      active = false;
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [state.creatorPosts]);

  async function publishVideo(draft: CreatorDraft) {
    const file = selectedVideos[draft.id];
    if (!file) {
      setVideoError("Valitse julkaistava videotiedosto.");
      return;
    }
    setPublishingId(draft.id);
    setVideoError("");
    try {
      await onPublish(draft.id, file);
      setSelectedVideos((current) => {
        const next = { ...current };
        delete next[draft.id];
        return next;
      });
      if (leagueAccount) {
        try {
          await submitCreatorLeagueVideo(draft.id, draft.title, file, draft.gameId);
          await refreshLeague();
        } catch (error) {
          setLeagueError(error instanceof Error ? error.message : "Video julkaistiin paikallisesti, mutta Creator Leagueen lähetys epäonnistui.");
        }
      }
    } catch (error) {
      setVideoError(error instanceof Error ? error.message : "Videon julkaiseminen epäonnistui.");
    } finally {
      setPublishingId("");
    }
  }
  const ownLeagueVideos = leagueFeed.filter((item) => item.own);
  const hasJoinedBattle = leagueWeekly?.battle.submissions.some((submission) => submission.own) ?? false;
  const battleAtCapacity = leagueWeekly ? leagueWeekly.battle.participantCount >= leagueWeekly.battle.participantLimit : true;

  return <>
    <PageHeading eyebrow="CLIPPO · YOUR CREATIVE SPACE" title="Clippo" subtitle="Luo, julkaise ja kilpaile Creator Leaguessa." action={creatorView === "studio" ? <button className="button button-primary" onClick={makeDraft}><Plus size={16} /> Uusi luonnos</button> : undefined} />
    <div className="creator-page-tabs" role="tablist" aria-label="Clippon sivut">
      <button type="button" role="tab" aria-selected={creatorView === "studio"} className={creatorView === "studio" ? "is-active" : ""} onClick={() => setCreatorView("studio")}>Clippo Studio</button>
      <button type="button" role="tab" aria-selected={creatorView === "league"} className={creatorView === "league" ? "is-active" : ""} onClick={() => setCreatorView("league")}>Creator League</button>
      <button type="button" role="tab" aria-selected={creatorView === "online"} className={creatorView === "online" ? "is-active" : ""} onClick={() => setCreatorView("online")}>Clippo Klipit</button>
    </div>
    {creatorView === "studio" && <>
    <section className="creator-banner">
      <div className="creator-banner-copy"><span className="feature-tag">YOUR CREATIVE SPACE</span><h2>Your next idea<br />starts right here.</h2><p>Kirjoita ideat talteen, kehitä niitä rauhassa ja julkaise videosi paikallisesti.</p><button className="button button-light" onClick={() => document.getElementById("new-draft-title")?.focus()}><Plus size={15} /> Luo uusi luonnos</button></div>
      <div className="creator-shape shape-a" /><div className="creator-shape shape-b" /><div className="creator-tile"><Clapperboard size={34} /><span>CREATOR<br />STUDIO</span></div>
    </section>
    <div className="section-title-row"><div><div className="eyebrow">YOUR TOOLKIT</div><h2>Make it happen</h2></div><span className="soft-label"><Bookmark size={13} /> Paikallinen Creator Studio</span></div>
    <form className="inline-create-form" onSubmit={(event) => { event.preventDefault(); makeDraft(); }}>
      <input id="new-draft-title" aria-label="Luonnoksen nimi" placeholder="Anna ideallesi nimi..." value={draftTitle} maxLength={80} onChange={(event) => setDraftTitle(event.target.value)} />
      <select aria-label="Sisältötyyppi" value={draftType} onChange={(event) => setDraftType(event.target.value as CreatorDraft["type"])}><option>Clip</option><option>Video</option><option>Post</option></select>
      <select aria-label="Peli" value={draftGameId} onChange={(event) => setDraftGameId(event.target.value)}>
        <option value="">Peli (valinnainen)</option>
        {state.games.map((game) => <option value={game.id} key={game.id}>{game.name}</option>)}
      </select>
      <button className="button button-primary" type="submit"><Plus size={15} /> Tallenna luonnos</button>
    </form>
    <section className="creator-tools">{creatorCards.map((card) => <div className="tool-card" key={card.title}><div className={`tool-icon ${card.color}`}>{card.icon}</div><div><h3>{card.title}</h3><p>{card.detail} · editori tulossa</p></div><ArrowUpRight size={17} className="tool-arrow" /></div>)}</section>
    </>}
    {(creatorView === "studio" || creatorView === "online") && <OnlineClipsSection state={state} clips={leagueAccount ? leagueFeed : publicFeed} loading={leagueLoading} error={leagueError} />}
    {creatorView !== "online" && <section className={`panel creator-lower${creatorView === "league" ? " creator-lower-league" : " creator-lower-studio"}`}>
      {creatorView === "league" && <div className="creator-league-panel">
        <div className="panel-heading">
          <div><div className="eyebrow">SEASON RANKING</div><h2>Creator League</h2></div>
          <span className="league-pill">{leagueSnapshot?.season.id ?? "Ladataan"}</span>
        </div>
        {leagueError && <p className="creator-publish-error" role="alert">{leagueError}</p>}
        {leagueLoading
          ? <p className="empty-inline">Ladataan Creator Leaguea…</p>
          : leagueAccount
            ? <div className="league-account-row">
              <span><strong>{leagueAccount.displayName}</strong><small>@{leagueAccount.username} · {leagueAccount.country || leagueAccount.email}</small></span>
              <button className="text-button" type="button" disabled={leagueSubmitting} onClick={() => void leaveLeague()}>Kirjaudu ulos</button>
            </div>
            : <form className="league-auth-form" onSubmit={(event) => void authenticateLeague(event)}>
              <p className="panel-copy">Luo tili tai kirjaudu sisään osallistuaksesi Creator Leagueen, kerätäksesi CLP-pisteitä ja kilpaillaksesi leaderboardilla.</p>
              {leagueAuthMode === "register" && <label>Näyttönimi<input autoComplete="nickname" minLength={2} maxLength={40} value={leagueDisplayName} onChange={(event) => setLeagueDisplayName(event.target.value)} required /></label>}
              {leagueAuthMode === "register" && <label>Maa (valinnainen, ISO 3166-1 -koodi)<input autoComplete="country" maxLength={2} pattern="[A-Za-z]{2}" value={leagueCountry} onChange={(event) => setLeagueCountry(event.target.value)} placeholder="FI" /></label>}
              <label>Sähköposti<input type="email" autoComplete="email" maxLength={254} value={leagueEmail} onChange={(event) => setLeagueEmail(event.target.value)} required /></label>
              <label>Salasana<input type="password" autoComplete={leagueAuthMode === "register" ? "new-password" : "current-password"} minLength={leagueAuthMode === "register" ? 12 : undefined} maxLength={128} value={leaguePassword} onChange={(event) => setLeaguePassword(event.target.value)} required /></label>
              {leagueAuthMode === "register" && <small className="league-auth-note">Salasanassa vähintään 12 merkkiä. Videot ja kausipisteet tallennetaan League-palvelimelle.</small>}
              <div className="league-auth-actions">
                <button className="button button-primary" type="submit" disabled={leagueSubmitting}>{leagueSubmitting ? "Odota…" : leagueAuthMode === "register" ? "Luo League-tili" : "Kirjaudu sisään"}</button>
                <button className="text-button" type="button" onClick={() => { setLeagueAuthMode((mode) => mode === "register" ? "login" : "register"); setLeagueError(""); }}>
                  {leagueAuthMode === "register" ? "Minulla on jo tili" : "Luo uusi tili"}
                </button>
              </div>
            </form>}
        {leagueSnapshot && <>
          <div className="league-season-meta">
            <span>{leagueSnapshot.season.name}</span>
            <span>Päättyy {new Intl.DateTimeFormat(getLocale(), { dateStyle: "medium", timeZone: "UTC" }).format(new Date(leagueSnapshot.season.endsAt))}</span>
          </div>
          {leagueAccount && leagueSnapshot.creatorPerformance && <section className="league-creator-performance">
            <div className="league-profile-heading">
              <div><div className="eyebrow">CREATOR SCORE · LAST 30 DAYS</div><h3>Creator Score</h3></div>
              <span className="creator-rank-pill">{leagueSnapshot.creatorPerformance.creatorRank.label}</span>
            </div>
            <div className="creator-score-summary">
              <strong>{leagueSnapshot.creatorPerformance.score.toLocaleString(getLocale())}<small> / {leagueSnapshot.creatorPerformance.maxScore.toLocaleString(getLocale())}</small></strong>
              <span><small>Lifetime Creator Level</small><b>{state.levels.creator}</b></span>
            </div>
            <div className="league-rank-progress creator-score-progress" role="progressbar" aria-label="Edistyminen seuraavaan Creator Rankiin" aria-valuemin={0} aria-valuemax={leagueSnapshot.creatorPerformance.creatorRank.progressMax} aria-valuenow={leagueSnapshot.creatorPerformance.creatorRank.progress}>
              <span style={{ width: `${leagueSnapshot.creatorPerformance.creatorRank.progress / leagueSnapshot.creatorPerformance.creatorRank.progressMax * 100}%` }} />
            </div>
            <div className="league-rank-progress-label">
              <span>{leagueSnapshot.creatorPerformance.creatorRank.progress} / {leagueSnapshot.creatorPerformance.creatorRank.progressMax}</span>
              <span>{leagueSnapshot.creatorPerformance.creatorRank.nextRank ? `Seuraava: ${leagueSnapshot.creatorPerformance.creatorRank.nextRank}` : "Korkein Creator Rank"}</span>
            </div>
            <div className="creator-score-stats">
              <span>{leagueSnapshot.creatorPerformance.qualifiedVideos} laadukasta videota / 30 pv</span>
              <span>{leagueSnapshot.creatorPerformance.videoCount} videota yhteensä</span>
              <span>{leagueSnapshot.creatorPerformance.leaderboardRank ? `Creator Score -sijoitus #${leagueSnapshot.creatorPerformance.leaderboardRank}` : "Ei vielä sijoitusta"}</span>
            </div>
            <small className="creator-score-explanation">Jokainen video pisteytetään erikseen. Creator Score yhdistää videoiden keskiarvon (65 %), tasaisuuden (25 %) ja Creator-toiminnot (10 %); enintään 10 hyvää videota kasvattaa tasaisuuspisteitä. Yksittäisen videon katselut eivät voi yksin ratkaista scorea.</small>
          </section>}
          <div className="league-score-strip">
            <div><span>SEASON SCORE</span><strong>{(leagueSnapshot.myStanding?.score.total ?? 0).toFixed(2)}</strong></div>
            <div><span>SIJOITUS</span><strong>{leagueSnapshot.myStanding?.rank ? `#${leagueSnapshot.myStanding.rank}` : "—"}</strong></div>
            <div><span>VIDEOT</span><strong>{leagueSnapshot.myStanding?.videosPublished ?? 0}</strong></div>
          </div>
          {leagueAccount && leagueSnapshot.leagueProfile && <section className="league-profile-card">
            <div className="league-profile-heading">
              <div><div className="eyebrow">CREATOR LEAGUE</div><h3>League-profiili</h3></div>
              <span className="league-rank-emblem">{leagueRankEmblems[leagueSnapshot.leagueProfile.currentRank.tier] ?? "🏆"}</span>
            </div>
            <div className="league-profile-current">
              <div><small>Creator League -taso</small><strong>{leagueSnapshot.leagueProfile.currentRank.label === "Unranked" ? "Ei vielä tasoa" : leagueSnapshot.leagueProfile.currentRank.label}</strong></div>
              <div><small>Creator League -pisteet (CLP)</small><strong>{leagueSnapshot.leagueProfile.rating.toLocaleString(getLocale())} CLP</strong></div>
              <div><small>Kausisijoitus</small><strong>{leagueSnapshot.leagueProfile.seasonRank ? `#${leagueSnapshot.leagueProfile.seasonRank}` : "—"}</strong></div>
            </div>
            <div className="league-rank-progress" role="progressbar" aria-label="Edistyminen seuraavaan League-rankkiin" aria-valuemin={0} aria-valuemax={leagueSnapshot.leagueProfile.currentRank.progressMax} aria-valuenow={leagueSnapshot.leagueProfile.currentRank.progress}>
              <span style={{ width: `${leagueSnapshot.leagueProfile.currentRank.progress / leagueSnapshot.leagueProfile.currentRank.progressMax * 100}%` }} />
            </div>
            <div className="league-rank-progress-label">
              <span>{leagueSnapshot.leagueProfile.currentRank.nextRank
                ? `${leagueSnapshot.leagueProfile.currentRank.progress} / ${leagueSnapshot.leagueProfile.currentRank.progressMax} CLP`
                : `${leagueSnapshot.leagueProfile.currentRank.progress.toLocaleString(getLocale())}+ CLP`}</span>
              <span>{leagueSnapshot.leagueProfile.currentRank.nextRank ? `Seuraava: ${leagueSnapshot.leagueProfile.currentRank.nextRank}` : "Korkein rankki"}</span>
            </div>
            <p className="league-rank-explanation">Bronze IV avautuu 200 CLP:llä. Kerää pisteitä, niin etenet seuraaviin tasoihin. CLP:t eivät nollaudu kauden vaihtuessa.</p>
            <div className="league-peak-rank"><span><small>Korkein saavutettu taso</small><strong>{leagueSnapshot.leagueProfile.peakRank.label === "Unranked" ? "Ei vielä tasoa" : leagueSnapshot.leagueProfile.peakRank.label}</strong></span><small>{leagueSnapshot.leagueProfile.peakRank.rating.toLocaleString(getLocale())} CLP</small></div>
            <div className="league-subheading"><strong>Kausihistoria</strong><small>Paras saavutettu rankki kaudella</small></div>
            {leagueSnapshot.leagueProfile.seasonHistory.length
              ? <ol className="league-season-history">{[...leagueSnapshot.leagueProfile.seasonHistory].reverse().map((record) => <li key={record.seasonId}>
                <span>{record.achievement ?? `${record.seasonName} · ${record.rank}`}</span><small>{record.seasonName.replace(/^Creator League · /, "")} · {record.rating.toLocaleString(getLocale())} CLP</small>
              </li>)}</ol>
              : <p className="empty-inline">Kausihistoria alkaa tämän Creator League -kauden päätteeksi.</p>}
          </section>}
          {leagueSnapshot.myStanding && <div className="league-score-breakdown">
            <div><span>Content · 40%</span><strong>{leagueSnapshot.myStanding.score.content.toFixed(1)}</strong></div>
            <div><span>Creator · 25%</span><strong>{leagueSnapshot.myStanding.score.creator.toFixed(1)}</strong></div>
            <div><span>Quality · 35%</span><strong>{leagueSnapshot.myStanding.score.quality.toFixed(1)}</strong></div>
            <small>{leagueSnapshot.myStanding.score.metrics.views} uniikkia katselua · {leagueSnapshot.myStanding.score.metrics.watchMinutes} katseluminuuttia · {leagueSnapshot.myStanding.score.metrics.likes} tykkäystä · {leagueSnapshot.myStanding.score.metrics.comments} kommenttia · {leagueSnapshot.myStanding.score.metrics.saves} tallennusta · {leagueSnapshot.myStanding.score.metrics.shares} jakoa</small>
            <small>Contentin mittarit skaalataan laskevalla tuotolla. Quality mittaa vähintään 3 sekuntia (tai lyhyen videon koko keston) katsoneiden keskimääräistä osuutta videosta. Katseluaika lasketaan enintään kerran videon keston verran katsojaa kohti.</small>
            <small>Creator: julkaisu 5, haaste 10, projekti 5, yhteisö 5 ja ryhmäviesti 10; päivärajat rajoittavat toistopisteytystä.</small>
          </div>}
          <div className="league-subheading"><strong>Kauden tulostaulu</strong><small>Score painottaa sitoutumista ja katselun laatua, ei pelkkiä klikkauksia</small></div>
          {leagueSnapshot.standings.length
            ? <ol className="league-standings">{leagueSnapshot.standings.slice(0, 10).map((standing) => <li className={standing.userId === leagueAccount?.id ? "is-current-user" : ""} key={standing.userId}>
              <span className={`league-rank${standing.rank <= 3 ? ` podium-${standing.rank}` : ""}`}>{standing.rank <= 3 ? ["🥇", "🥈", "🥉"][standing.rank - 1] : standing.rank}</span>
              <strong>{standing.displayName} <small>@{standing.username}{standing.country ? ` · ${standing.country}` : ""}</small>{standing.userId === leagueAccount?.id ? " · sinä" : ""}</strong>
              <span>{standing.points.toFixed(2)} score</span>
            </li>)}</ol>
            : <p className="empty-inline">Kausi on alkanut — julkaise video ja kerää ensimmäiset pisteet.</p>}
          <div className="league-scope-tabs" aria-label="Leaderboardin näkymä">
            {(["global", "friends", "country"] as const).map((scope) => <button type="button" key={scope} className={leagueScope === scope ? "is-active" : ""} onClick={() => void changeLeagueScope(scope)} disabled={!leagueAccount && scope !== "global"}>{scope === "global" ? "Global" : scope === "friends" ? "Friends" : "Country"}</button>)}
          </div>
          <div className="league-subheading"><strong>Creator League Points (CLP) · All-time</strong><small>Korkein rankki avautuu 10 000 CLP:llä; pisteet kertyvät sen jälkeenkin ja päivittävät sijoitusta.</small></div>
          {leagueSnapshot.clpStandings.length
            ? <ol className="league-standings">{leagueSnapshot.clpStandings.slice(0, 10).concat(leagueSnapshot.clpStandings.find((standing) => standing.userId === leagueAccount?.id && standing.rank > 10) ?? []).map((standing) => <li className={standing.userId === leagueAccount?.id ? "is-current-user" : ""} key={standing.userId}>
              <span className={`league-rank${standing.rank <= 3 ? ` podium-${standing.rank}` : ""}`}>{standing.rank <= 3 ? ["🥇", "🥈", "🥉"][standing.rank - 1] : standing.rank}</span>
              <strong>{standing.displayName} <small>@{standing.username}{standing.country ? ` · ${standing.country}` : ""}</small>{standing.userId === leagueAccount?.id ? " · sinä" : ""}</strong>
              <span>{standing.points.toLocaleString(getLocale())} CLP</span>
            </li>)}</ol>
            : <p className="empty-inline">Creator League -pisteitä ei ole vielä kertynyt.</p>}
          <div className="league-subheading"><strong>Creator Score — Last 30 Days</strong><small>Jokainen video pisteytetään erikseen</small></div>
          {leagueSnapshot.creatorStandings.length
            ? <ol className="league-creator-standings">{leagueSnapshot.creatorStandings.slice(0, 10).map((standing) => <li className={standing.userId === leagueAccount?.id ? "is-current-user" : ""} key={standing.userId}>
              <span className={`league-rank${standing.rank <= 3 ? ` podium-${standing.rank}` : ""}`}>{standing.rank <= 3 ? ["🥇", "🥈", "🥉"][standing.rank - 1] : standing.rank}</span>
              <strong>{standing.displayName} <small>@{standing.username} · {standing.creatorRank.label}</small></strong>
              <span>{standing.score.toLocaleString(getLocale())} / 10k</span>
            </li>)}</ol>
            : <p className="empty-inline">Julkaise viimeisten 30 päivän aikana videoita saadaksesi Creator Scoren.</p>}
          {leagueAccount && <div className="league-score-strip league-rating-strip"><div><span>CREATOR LEAGUE POINTS · CLP</span><strong>{leagueSnapshot.leagueRating.toLocaleString(getLocale())} CLP</strong></div></div>}
          {leagueAccount && leagueWeekly && <section className="league-feature-grid">
            <article className="league-feature-card">
              <div className="league-subheading"><strong>🎬 Weekly Clip Battle</strong><small>{leagueWeekly.battle.participantCount}/{leagueWeekly.battle.participantLimit} osallistujaa · {leagueWeekly.battle.theme}</small></div>
              <p className="panel-copy">Lähetä oma videosi ja arvioi muiden luovuutta sekä editointia asteikolla 1–5. Voittaja saa 25 CLP:tä.</p>
              {!leagueWeekly.battle.finalizedAt && !hasJoinedBattle && <>
                <input
                  ref={battleClipInput}
                  className="league-battle-file-input"
                  type="file"
                  accept="video/*"
                  aria-label="Valitse Weekly Clip Battle -klippi"
                  hidden
                  onChange={(event) => {
                    const file = event.currentTarget.files?.[0];
                    if (file) void uploadBattleClip(file);
                  }}
                />
                <button className="button button-secondary league-battle-submit-button" type="button" disabled={battleSubmitting || battleAtCapacity} onClick={() => battleClipInput.current?.click()}>
                  {battleSubmitting ? "Lähetetään klippiä…" : "Lähetä klippi"}
                </button>
                <small className="league-battle-capacity-note">{battleAtCapacity ? "Battle on täynnä." : "Valitse videotiedosto (enintään 100 Mt). Yksi klippi osallistujaa kohti."}</small>
                {ownLeagueVideos.length > 0 && <details className="league-existing-clip-submit">
                  <summary>Käytä jo Leagueen ladattua videota</summary>
                  <div className="league-inline-control">
                    <select aria-label="Valitse oma Battle-video" value={battlePublicationId} onChange={(event) => setBattlePublicationId(event.target.value)}>
                      <option value="">Valitse julkaistu video</option>{ownLeagueVideos.filter((item) => !item.inBattle).map((video) => <option key={video.id} value={video.id}>{video.title}</option>)}
                    </select>
                    <button className="button button-secondary" type="button" disabled={!battlePublicationId || battleAtCapacity} onClick={() => void enterBattle()}>Lisää Battleen</button>
                  </div>
                </details>}
              </>}
              {hasJoinedBattle && <p className="league-winner">Olet mukana tässä viikkobattlessa.</p>}
              {leagueWeekly.battle.winner && <p className="league-winner">🏆 Voittaja: {leagueWeekly.battle.winner.displayName}</p>}
              <div className="league-battle-list">{leagueWeekly.battle.submissions.length ? leagueWeekly.battle.submissions.map((submission) => {
                const scores = battleScores[submission.publicationId] ?? { creativity: 3, editing: 3 };
                return <div className="league-battle-entry" key={submission.publicationId}>
                  <video src={`/api/creator-league/feed/${encodeURIComponent(submission.publicationId)}/media`} controls preload="metadata" />
                  <div><strong>{submission.title}</strong><small>{submission.creatorName} · {submission.rating.total.toFixed(1)} score · {submission.rating.votes} ääntä</small></div>
                  {!submission.own && !leagueWeekly.battle.finalizedAt && <div className="league-vote-controls">
                    <label>Luovuus <select value={scores.creativity} onChange={(event) => setBattleScores((current) => ({ ...current, [submission.publicationId]: { ...scores, creativity: Number(event.target.value) } }))}>{[1, 2, 3, 4, 5].map((score) => <option key={score}>{score}</option>)}</select></label>
                    <label>Editointi <select value={scores.editing} onChange={(event) => setBattleScores((current) => ({ ...current, [submission.publicationId]: { ...scores, editing: Number(event.target.value) } }))}>{[1, 2, 3, 4, 5].map((score) => <option key={score}>{score}</option>)}</select></label>
                    <button className="button button-secondary" type="button" onClick={() => void voteBattle(submission.publicationId)}>{submission.myVote ? "Päivitä ääni" : "Äänestä"}</button>
                  </div>}
                </div>;
              }) : <p className="empty-inline">Tähän Battleen ei ole vielä videoita.</p>}</div>
            </article>
            <article className="league-feature-card">
              <div className="league-subheading"><strong>🎯 Weekly Creator Challenges</strong><small>Haasteet vaihtuvat viikoittain</small></div>
              <p className="panel-copy">Suorituksesta saa 25 Creator XP:tä, kausipisteitä ja haastebadgen.</p>
              <div className="league-challenge-list">{leagueWeekly.challenges.items.map((challenge) => {
                const candidates = ownLeagueVideos.filter((video) => video.durationSeconds >= challenge.minDuration && video.durationSeconds <= challenge.maxDuration);
                return <div className="league-challenge-entry" key={challenge.id}>
                  <div><strong>{challenge.title}</strong><small>{challenge.description} · {challenge.minDuration}–{challenge.maxDuration} s</small></div>
                  {challenge.completed ? <span className="league-complete">✓ Suoritettu</span> : <div className="league-inline-control">
                    <select aria-label={`Valitse video haasteeseen ${challenge.title}`} value={challengePublicationIds[challenge.id] ?? ""} onChange={(event) => setChallengePublicationIds((current) => ({ ...current, [challenge.id]: event.target.value }))}>
                      <option value="">Valitse sopiva video</option>{candidates.map((video) => <option key={video.id} value={video.id}>{video.title}</option>)}
                    </select>
                    <button className="button button-secondary" type="button" disabled={!challengePublicationIds[challenge.id] || !!challengeSubmittingId} onClick={() => void completeChallenge(challenge.id)}>Suorita</button>
                    <input
                      ref={(input) => { challengeClipInputs.current[challenge.id] = input; }}
                      className="league-battle-file-input"
                      type="file"
                      accept="video/*"
                      aria-label={`Lataa video haasteeseen ${challenge.title}`}
                      hidden
                      onChange={(event) => {
                        const file = event.currentTarget.files?.[0];
                        if (file) void uploadChallengeClip(challenge.id, file);
                      }}
                    />
                    <button className="button button-secondary" type="button" disabled={!!challengeSubmittingId} onClick={() => challengeClipInputs.current[challenge.id]?.click()}>
                      {challengeSubmittingId === challenge.id ? "Lähetetään…" : "Lataa video"}
                    </button>
                  </div>}
                </div>;
              })}</div>
            </article>
            <article className="league-feature-card">
              <div className="league-subheading"><strong>🤝 Friends leaderboard</strong><small>{leagueSnapshot.leagueRating.toLocaleString(getLocale())} CLP</small></div>
              <label className="league-search-label">Etsi nimellä, käyttäjänimellä tai kaverikoodilla<input value={friendSearch} maxLength={32} onChange={(event) => { setFriendSearch(event.target.value); void refreshSocial(event.target.value); }} placeholder="Nimi, @käyttäjänimi tai NEX-XXXXXXXX" /></label>
              {leagueSocial?.search.map((creator) => <div className="league-social-row" key={creator.id}><span>{creator.displayName} <small>@{creator.username} · {creator.friendCode}</small></span><button className="text-button" type="button" onClick={() => void sendFriendRequest(creator.id)}>Lisää kaveriksi</button></div>)}
              {leagueSocial?.incoming.map((request) => <div className="league-social-row" key={request.id}><span>{request.displayName} <small>@{request.username} · {request.friendCode}</small></span><span><button className="text-button" type="button" onClick={() => void handleFriendRequest(request.id, true)}>Hyväksy</button><button className="text-button" type="button" onClick={() => void handleFriendRequest(request.id, false)}>Hylkää</button></span></div>)}
              {leagueSocial?.outgoing.map((request) => <div className="league-social-row" key={request.id}><span>{request.displayName} <small>@{request.username} · {request.friendCode}</small></span><small>Odottaa</small></div>)}
              {!!leagueSocial?.friends.length && <p className="league-friend-list">Kaverit: {leagueSocial.friends.map((friend) => `@${friend.username}`).join(", ")}</p>}
              {!leagueSnapshot.account?.country && leagueScope === "country" && <p className="empty-inline">Lisää tilillesi maakoodi nähdäksesi Country-rankingin.</p>}
            </article>
          </section>}
          <section className="league-feature-card league-rising-panel">
            <div className="league-subheading"><strong>🚀 Rising Creators</strong><small>Viimeiset 7 päivää</small></div>
            {risingCreators.length ? risingCreators.map((creator) => <div className="league-social-row" key={creator.userId}><span>#{creator.rank} {creator.displayName} <small>@{creator.username}{creator.country ? ` · ${creator.country}` : ""}</small></span><strong>{creator.score.toFixed(1)}</strong></div>) : <p className="empty-inline">Nousevia creatoreita ei vielä ole.</p>}
          </section>
          <div className="league-subheading"><strong>Kausikohtaiset achievementit</strong><small>{leagueSnapshot.achievements.filter((achievement) => achievement.earned).length}/{leagueSnapshot.achievements.length} saavutettu</small></div>
          <div className="league-achievement-list">{leagueSnapshot.achievements.map((achievement) => <article className={`league-achievement${achievement.earned ? " is-earned" : ""}`} key={achievement.id}>
            <span>{achievement.icon}</span><div><strong>{achievement.name}</strong><small>{achievement.description}</small></div><b>{achievement.earned ? "✓" : `${achievement.requirement} ${achievement.requirementType === "videos" ? "videota" : "pts"}`}</b>
          </article>)}</div>
          <div className="league-subheading"><strong>Top 10 -kausipalkinnot</strong><small>Jaetaan kauden päättyessä</small></div>
          <div className="league-podium-rewards">{leagueSnapshot.podiumRewards.map(({ place, rewards }) => <article className={`league-podium-card podium-card-${place}`} key={place}>
            <h3>{place <= 3 ? ["🥇 1. sija", "🥈 2. sija", "🥉 3. sija"][place - 1] : `#${place} · Top 10`}</h3>
            {rewards.map((reward) => <span key={reward.id}><span>{reward.name}</span></span>)}
          </article>)}</div>
          <div className="league-subheading"><strong>Rankin kausipalkinnot</strong><small>Uniikki kosmetiikka korkeimman kausirankin mukaan</small></div>
          <div className="league-rank-rewards">{leagueSnapshot.rankRewards.map(({ tier, rewards }) => <article key={tier}>
            <strong>{tier}</strong>
            {rewards.map((reward) => <span className={reward.effect ? `season-effect-${reward.effect}` : ""} key={reward.id} title={reward.description}>{reward.name.replace(`${leagueSnapshot.season.name} · `, "")}</span>)}
          </article>)}</div>
          {leagueAccount && <section className="league-shared-feed">
            <div className="league-subheading"><strong>Creator League · videofeed</strong><small>Videot näkyvät kirjautuneille League-käyttäjille</small></div>
            {leagueFeed.length ? leagueFeed.map((item) => <article className="league-feed-card" key={item.id}>
              <video
                src={`/api/creator-league/feed/${encodeURIComponent(item.id)}/media`}
                controls
                preload="metadata"
                onPlay={(event) => {
                  if (lastWatchReported.current[item.id] === undefined) lastWatchReported.current[item.id] = -5;
                  reportLeagueWatch(item.id, event.currentTarget);
                }}
                onTimeUpdate={(event) => reportLeagueWatch(item.id, event.currentTarget)}
                onEnded={(event) => reportLeagueWatch(item.id, event.currentTarget, true)}
              />
              <div className="league-feed-title"><strong>{item.title}</strong><small>{item.creatorName} · {new Intl.DateTimeFormat(getLocale(), { dateStyle: "medium" }).format(new Date(item.createdAt))}</small></div>
              <div className="league-feed-metrics">
                <span>{item.metrics.views} katselua</span><span>{Math.round(item.metrics.watchSeconds / 60)} min katseluaikaa</span>
              </div>
              <div className="league-feed-actions">
                <button type="button" disabled={item.own} aria-pressed={item.liked} onClick={() => void interactWithLeagueVideo(item.id, { type: "like" })}>♥ {item.metrics.likes}</button>
                <button type="button" disabled={item.own} aria-pressed={item.saved} onClick={() => void interactWithLeagueVideo(item.id, { type: "save" })}>Tallennukset {item.metrics.saves}</button>
                <button type="button" disabled={item.own} onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(`${window.location.origin}/api/creator-league/feed/${encodeURIComponent(item.id)}/media`);
                    await interactWithLeagueVideo(item.id, { type: "share" });
                  } catch (error) {
                    setLeagueError(error instanceof Error ? error.message : "Videon jakolinkkiä ei voitu kopioida.");
                  }
                }}>Jaa {item.metrics.shares}</button>
              </div>
              <div className="league-feed-comments">
                {item.comments.map((comment) => <p key={comment.id}><strong>{comment.displayName}</strong> {comment.text}</p>)}
                <form onSubmit={(event) => void submitLeagueComment(event, item.id)}>
                  <input aria-label={`Kommentoi videota ${item.title}`} maxLength={500} value={leagueComments[item.id] ?? ""} disabled={item.own} onChange={(event) => setLeagueComments((current) => ({ ...current, [item.id]: event.target.value }))} placeholder={item.own ? "Oma video" : "Kirjoita kommentti..."} />
                  <button className="button button-secondary" type="submit" disabled={item.own || !(leagueComments[item.id] ?? "").trim()}>Kommentoi</button>
                </form>
              </div>
            </article>) : <p className="empty-inline">Creator League -videoita ei ole vielä julkaistu.</p>}
          </section>}
          {(leagueSnapshot.earnedRewards.length > 0 || state.developerUnlockedRankRewards) && <><div className="league-subheading"><strong>{state.developerUnlockedRankRewards ? "Rankkipalkinnot · Developer-esikatselu" : "Pysyvät kausipalkinnot"}</strong><small>{state.developerUnlockedRankRewards ? "Paikallinen esikatselu, ei tallennettu League-tilille" : "Tallennettu League-profiiliisi"}</small></div><div className="league-earned-rewards">{[...new Map([...leagueSnapshot.earnedRewards, ...(state.developerUnlockedRankRewards ? leagueSnapshot.rankRewards.flatMap(({ rewards }) => rewards) : [])].map((reward) => [reward.id, reward])).values()].map((reward) => <span className={`${reward.kind === "title" ? "season-reward-title " : ""}${reward.effect ? `season-effect-${reward.effect}` : ""}`} key={reward.id} title={reward.description}>{reward.name}</span>)}</div></>}
        </>}
      </div>}
      {creatorView === "studio" && <div className="draft-panel">
        <div className="panel-heading"><div><div className="eyebrow">PALAAT MYÖHEMMIN</div><h2>Drafts</h2></div><span className="count-pill">{String(state.creatorDrafts.length).padStart(2, "0")}</span></div>
        {videoError && <p className="creator-publish-error" role="alert">{videoError}</p>}
        {state.creatorDrafts.length ? state.creatorDrafts.map((draft) => <div className="draft-row draft-editor-row" key={draft.id}>
          <span className={`draft-thumb ${draft.type === "Video" ? "thumb-cyan" : "thumb-violet"}`}>{draft.type === "Video" ? "▶" : draft.type === "Post" ? "✎" : "▧"}</span>
          <div className="draft-fields">
            <input aria-label={`${draft.title} otsikko`} value={draft.title} maxLength={80} onChange={(event) => onUpdate(draft.id, { title: event.target.value, body: draft.body })} />
            <small>{draft.type} · {draft.updatedAt}</small>
            <textarea aria-label={`${draft.title} teksti`} value={draft.body} placeholder="Kirjoita luonnoksesi tähän..." rows={2} maxLength={2000} onChange={(event) => onUpdate(draft.id, { title: draft.title, body: event.target.value })} />
            {draft.type === "Video" && <div className="creator-video-publish">
              <input aria-label="Valitse videotiedosto" type="file" accept="video/*" onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                if (!file) return;
                if (file.size > 100 * 1024 * 1024) {
                  setVideoError("Videon enimmäiskoko on 100 Mt.");
                  event.currentTarget.value = "";
                  return;
                }
                setVideoError("");
                setSelectedVideos((current) => ({ ...current, [draft.id]: file }));
              }} />
              <button className="button button-secondary" type="button" disabled={!selectedVideos[draft.id] || publishingId === draft.id} onClick={() => void publishVideo(draft)}>
                {publishingId === draft.id ? "Julkaistaan..." : "Julkaise video · +25 Creator XP"}
              </button>
            </div>}
          </div>
          <button className="icon-button subtle" onClick={() => onDelete(draft.id)} aria-label={`Poista luonnos ${draft.title}`}><X size={15} /></button>
        </div>) : <p className="empty-inline">Luonnoksia ei vielä ole. Aloita ideasta yllä.</p>}
      </div>}
    </section>}
    {creatorView === "studio" && <>
    <section className="panel creator-published-panel">
      <div className="panel-heading"><div><div className="eyebrow">CREATOR FEED</div><h2>Julkaistut videot</h2></div><span className="count-pill">{String(state.creatorPosts.length).padStart(2, "0")}</span></div>
      {publishedVideoError && <p className="creator-publish-error" role="alert">{publishedVideoError}</p>}
      {state.creatorPosts.length
        ? <div className="creator-published-grid">{state.creatorPosts.map((post) => <article className="creator-published-card" key={post.id}>
          {publishedVideoUrls[post.id] ? <video src={publishedVideoUrls[post.id]} controls preload="metadata" /> : <p className="empty-inline">Videota ladataan…</p>}
          <h3>{post.title}</h3>
          {post.body && <p>{post.body}</p>}
          <small>{post.mediaName} · {new Intl.DateTimeFormat(getLocale(), { dateStyle: "medium" }).format(new Date(post.createdAt))}</small>
          {leagueAccount && !leagueSnapshot?.myStanding?.publicationIds.includes(post.id) && <button className="button button-secondary league-enroll-video" type="button" disabled={publishingId === post.id} onClick={() => void enterLeagueWithPublishedVideo(post)}>
            {publishingId === post.id ? "Lähetetään…" : "Lisää julkiseen Creator League -feediin"}
          </button>}
        </article>)}</div>
        : <p className="empty-inline">Julkaistut videot näkyvät täällä.</p>}
    </section>
    </>}
  </>;
}

type MiniGameKind = "reaction" | "memory" | "typing";

const typingSprintWords = [
  "valo",
  "rytmi",
  "ystävä",
  "peli",
  "luovuus",
  "yhteisö",
  "tavoite",
  "inspiraatio",
  "maailma",
  "kehitys",
  "videopätkä",
  "seikkailu",
];

function createTypingSprintChallenge() {
  return [...typingSprintWords]
    .sort(() => Math.random() - 0.5)
    .slice(0, 6)
    .join(" ");
}

function MiniGame({ kind, onClose, onWin }: { kind: MiniGameKind; onClose: () => void; onWin: () => void }) {
  const [phase, setPhase] = useState<"ready" | "waiting" | "go" | "result">("ready");
  const [reaction, setReaction] = useState<number | null>(null);
  const [startedAt, setStartedAt] = useState(0);
  const [typed, setTyped] = useState("");
  const [cards, setCards] = useState(() => [1, 2, 3, 4, 1, 2, 3, 4].sort(() => Math.random() - 0.5));
  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState<number[]>([]);
  const [typingChallenge, setTypingChallenge] = useState(createTypingSprintChallenge);
  const rewardGiven = useRef(false);
  const timer = useRef<number | undefined>(undefined);
  const title = kind === "reaction" ? "Reaction Test" : kind === "memory" ? "Memory Match" : "Typing Sprint";
  const win = () => {
    if (rewardGiven.current) return;
    rewardGiven.current = true;
    onWin();
  };

  useEffect(() => () => window.clearTimeout(timer.current), []);
  useEffect(() => {
    if (kind === "memory" && matched.length === cards.length && cards.length > 0) win();
  }, [cards.length, kind, matched.length]);

  function startReaction() {
    setPhase("waiting");
    setReaction(null);
    timer.current = window.setTimeout(() => {
      setStartedAt(performance.now());
      setPhase("go");
    }, 1200 + Math.random() * 2500);
  }

  function clickReaction() {
    if (kind !== "reaction") return;
    if (phase === "waiting") {
      window.clearTimeout(timer.current);
      setPhase("result");
      setReaction(-1);
    } else if (phase === "go") {
      setReaction(Math.round(performance.now() - startedAt));
      setPhase("result");
      win();
    }
  }

  function flipCard(index: number) {
    if (flipped.length >= 2 || flipped.includes(index) || matched.includes(index)) return;
    const next = [...flipped, index];
    setFlipped(next);
    if (next.length === 2) {
      if (cards[next[0]] === cards[next[1]]) {
        setMatched((current) => [...current, ...next]);
        setFlipped([]);
      } else {
        timer.current = window.setTimeout(() => setFlipped([]), 650);
      }
    }
  }

  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="mini-game-modal" role="dialog" aria-modal="true" aria-labelledby="mini-game-title"><button className="icon-button modal-close" onClick={onClose} aria-label="Sulje peli"><X size={18} /></button><span className="eyebrow">QUICK PLAY</span><h2 id="mini-game-title">{title}</h2>{kind === "reaction" && <div className={`reaction-area reaction-${phase}`} onClick={clickReaction} role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") clickReaction(); }}><strong>{phase === "ready" ? "Valmiina?" : phase === "waiting" ? "Odota vihreää..." : phase === "go" ? "NYT — KLIK!" : reaction === -1 ? "Liian aikaisin!" : `${reaction} ms`}</strong><span>{phase === "ready" || phase === "result" ? "Aloita testi klikkaamalla alta." : "Klikkaa tätä aluetta heti kun väri vaihtuu."}</span></div>}{kind === "reaction" && <button className="button button-primary" onClick={phase === "waiting" || phase === "go" ? clickReaction : startReaction}>{phase === "waiting" || phase === "go" ? "Klikkaa nyt" : "Aloita testi"}</button>}{kind === "memory" && <><p className="mini-game-instructions">Etsi kaikki neljä paria.</p><div className="memory-grid">{cards.map((card, index) => <button className={`memory-card${flipped.includes(index) || matched.includes(index) ? " memory-visible" : ""}`} key={index} onClick={() => flipCard(index)} aria-label={flipped.includes(index) || matched.includes(index) ? `Kortti ${card}` : "Piilotettu kortti"}>{flipped.includes(index) || matched.includes(index) ? ["✦", "◈", "●", "◆"][card - 1] : "?"}</button>)}</div><p className="mini-game-instructions">Parit: {matched.length / 2} / 4</p><button className="button button-secondary" onClick={() => { setCards([1, 2, 3, 4, 1, 2, 3, 4].sort(() => Math.random() - 0.5)); setMatched([]); setFlipped([]); rewardGiven.current = false; }}>Aloita alusta</button></>}{kind === "typing" && <><p className="mini-game-instructions">Kirjoita alla olevat eripituiset sanat täsmälleen oikein.</p><div className="typing-phrase" onCopy={(event) => event.preventDefault()} onContextMenu={(event) => event.preventDefault()} onDragStart={(event) => event.preventDefault()} draggable={false}>{typingChallenge}</div><textarea className="typing-input" rows={3} value={typed} onChange={(event) => { const value = event.target.value; setTyped(value); if (value === typingChallenge) win(); }} placeholder="Kirjoita sanat tähän..." /><span className="soft-label">{typed.length} / {typingChallenge.length} merkkiä</span><button className="button button-secondary" onClick={() => { setTyped(""); setTypingChallenge(createTypingSprintChallenge()); rewardGiven.current = false; }}>Uusi sanahaaste</button></>}{rewardGiven.current && <div className="mini-game-reward"><CheckCircle2 size={15} /> Minipelin suoritus tallennettu</div>}</section></div>;
}

function GamingPage({ state, onAddGame, onPlayGame, onActivity }: {
  state: NexusState;
  onAddGame: (name: string) => void;
  onPlayGame: (id: string) => void;
  onActivity: (track: ProgressionTrack, label: string) => void;
}) {
  const [newGame, setNewGame] = useState("");
  const [miniGame, setMiniGame] = useState<MiniGameKind | null>(null);
  const english = getLocale() === "en-GB";
  const completedGames = state.games.filter((game) => game.status === "completed").length;
  const totalSessions = state.games.reduce((total, game) => total + game.sessions, 0);
  const gameColors = ["orange", "green", "red", "violet", "cyan"];
  return <><PageHeading eyebrow="PLAY YOUR WAY" title="Gaming" subtitle="Pelit, saavutukset ja omat tavoitteesi — kaikki saman katon alla." action={<button className="button button-primary" onClick={() => document.getElementById("new-game-name")?.focus()}><Plus size={16} /> Lisää peli</button>} /><section className="gaming-hero"><div><span className="feature-tag"><Gamepad2 size={13} /> YOUR GAME SPACE</span><h2>Ready, player one?</h2><p>Kirjaa omat pelisessiot, seuraa etenemistä ja löydä seuraava pelisi.</p><button className="button button-light" onClick={() => state.games[0] && onPlayGame(state.games[0].id)}>Kirjaa pelisessio <ArrowRight size={15} /></button></div><div className="gaming-hero-icon"><Gamepad2 size={78} strokeWidth={1.1} /></div></section><div className="gaming-stats"><div className="stat-card"><span>GAMES IN LIBRARY</span><strong>{state.games.length}</strong><small>{english ? `${totalSessions} saved game session${totalSessions === 1 ? "" : "s"}` : `${totalSessions} tallennettua pelisessiota`}</small></div><div className="stat-card"><span>COMPLETED GAMES</span><strong>{completedGames}</strong><small>{state.games.length - completedGames} peliä kesken</small></div><div className="stat-card"><span>GAMING LEVEL</span><strong>{state.levels.gaming}<small> / {MAX_CATEGORY_LEVEL}</small></strong><small>{state.xp.gaming} / {XP_PER_LEVEL} XP seuraavaan tasoon</small></div></div><div className="section-title-row"><div><div className="eyebrow">BACK IN THE ACTION</div><h2>Your game library</h2></div><span className="soft-label">{state.games.length} peliä</span></div><form className="inline-create-form" onSubmit={(event) => { event.preventDefault(); onAddGame(newGame); setNewGame(""); }}><input id="new-game-name" aria-label="Pelin nimi" placeholder="Lisää peli kirjastoon..." value={newGame} maxLength={60} onChange={(event) => setNewGame(event.target.value)} /><button className="button button-primary" type="submit"><Plus size={15} /> Lisää peli</button></form><section className="library-grid">{state.games.map((game, index) => <article className="library-card" key={game.id}><button className={`library-art game-${gameColors[index % gameColors.length]}`} onClick={() => onPlayGame(game.id)} aria-label={`Kirjaa ${game.name} pelisessio`}><span>{game.status.toUpperCase()}</span><Gamepad2 size={30} /></button><div className="library-info"><div><h3>{game.name}</h3><span>{game.progress}% · {game.sessions} sessiota</span></div><button className="icon-button subtle" onClick={() => onPlayGame(game.id)} aria-label={`Pelaa ${game.name}`}><ArrowUpRight size={16} /></button></div><div className="game-progress"><span style={{ width: `${game.progress}%` }} /></div></article>)}</section><div className="section-title-row mini-games-heading"><div><div className="eyebrow">QUICK PLAY</div><h2>Mini games</h2></div><span className="soft-label">Tulokset tallentuvat Activityyn</span></div><section className="mini-games"><button onClick={() => setMiniGame("reaction")}><span className="mini-game-icon">⚡</span><strong>Reaction Test</strong><small>Mittaa reaktionopeutesi</small><ArrowUpRight size={15} /></button><button onClick={() => setMiniGame("memory")}><span className="mini-game-icon">◉</span><strong>Memory Match</strong><small>Etsi kaikki neljä paria</small><ArrowUpRight size={15} /></button><button onClick={() => setMiniGame("typing")}><span className="mini-game-icon">⌨</span><strong>Typing Sprint</strong><small>Testaa kirjoitustarkkuutesi</small><ArrowUpRight size={15} /></button></section>{miniGame && <MiniGame kind={miniGame} onClose={() => setMiniGame(null)} onWin={() => onActivity("gaming", `Suoritit ${miniGame} -minipelin`)} />}</>;
}

function FriendsPage({ state, onAdd }: { state: NexusState; onAdd: (friend: FriendEntry) => void }) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const friends = state.friends ?? [];
  const getFriendCode = (friend: Pick<FriendEntry, "username" | "friendCode">) => {
    if (friend.friendCode) return friend.friendCode;
    const knownCodes: Record<string, string> = { rinanorth: "NEX-RINA1", joelpixel: "NEX-JOEL2", saraflux: "NEX-SARA3" };
    return knownCodes[friend.username] ?? `NEX-${friend.username.replace(/[^a-z0-9]/gi, "").slice(0, 5).toUpperCase().padEnd(5, "0")}`;
  };
  const publicProfileDefaults: Record<string, Partial<FriendEntry>> = {
    alexmorgan: { title: "Clutch-osaaja", titles: ["Clutch-osaaja", "Turnauskaveri"], badges: ["Aim Master", "Night Owl"], trophies: ["Winter Cup 2026"], selectedTitles: ["Clutch-osaaja"], selectedBadges: ["Aim Master"], selectedTrophies: ["Winter Cup 2026"], profileBanner: "linear-gradient(110deg, #24213a, #373050 47%, #253539)", profileFrame: "diamond-2", leagueRank: "Diamond II", prestigeAvatar: "gaming-1", prestigeAvatars: ["gaming-1"], level: 82, trackLevels: { creator: 25, gaming: 43, social: 14 }, trackXp: { creator: 61, gaming: 28, social: 83 }, achievements: ["Ensimmäinen yhteys", "Viikon rytmi"] },
    mikastudio: { title: "Työkalujen rakentaja", titles: ["Työkalujen rakentaja"], badges: ["First Build", "Design Eye"], trophies: ["Creator Showcase"], selectedTitles: ["Työkalujen rakentaja"], selectedBadges: ["Design Eye"], selectedTrophies: ["Creator Showcase"], profileBanner: "linear-gradient(110deg, #17394a, #2a7d8c 55%, #69d3dc)", profileFrame: "gold-1", leagueRank: "Gold I", level: 54, trackLevels: { creator: 31, gaming: 8, social: 15 }, trackXp: { creator: 72, gaming: 42, social: 19 }, achievements: ["Rakentaja"] },
    rinanorth: { title: "Klipin leikkaaja", titles: ["Klipin leikkaaja"], badges: ["Editointi 101", "Yhteisön ääni"], trophies: ["Creator League S3"], selectedTitles: ["Klipin leikkaaja"], selectedBadges: ["Editointi 101"], selectedTrophies: ["Creator League S3"], profileBanner: "linear-gradient(110deg, #3b2a6d, #7a4fd8 55%, #d387ce)", profileFrame: "platinum-3", leagueRank: "Platinum III", level: 39, trackLevels: { creator: 24, gaming: 6, social: 9 }, trackXp: { creator: 36, gaming: 55, social: 74 }, achievements: ["Rakentaja"] },
    joelpixel: { title: "Pixel-seikkailija", titles: ["Pixel-seikkailija", "Indie-kehittäjä"], badges: ["Pixel Perfect"], trophies: ["Game Jam 2026"], selectedTitles: ["Pixel-seikkailija"], selectedBadges: ["Pixel Perfect"], selectedTrophies: ["Game Jam 2026"], profileBanner: "linear-gradient(110deg, #1d2f4a, #3a5fb0 55%, #7aa6ff)", profileFrame: "silver-2", leagueRank: "Silver II", prestigeAvatar: "creator-1", prestigeAvatars: ["creator-1"], level: 31, trackLevels: { creator: 19, gaming: 8, social: 4 }, trackXp: { creator: 58, gaming: 31, social: 87 }, achievements: ["Rakentaja"] },
    saraflux: { title: "Yhteisön ääni", titles: ["Yhteisön ääni"], badges: ["Stream Starter", "Social Spark"], trophies: [], selectedTitles: ["Yhteisön ääni"], selectedBadges: ["Social Spark"], profileBanner: "linear-gradient(110deg, #3a1d4a, #a83ca0 55%, #ff8ac2)", profileFrame: "master-3", leagueRank: "Master III", prestigeAvatar: "social-1", prestigeAvatars: ["social-1"], level: 96, trackLevels: { creator: 26, gaming: 18, social: 52 }, trackXp: { creator: 47, gaming: 66, social: 91 }, achievements: ["Ensimmäinen yhteys", "Viikon rytmi"] },
  };
  const withPublicRewards = (friend: FriendEntry): FriendEntry => ({
    ...publicProfileDefaults[friend.username],
    ...friend,
    friendCode: getFriendCode(friend),
  });
  const suggestedProfiles: FriendEntry[] = [
    { id: "suggested-rina", name: "Rina North", username: "rinanorth", friendCode: "NEX-RINA1", profileVisibility: "everyone", title: "Klipin leikkaaja", titles: ["Klipin leikkaaja"], badges: ["Editointi 101", "Yhteisön ääni"], trophies: ["Creator League S3"], bio: "Editoin peliklippiä ja rakennan yhteisöjä.", interests: ["Video editing", "Gaming"], avatar: "R", status: "online" },
    { id: "suggested-joel", name: "Joel Pixel", username: "joelpixel", friendCode: "NEX-JOEL2", profileVisibility: "everyone", title: "Pixel-seikkailija", titles: ["Pixel-seikkailija", "Indie-kehittäjä"], badges: ["Pixel Perfect"], trophies: ["Game Jam 2026"], bio: "Indie-kehittäjä ja pixel art -fani.", interests: ["Indie games", "Design"], avatar: "J", status: "offline" },
    { id: "suggested-sara", name: "Sara Flux", username: "saraflux", friendCode: "NEX-SARA3", profileVisibility: "everyone", title: "Yhteisön ääni", titles: ["Yhteisön ääni"], badges: ["Stream Starter", "Social Spark"], trophies: [], bio: "Creator, streamer ja musiikin ystävä.", interests: ["Streaming", "Music"], avatar: "S", status: "away" },
  ];
  const directory: FriendEntry[] = [...friends.map(withPublicRewards), ...suggestedProfiles.map(withPublicRewards)];
  const normalizedQuery = query.trim().toLowerCase();
  const isFriend = (id: string) => friends.some((friend) => friend.id === id);
  const visibleDirectory = directory.filter((friend, index, list) => friend.profileVisibility !== "private" &&
    (friend.profileVisibility !== "friends" || isFriend(friend.id)) &&
    list.findIndex((item) => item.id === friend.id) === index);
  const matchesQuery = (friend: FriendEntry) => `${friend.name} ${friend.username} ${friend.friendCode ?? ""} ${friend.interests.join(" ")}`.toLowerCase().includes(normalizedQuery);
  const suggestions = visibleDirectory.filter((friend) => !isFriend(friend.id) && suggestedProfiles.some((suggestion) => suggestion.id === friend.id) && matchesQuery(friend));
  const results = visibleDirectory.filter((friend) => (normalizedQuery ? matchesQuery(friend) : isFriend(friend.id)));
  const selected = visibleDirectory.find((friend) => friend.id === selectedId) ?? null;
  const renderFriendCard = (friend: FriendEntry) => <button type="button" className={`friend-card${selectedId === friend.id ? " is-selected" : ""}`} key={friend.id} onClick={() => setSelectedId(friend.id)}><span className={`friend-avatar friend-status-${friend.status}`}>{friend.avatar}</span><span className="friend-card-copy"><strong>{friend.name}</strong><small>@{friend.username} · {friend.friendCode}</small><span>{friend.bio}</span></span><span className="friend-card-action">{isFriend(friend.id) ? "Kaveri" : "Katso profiili"}</span></button>;

  return <><PageHeading eyebrow="YOUR PEOPLE" title="Kaverit" subtitle="Etsi kavereita, lisää uusia yhteyksiä ja tutustu heidän profiileihinsa." /><div className="friends-page"><section className="panel friends-search-panel"><div className="friends-search-heading"><div><span className="eyebrow">FIND YOUR PEOPLE</span><h2>Etsi kavereita</h2></div><span className="soft-label">{friends.length} kaveria</span></div><label className="friends-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Hae nimellä, kaverikoodilla tai kiinnostuksella..." aria-label="Etsi kavereita" /></label>{!normalizedQuery && <div className="friends-suggestions"><div className="friends-subheading"><div><span className="eyebrow">DISCOVER PEOPLE</span><h3>Kaveriehdotukset</h3></div><span className="soft-label">{suggestions.length} ehdotusta</span></div><div className="friends-result-grid">{suggestions.map(renderFriendCard)}</div></div>}<div className="friends-subheading friends-results-heading"><div><span className="eyebrow">{normalizedQuery ? "SEARCH RESULTS" : "YOUR FRIENDS"}</span><h3>{normalizedQuery ? "Hakutulokset" : "Omat kaverit"}</h3></div><span className="soft-label">{results.length}</span></div><div className="friends-result-grid">{results.map(renderFriendCard)}</div>{!results.length && <p className="empty-inline">{normalizedQuery ? "Kavereita ei löytynyt tällä haulla." : "Sinulla ei ole vielä kavereita."}</p>}</section>{selected && <FriendPublicProfile friend={selected} isFriend={isFriend(selected.id)} onAdd={() => { onAdd(selected); setSelectedId(selected.id); }} />}</div></>;
}

const PUBLIC_PROFILE_ACHIEVEMENTS = [
  { title: "Ensimmäinen yhteys", detail: "Lähetä ensimmäinen viesti keskustelussa.", icon: "♧" },
  { title: "Rakentaja", detail: "Luo ensimmäinen oma projektisi.", icon: "⌘" },
  { title: "Viikon rytmi", detail: "Ylläpidä 7 päivän aktiivisuusputkea.", icon: "🔥" },
];

function FriendPublicProfile({ friend, isFriend, onAdd, onBack, profileContext }: { friend: FriendEntry; isFriend?: boolean; onAdd?: () => void; onBack?: () => void; profileContext?: string }) {
  const allTitles = friend.titles ?? [];
  const allBadges = friend.badges ?? [];
  const allTrophies = friend.trophies ?? [];
  const selectedTitles = (friend.selectedTitles ?? []).filter((item) => allTitles.includes(item));
  const selectedBadges = (friend.selectedBadges ?? []).filter((item) => allBadges.includes(item));
  const selectedTrophies = (friend.selectedTrophies ?? []).filter((item) => allTrophies.includes(item));
  const trackLevels = friend.trackLevels ?? {};
  const trackXp = friend.trackXp ?? {};
  const totalLevel = friend.level ?? Object.values(trackLevels).reduce((total, level) => total + (level ?? 0), 0);
  const unlockedAchievements = friend.achievements ?? [];
  const selectedPrestige = PRESTIGE_AVATARS.find((avatar) => avatar.id === friend.prestigeAvatar);
  const prestigeAvatars = (friend.prestigeAvatars ?? [])
    .map((id) => PRESTIGE_AVATARS.find((avatar) => avatar.id === id))
    .filter((avatar): avatar is NonNullable<typeof avatar> => Boolean(avatar));
  const frameLabel = friend.profileFrame ? leagueProfileFrames.find(([id]) => id === friend.profileFrame)?.[1] : undefined;
  const avatar = <span className="avatar profile-avatar">{selectedPrestige ? <img className="prestige-avatar-img" src={selectedPrestige.src} alt="" /> : friend.avatar}</span>;
  const rewardGroups = [
    { label: "Tittelit", items: allTitles },
    { label: "Badget", items: allBadges },
    { label: "Pokaalit", items: allTrophies },
  ];

  return <section className="panel friend-profile-panel">
    <div className="friend-public-profile-heading">
      <div>{onBack && <button className="button community-back-button" type="button" onClick={onBack}>← Takaisin yhteisöön</button>}<span className="eyebrow">PUBLIC PROFILE</span><span className="soft-label">@{friend.username}{friend.friendCode ? ` · ${friend.friendCode}` : ""}{profileContext ? ` · ${profileContext}` : ""}</span></div>
      {isFriend === undefined ? null : isFriend ? <span className="soft-label">Olette kavereita</span> : <button className="button button-primary" type="button" onClick={onAdd}>Lisää kaveriksi</button>}
    </div>
    <section className="profile-overview friend-profile-overview">
      <section className={`profile-cover${friend.profileBanner ? " has-banner" : ""}`} style={friend.profileBanner ? { backgroundImage: friend.profileBanner } : undefined}>
        <span className="cover-glow cover-glow-a" /><span className="cover-glow cover-glow-b" />
        {friend.profileFrame
          ? <span className={`profile-cover-avatar profile-border-frame border-league-${friend.profileFrame}`} aria-label={`${frameLabel ?? friend.profileFrame} profiilikehys`}><LeagueFrameArt frameId={friend.profileFrame} />{avatar}<span className="profile-border-rank-mark" data-rank={friend.profileFrame.slice(-1)} aria-hidden="true" /></span>
          : <span className="profile-cover-avatar">{avatar}</span>}
      </section>
      <section className="profile-identity">
        <div className="profile-name-block"><h2>{friend.name}</h2><span>@{friend.username}</span><p>{friend.bio}</p></div>
      </section>
      {(selectedTitles.length > 0 || selectedBadges.length > 0 || selectedTrophies.length > 0) && <div className="profile-selected-rewards" aria-label={`${friend.name} valitut palkinnot`}>
        <div className="profile-selected-reward-label">Valitut palkinnot</div>
        <div className="profile-selected-reward-list">{[
          ["Tittelit", selectedTitles],
          ["Badget", selectedBadges],
          ["Pokaalit", selectedTrophies],
        ].filter(([, items]) => items.length > 0).map(([label, items]) => <div className="profile-selected-reward-group" key={label as string}>
          <div className="profile-selected-reward-group-label">{label}</div>
          <div className="profile-selected-reward-group-items">{(items as string[]).map((item) => <span className="profile-selected-reward" key={item}>{item}</span>)}</div>
        </div>)}</div>
      </div>}
    </section>
    <section className="panel friend-public-rank">
      <div className="panel-heading"><div><div className="eyebrow">CREATOR LEAGUE · RANKKIKORISTEET</div><h2>Profiilikehys</h2></div>
        <div className="friend-public-rank-info"><span className="soft-label">{friend.leagueRank ?? "Ei aktiivista kautta"}</span><span className="profile-reward-item">{frameLabel ?? "Ei valittua kehystä"}</span></div>
      </div>
    </section>
    <section className="panel friend-public-prestige">
      <div className="panel-heading"><div><div className="eyebrow">PRESTIGE</div><h2>Prestige-profiilikuvat</h2></div><span className="soft-label">{prestigeAvatars.length} avattu</span></div>
      {prestigeAvatars.length
        ? <div className="prestige-avatar-grid">{prestigeAvatars.map((prestigeAvatar) => <div className={`prestige-avatar-option${selectedPrestige?.id === prestigeAvatar.id ? " is-selected" : ""}`} key={prestigeAvatar.id}>
          <span className="avatar prestige-avatar-preview"><img className="prestige-avatar-img" src={prestigeAvatar.src} alt="" /></span>
          <span><strong>{prestigeAvatar.label}</strong><small>{selectedPrestige?.id === prestigeAvatar.id ? "Käytössä" : "Avattu"}</small></span>
        </div>)}</div>
        : <p className="empty-inline">Ei vielä avattuja Prestige-profiilikuvia.</p>}
    </section>
    <div className="profile-stats-strip">
      <div><span>ONE AETHER LEVEL</span><strong>{totalLevel}<small> / {MAX_TOTAL_LEVEL}</small></strong></div>
      <div><span>BADGES EARNED</span><strong>{allBadges.length}</strong></div>
      <div><span>CREATOR LEAGUE</span><strong>{friend.leagueRank ?? "Ei aktiivista"} <small>{friend.leagueRank ? "rankkia" : "kautta"}</small></strong></div>
    </div>
    <section className="profile-details-grid">
      <div className="panel profile-progress-panel">
        <div className="panel-heading"><div><div className="eyebrow">YOUR JOURNEY</div><h2>Level breakdown</h2></div><Trophy size={18} className="muted-icon" /></div>
        {(["creator", "gaming", "social"] as const).map((track) => {
          const level = trackLevels[track] ?? 0;
          const xp = trackXp[track] ?? 0;
          return <div className="profile-level-row" key={track}><span>{trackNames[track]}</span><div className="progress-bar"><span className={trackColors[track]} style={{ width: `${Math.min(100, Math.max(level >= MAX_CATEGORY_LEVEL ? 100 : xp, 0))}%` }} /></div><strong>{level}<small> / 150 · {xp} XP</small></strong></div>;
        })}
        <div className="profile-level-total"><span>Total level</span><strong>{totalLevel} / {MAX_TOTAL_LEVEL}</strong></div>
      </div>
      <div className="panel interests-panel">
        <div className="panel-heading"><div><div className="eyebrow">WHAT YOU'RE INTO</div><h2>Interests</h2></div></div>
        <div className="interest-tags">{friend.interests.length ? friend.interests.map((interest) => <span key={interest}>{interest}</span>) : <span>Ei ilmoitettuja kiinnostuksenkohteita</span>}</div>
        <div className="interest-note"><Heart size={14} /> Löydä samanhenkisiä ihmisiä <ArrowRight size={13} /></div>
      </div>
    </section>
    <section className="panel profile-achievements">
      <div className="panel-heading"><div><div className="eyebrow">ONE AETHER ACHIEVEMENTS</div><h2>Saavutukset</h2></div><span className="soft-label">{unlockedAchievements.length} / {PUBLIC_PROFILE_ACHIEVEMENTS.length} avattu</span></div>
      <div className="profile-achievement-list">{PUBLIC_PROFILE_ACHIEVEMENTS.map((achievement) => {
        const earned = unlockedAchievements.includes(achievement.title);
        return <article className={`profile-achievement${earned ? " is-earned" : ""}`} key={achievement.title}>
          <span className="profile-achievement-icon" aria-hidden="true">{achievement.icon}</span>
          <span className="profile-achievement-copy"><strong>{achievement.title}</strong><span>{earned ? "Saavutettu" : achievement.detail}</span></span>
        </article>;
      })}</div>
    </section>
    <section className="panel profile-rewards-panel">
      <div className="panel-heading"><div><div className="eyebrow">YOUR COLLECTION</div><h2>Tittelit, badget ja pokaalit</h2></div><span className="soft-label">{allTitles.length + allBadges.length + allTrophies.length} palkintoa</span></div>
      <div className="profile-reward-columns">{rewardGroups.map((group) => <div className="profile-reward-group" key={group.label}>
        <h3>{group.label} <small>{group.items.length}</small></h3>
        <div className="profile-reward-list">{group.items.length
          ? group.items.map((item) => <span className="profile-reward-item" key={item}>{item}</span>)
          : <span className="profile-reward-empty">Ei vielä palkintoja.</span>}</div>
      </div>)}</div>
    </section>
  </section>;
}

const MAX_OWN_COMMUNITIES = 3;
const DEMO_COMMUNITY_MEMBERS = ["Aino", "Eetu", "Mikko", "Sara", "Olli"];
const DEMO_MEMBER_PROFILES: Record<string, Partial<FriendEntry> & Pick<FriendEntry, "username" | "bio" | "interests" | "avatar" | "status">> = {
  Aino: { username: "aino.codes", bio: "Rakennan pieniä pelejä ja jaan vinkkejä yhteisölle.", profileBanner: "linear-gradient(110deg, #3b2a6d, #7a4fd8 55%, #d387ce)", profileFrame: "gold-2", leagueRank: "Gold II", titles: ["Yhteisön ääni", "Indie-kehittäjä"], badges: ["Social Spark", "Pixel Perfect"], trophies: ["Game Jam 2026"], selectedTitles: ["Yhteisön ääni"], selectedBadges: ["Social Spark"], selectedTrophies: ["Game Jam 2026"], interests: ["Indie games", "Design"], level: 14, trackLevels: { creator: 5, gaming: 3, social: 6 }, trackXp: { creator: 48, gaming: 22, social: 75 }, achievements: ["Rakentaja"], avatar: "A", status: "online" },
  Eetu: { username: "eetu_clips", bio: "Klippejä, editointia ja hyvää fiilistä.", profileBanner: "linear-gradient(110deg, #17394a, #2a7d8c 55%, #69d3dc)", profileFrame: "silver-3", leagueRank: "Silver III", titles: ["Klipin leikkaaja"], badges: ["Editointi 101"], trophies: [], selectedTitles: ["Klipin leikkaaja"], selectedBadges: ["Editointi 101"], interests: ["Video editing", "Gaming"], level: 9, trackLevels: { creator: 4, gaming: 3, social: 2 }, trackXp: { creator: 66, gaming: 18, social: 41 }, achievements: ["Ensimmäinen yhteys"], avatar: "E", status: "away" },
  Mikko: { username: "mikko.plays", bio: "Rust-pelaaja ja satunnainen streamaaja.", profileBanner: "linear-gradient(110deg, #4a2a1d, #b05a2c 55%, #f0a35c)", profileFrame: "gold-2", leagueRank: "Gold II", titles: ["Pelaaja"], badges: ["Stream Starter"], trophies: ["Creator League S3"], selectedTitles: ["Pelaaja"], selectedBadges: ["Stream Starter"], selectedTrophies: ["Creator League S3"], interests: ["Streaming", "Survival"], level: 11, trackLevels: { creator: 3, gaming: 6, social: 2 }, trackXp: { creator: 35, gaming: 84, social: 57 }, achievements: ["Viikon rytmi"], avatar: "M", status: "online" },
  Sara: { username: "saraflux", bio: "Creator, streamer ja musiikin ystävä.", profileBanner: "linear-gradient(110deg, #3a1d4a, #a83ca0 55%, #ff8ac2)", profileFrame: "platinum-1", leagueRank: "Platinum I", prestigeAvatar: "social-1", prestigeAvatars: ["social-1"], titles: ["Yhteisön ääni"], badges: ["Stream Starter", "Social Spark"], trophies: ["Creator League S3"], selectedTitles: ["Yhteisön ääni"], selectedBadges: ["Social Spark"], selectedTrophies: ["Creator League S3"], interests: ["Streaming", "Music"], level: 21, trackLevels: { creator: 7, gaming: 5, social: 9 }, trackXp: { creator: 23, gaming: 68, social: 92 }, achievements: ["Ensimmäinen yhteys", "Viikon rytmi"], avatar: "S", status: "online" },
  Olli: { username: "olli_dev", bio: "Koodaan, pelaan ja opettelen uutta joka päivä.", profileBanner: "linear-gradient(110deg, #1d2f4a, #3a5fb0 55%, #7aa6ff)", titles: ["Aloittelija"], trophies: [], badges: [], interests: ["Programming"], level: 4, trackLevels: { creator: 2, gaming: 1, social: 1 }, trackXp: { creator: 72, gaming: 11, social: 43 }, achievements: [], avatar: "O", status: "offline" },
};
const MUTE_UNITS = [
  { id: "mo", label: "kuukautta", minutes: 0, max: 12 },
  { id: "d", label: "päivää", minutes: 1440, max: 31 },
  { id: "h", label: "tuntia", minutes: 60, max: 24 },
  { id: "min", label: "minuuttia", minutes: 1, max: 60 },
  { id: "perm", label: "kunnes tauko poistetaan", minutes: 0, max: 0 },
];

function defaultCommunityRoster(community: NexusState["communities"][number], myName: string): CommunityMember[] {
  return [
    { id: "me", name: myName, role: community.owned ? "owner" : "member" },
    ...DEMO_COMMUNITY_MEMBERS.map((name, index): CommunityMember => ({ id: `demo-${index}`, name, role: !community.owned && index === 0 ? "owner" : "member" })),
  ];
}

const isMuted = (member: CommunityMember, now: number) => Boolean(member.mutedUntil && Date.parse(member.mutedUntil) > now);

function MemberProfile({ member, roleLabel, muted, communityName, onBack }: {
  member: CommunityMember;
  roleLabel: string;
  muted: boolean;
  communityName: string;
  onBack: () => void;
}) {
  const profile = DEMO_MEMBER_PROFILES[member.name] ?? {
    username: member.name.toLowerCase().replace(/\s+/g, "."),
    bio: "Tämä käyttäjä ei ole vielä kirjoittanut esittelyä.",
    interests: [],
    avatar: member.name.slice(0, 1).toLocaleUpperCase(),
    status: "offline" as const,
  };
  const friend: FriendEntry = {
    id: member.id,
    name: member.name,
    profileVisibility: "everyone",
    titles: [],
    badges: [],
    trophies: [],
    ...profile,
  };
  return <FriendPublicProfile friend={friend} onBack={onBack} profileContext={`${communityName} · ${roleLabel}${muted ? " · tauolla" : ""}`} />;
}

function CommunityRoom({ community, state, roster, onSend, onModerate, onBack, onOpenMyProfile }: {
  community: NexusState["communities"][number];
  state: NexusState;
  roster: CommunityMember[];
  onSend: (id: string, text: string) => void;
  onModerate: (id: string, update: (roster: CommunityMember[]) => CommunityMember[], notice: string) => void;
  onOpenMyProfile: () => void;
  onBack: () => void;
}) {
  const [text, setText] = useState("");
  const [muteAmount, setMuteAmount] = useState("10");
  const [muteUnit, setMuteUnit] = useState("min");
  const [muteTargetId, setMuteTargetId] = useState<string | null>(null);
  const [muteMenuOpen, setMuteMenuOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [profileMemberId, setProfileMemberId] = useState<string | null>(null);
  const [membersCollapsed, setMembersCollapsed] = useState(false);
  const openMember = (member: CommunityMember) => member.id === "me" ? onOpenMyProfile() : setProfileMemberId(member.id);
  const openAuthor = (author: string) => {
    const member = roster.find((item) => item.name === author);
    if (member) openMember(member);
  };
  const endRef = useRef<HTMLDivElement>(null);
  const messages = state.communityChats?.[community.id] ?? [];
  const me = roster.find((member) => member.id === "me");
  const myRole = me?.role ?? "member";
  const iAmMuted = me ? isMuted(me, now) : false;
  useEffect(() => { endRef.current?.scrollIntoView({ block: "end" }); }, [messages.length]);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 15000);
    return () => window.clearInterval(timer);
  }, []);
  const submit = () => {
    if (!text.trim() || iAmMuted) return;
    onSend(community.id, text);
    setText("");
  };
  const canModerate = (target: CommunityMember) => target.id !== "me" && target.role !== "owner" && (myRole === "owner" || (myRole === "admin" && target.role === "member"));
  const changeRole = (target: CommunityMember, role: CommunityMember["role"]) => onModerate(community.id, (list) => list.map((member) => member.id === target.id ? { ...member, role } : member), role === "admin" ? `${target.name} sai admin-oikeudet.` : `${target.name} ei ole enää admin.`);
  const mute = (target: CommunityMember) => {
    const unit = MUTE_UNITS.find((item) => item.id === muteUnit) ?? MUTE_UNITS[0];
    const amount = Math.min(Math.max(Math.floor(Number(muteAmount)) || 1, 1), unit.max || 1);
    const permanent = unit.id === "perm";
    const untilDate = new Date();
    if (unit.id === "mo") untilDate.setMonth(untilDate.getMonth() + amount);
    else untilDate.setTime(untilDate.getTime() + amount * unit.minutes * 60000);
    const until = permanent ? new Date("2999-01-01").toISOString() : untilDate.toISOString();
    const label = permanent ? "kunnes tauko poistetaan" : `${amount} ${unit.label}`;
    onModerate(community.id, (list) => list.map((member) => member.id === target.id ? { ...member, mutedUntil: until } : member), `${target.name} asetettiin tauolle (${label}).`);
    setMuteTargetId(null);
  };
  const unmute = (target: CommunityMember) => onModerate(community.id, (list) => list.map((member) => member.id === target.id ? { ...member, mutedUntil: undefined } : member), `${target.name} sai puheoikeuden takaisin.`);
  const kick = (target: CommunityMember) => {
    if (!window.confirm(`Heitetäänkö ${target.name} pois yhteisöstä?`)) return;
    onModerate(community.id, (list) => list.filter((member) => member.id !== target.id), `${target.name} heitettiin pois yhteisöstä.`);
  };
  const roleLabel = { owner: "Luoja", admin: "Admin", member: "Jäsen" };
  const profileMember = profileMemberId ? roster.find((member) => member.id === profileMemberId) : undefined;
  if (profileMember) return <MemberProfile member={profileMember} roleLabel={roleLabel[profileMember.role]} muted={isMuted(profileMember, now)} communityName={community.name} onBack={() => setProfileMemberId(null)} />;
  return <section className="community-room">
    <header className="community-room-head">
      <button className="button community-back-button" type="button" onClick={onBack}>← Takaisin</button>
      <div><h2>{community.name}</h2><span className="soft-label">{community.category} · {community.members.toLocaleString(getLocale())} jäsentä · Roolisi: {roleLabel[myRole]}</span></div>
    </header>
    <div className={`community-room-body${membersCollapsed ? " members-collapsed" : ""}`}>
      <div className="community-room-chat">
        <div className="community-room-messages" role="log" aria-live="polite">
          {!messages.length && <p className="empty-inline">Ei vielä viestejä. Kirjoita ensimmäinen viesti yhteisölle!</p>}
          {messages.map((message) => message.system
            ? <div key={message.id} className="community-room-system">{message.text}</div>
            : <div key={message.id} className={`community-room-message${message.own ? " own" : ""}`}><button type="button" className="community-name-link" onClick={() => openAuthor(message.author)}>{message.author}</button><p>{message.text}</p><small>{new Date(message.sentAt).toLocaleTimeString(getLocale(), { hour: "2-digit", minute: "2-digit" })}</small></div>)}
          <div ref={endRef} />
        </div>
        <form className="community-room-form" onSubmit={(event) => { event.preventDefault(); submit(); }}>
          <input value={text} maxLength={500} disabled={iAmMuted} onChange={(event) => setText(event.target.value)} placeholder={iAmMuted ? "Sinulla on tauko, et voi kirjoittaa." : "Kirjoita viesti yhteisölle..."} aria-label="Viesti yhteisölle" />
          <button className="button button-primary" type="submit" disabled={!text.trim() || iAmMuted}>Lähetä</button>
        </form>
      </div>
      <aside className={`community-room-members${membersCollapsed ? " is-collapsed" : ""}`} aria-label="Jäsenet">
        <div className="community-room-members-head">
          {!membersCollapsed && <strong>Jäsenet ({roster.length})</strong>}
          <button type="button" className="community-members-toggle" aria-label={membersCollapsed ? `Avaa jäsenlista (${roster.length})` : "Piilota jäsenlista"} aria-expanded={!membersCollapsed} onClick={() => setMembersCollapsed((collapsed) => !collapsed)}>
            {membersCollapsed ? <ChevronRight size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}
            {membersCollapsed && <span>Jäsenet ({roster.length})</span>}
          </button>
        </div>
        {!membersCollapsed && roster.map((member) => <div key={member.id} className="community-member-row">
          <div className="community-member-info"><button type="button" className="community-name-link" onClick={() => openMember(member)}>{member.id === "me" ? `${member.name} (sinä)` : member.name}</button><small>{roleLabel[member.role]}{isMuted(member, now) ? " · tauolla" : ""}</small></div>
          {canModerate(member) && <div className="community-member-actions">
            {myRole === "owner" && (member.role === "admin"
              ? <button type="button" onClick={() => changeRole(member, "member")}>Poista admin</button>
              : <button type="button" onClick={() => changeRole(member, "admin")}>Tee adminiksi</button>)}
            {isMuted(member, now) ? <button type="button" onClick={() => unmute(member)}>Poista tauko</button>             : <button type="button" onClick={() => setMuteTargetId(member.id)}>Tauolle</button>}
            <button type="button" className="danger" onClick={() => kick(member)}>Poista</button>
          </div>}
                      {muteTargetId === member.id && canModerate(member) && <form className="community-mute-form" onSubmit={(event) => { event.preventDefault(); mute(member); }}>
                        <span className="community-mute-title">Kuinka kauaksi?</span>
                        <span className="community-mute-inputs">
                          {muteUnit !== "perm" && <input type="text" inputMode="numeric" maxLength={3} autoFocus value={muteAmount} onChange={(event) => { const max = MUTE_UNITS.find((item) => item.id === muteUnit)?.max ?? 60; const digits = event.target.value.replace(/\D/g, "").slice(0, 2); setMuteAmount(digits && Number(digits) > max ? String(max) : digits); }} placeholder="10" aria-label="Tauon pituus" />}
                          <span className="community-mute-select">
                            <button type="button" className="community-mute-trigger" aria-haspopup="listbox" aria-expanded={muteMenuOpen} aria-label="Tauon yksikkö" onClick={() => setMuteMenuOpen((open) => !open)}>{MUTE_UNITS.find((item) => item.id === muteUnit)?.label}<ChevronRight size={14} className="community-mute-chevron" /></button>
                            {muteMenuOpen && <span className="community-mute-menu" role="listbox">{MUTE_UNITS.map((unit) => <button key={unit.id} type="button" role="option" aria-selected={muteUnit === unit.id} className={muteUnit === unit.id ? "active" : ""} onClick={() => { setMuteUnit(unit.id); setMuteMenuOpen(false); if (unit.max && Number(muteAmount) > unit.max) setMuteAmount(String(unit.max)); }}>{unit.label}{unit.max ? <small>max {unit.max}</small> : null}</button>)}</span>}
                          </span>
                        </span>
                        <span className="community-mute-buttons"><button type="submit" className="primary">Aseta tauolle</button><button type="button" onClick={() => setMuteTargetId(null)}>Peruuta</button></span>
                      </form>}
        </div>)}
      </aside>
    </div>
  </section>;
}

function CommunitiesPage({ state, onJoin, onCreate, onSend, onModerate, getRoster, onOpenMyProfile }: {
  state: NexusState;
  onOpenMyProfile: () => void;
  onJoin: (id: string) => void;
  onCreate: (name: string, category: string) => void;
  onSend: (id: string, text: string) => void;
  onModerate: (id: string, update: (roster: CommunityMember[]) => CommunityMember[], notice: string) => void;
  getRoster: (state: NexusState, id: string) => CommunityMember[];
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const openCommunity = openId && state.joinedCommunities.includes(openId) ? state.communities.find((community) => community.id === openId) : undefined;
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Gaming");
  const [communitySearch, setCommunitySearch] = useState("");
  const memberCommunities = state.communities.filter((community) => state.joinedCommunities.includes(community.id));
  const normalizedSearch = communitySearch.trim().toLocaleLowerCase();
  const visibleCommunities = state.communities.filter((community) =>
    !normalizedSearch ||
    community.name.toLocaleLowerCase().includes(normalizedSearch) ||
    community.category.toLocaleLowerCase().includes(normalizedSearch));
  const ownedCount = state.communities.filter((community) => community.owned).length;
  const create = () => {
    if (!name.trim() || ownedCount >= MAX_OWN_COMMUNITIES) return;
    onCreate(name, category);
    setName("");
  };
  if (openCommunity) return <CommunityRoom community={openCommunity} state={state} roster={getRoster(state, openCommunity.id)} onSend={onSend} onModerate={onModerate} onOpenMyProfile={onOpenMyProfile} onBack={() => setOpenId(null)} />;
  return <><PageHeading eyebrow="FIND YOUR PEOPLE" title="Communities" subtitle="Löydä yhteisöjä, liity mukaan tai perusta oma porukkasi." /><section className="community-feature"><div className="community-orbit"><div className="orbit-core"><UsersRound size={34} /></div><span className="orbit-avatar orbit-one">R</span><span className="orbit-avatar orbit-two">C</span><span className="orbit-avatar orbit-three">✳</span></div><div><span className="feature-tag"><UsersRound size={13} /> BUILT AROUND YOU</span><h2>Belong to<br />something bigger.</h2><p>Liity samanhenkisten ihmisten yhteisöihin ja rakenna omasi.</p><span className="soft-label">{memberCommunities.length} yhteisöäsi</span></div></section><div className="section-title-row"><div><div className="eyebrow">FIND YOUR PEOPLE</div><h2>Communities</h2></div><span className="soft-label">{visibleCommunities.length} / {state.communities.length} yhteisöä</span></div><label className="community-search"><Search size={16} /><input value={communitySearch} maxLength={60} onChange={(event) => setCommunitySearch(event.target.value)} placeholder="Hae yhteisöjä nimellä tai aiheella..." aria-label="Hae yhteisöjä" /></label><form className="inline-create-form" onSubmit={(event) => { event.preventDefault(); create(); }}><input id="community-name" aria-label="Yhteisön nimi" placeholder="Uuden yhteisön nimi..." value={name} maxLength={60} onChange={(event) => setName(event.target.value)} /><select aria-label="Yhteisön aihe" value={category} onChange={(event) => setCategory(event.target.value)}><option>Gaming</option><option>Creator</option><option>Projects</option><option>Social</option></select><button className="button button-primary" type="submit" disabled={ownedCount >= MAX_OWN_COMMUNITIES} title={ownedCount >= MAX_OWN_COMMUNITIES ? `Enintään ${MAX_OWN_COMMUNITIES} omaa yhteisöä` : undefined}><Plus size={15} /> Luo yhteisö ({ownedCount}/{MAX_OWN_COMMUNITIES})</button></form><section className="community-grid">{visibleCommunities.map((community, index) => {
    const joined = state.joinedCommunities.includes(community.id);
    const color = ["orange", "violet", "cyan"][index % 3];
    const icon = community.name.slice(0, 1).toLocaleUpperCase();
    return <article className="community-card" key={community.id}><div className={`community-cover cover-${color}`}><span className={`community-avatar avatar-${color}`}>{icon}</span><span className="community-tag">{community.category}</span></div><div className="community-card-copy"><h3>{community.name}</h3><span>{community.members.toLocaleString(getLocale())} jäsentä</span><div className="member-stack"><i>{icon}</i><i>J</i><i>A</i><small>{joined ? "Olet jäsen" : "Liity yhteisöön"}</small><button className={joined ? "community-joined" : ""} onClick={() => joined ? setOpenId(community.id) : onJoin(community.id)}>{joined ? <>Avaa <ArrowRight size={13} /></> : <>Liity <ArrowRight size={13} /></>}</button></div></div></article>;
  })}</section>{!visibleCommunities.length && <p className="empty-inline community-search-empty">Yhteisöjä ei löytynyt. Kokeile toista hakusanaa.</p>}</>;
}

function ProjectsPage({ state, onCreate, onAddTask, onMoveTask }: {
  state: NexusState;
  onCreate: (name: string) => void;
  onAddTask: (projectId: string, title: string) => void;
  onMoveTask: (projectId: string, taskId: string) => void;
}) {
  const [projectName, setProjectName] = useState("");
  const [taskDrafts, setTaskDrafts] = useState<Record<string, string>>({});
  const english = getLocale() === "en-GB";
  const create = () => {
    if (!projectName.trim()) return;
    onCreate(projectName);
    setProjectName("");
  };
  return <><PageHeading eyebrow="MAKE IT TOGETHER" title="Projects" subtitle="Luo projekteja, lisää tehtäviä ja siirrä niitä Kanbanissa." action={<button className="button button-primary" onClick={() => document.getElementById("new-project-name")?.focus()}><Plus size={16} /> Uusi projekti</button>} /><section className="projects-banner"><div><span className="feature-tag"><FolderKanban size={13} /> YOUR COLLAB SPACE</span><h2>Big ideas need<br />good people.</h2><p>Jaa projekti tehtäviin ja seuraa työn etenemistä tällä laitteella.</p></div><div className="kanban-illustration"><div><span>TO DO</span><i /><i /><i /></div><div><span>IN PROGRESS</span><i /><i /></div><div><span>DONE</span><i /><i /></div></div></section><form className="inline-create-form" onSubmit={(event) => { event.preventDefault(); create(); }}><input id="new-project-name" aria-label="Projektin nimi" placeholder="Minkä haluat rakentaa?" value={projectName} maxLength={80} onChange={(event) => setProjectName(event.target.value)} /><button className="button button-primary" type="submit"><Plus size={15} /> Luo projekti</button></form><div className="section-title-row"><div><div className="eyebrow">YOUR TEAM'S WORK</div><h2>Active projects</h2></div><span className="soft-label">{english ? `${state.projects.length} project${state.projects.length === 1 ? "" : "s"}` : `${state.projects.length} projektia`}</span></div><section className="project-kanban">{state.projects.map((project, index) => {
    const done = project.tasks.filter((task) => task.status === "done").length;
    const progress = project.tasks.length ? Math.round(done / project.tasks.length * 100) : 0;
    const draft = taskDrafts[project.id] ?? "";
    return <article className="project-board" key={project.id}><div className="project-board-head"><div className={`project-symbol project-${index % 2}`}><FolderKanban size={19} /></div><div className="project-main"><h3>{project.name}</h3><span>{project.detail}</span></div><span className="soft-label">{progress}%</span></div><div className="project-board-progress"><div className="progress-bar"><span style={{ width: `${progress}%` }} /></div><small>{done} / {project.tasks.length} tehtävää valmiina</small></div><div className="task-columns">{(["todo", "inProgress", "done"] as const).map((status) => {
      const labels = { todo: "TODO", inProgress: "IN PROGRESS", done: "DONE" };
      const tasks = project.tasks.filter((task) => task.status === status);
      return <div className={`task-column task-${status}`} key={status}><div className="task-column-heading"><span>{labels[status]}</span><span>{tasks.length}</span></div>{tasks.map((task) => <button className="kanban-task" key={task.id} onClick={() => onMoveTask(project.id, task.id)} title="Siirrä seuraavaan sarakkeeseen"><span>{task.title}</span><small>{status === "todo" ? "→ In progress" : status === "inProgress" ? "✓ Valmis" : "↺ Palauta TODO"}</small></button>)}</div>;
    })}</div><form className="task-add-form" onSubmit={(event) => { event.preventDefault(); if (!draft.trim()) return; onAddTask(project.id, draft); setTaskDrafts((current) => ({ ...current, [project.id]: "" })); }}><input aria-label={`Lisää tehtävä projektiin ${project.name}`} placeholder="Lisää tehtävä..." value={draft} maxLength={100} onChange={(event) => setTaskDrafts((current) => ({ ...current, [project.id]: event.target.value }))} /><button type="submit" aria-label="Tallenna tehtävä"><Plus size={15} /></button></form></article>;
  })}</section><section className="collab-callout"><div><span className="eyebrow">LOOKING FOR A TEAM?</span><h2>Your skills belong somewhere.</h2><p>Yhteistyömahdollisuudet julkaistaan myöhemmässä vaiheessa.</p></div><span className="soft-label">Collab Hub · suunnitteilla</span></section></>;
}

function ThemeEditor({ colors, onChange, onReset }: {
  colors: ThemeColors;
  onChange: (key: keyof ThemeColors, value: string) => void;
  onReset: () => void;
}) {
  return <>
    <p className="theme-editor-description">Muokkaa käyttöliittymän ja taustan värejä. Muutokset tallentuvat automaattisesti.</p>
    <div className="theme-live-preview" style={themeStyle(colors)} aria-label="Teeman esikatselu">
      <div><span className="eyebrow">ESIKATSELU</span><strong>NEXUS</strong><small>Oma muokattava teemasi</small></div>
      <button type="button">Korostus</button>
    </div>
    <div className="theme-color-grid">
      {themeColorFields.map(({ key, label }) => <label className="theme-color-field" key={key}>
        <span>{label}</span>
        <input type="color" value={colors[key]} onChange={(event) => onChange(key, event.target.value)} aria-label={label} />
      </label>)}
    </div>
    <button className="button button-secondary theme-reset" type="button" onClick={onReset}>Palauta oletusvärit</button>
  </>;
}

function ThemePicker(_props: { theme: NexusTheme; onSelect: (theme: NexusTheme) => void }) {
  const editor = useContext(ThemeEditorContext);
  if (!editor) throw new Error("Teemamuokkainta ei ole alustettu.");
  return <ThemeEditor {...editor} />;
}

function LevelRewardsPanel({ totalLevel }: { totalLevel: number }) {
  const [isExpanded, setIsExpanded] = useState(false);
  return <section className="panel level-rewards-panel">
    <div className="panel-heading">
      <div><div className="eyebrow">LEVEL REWARDS</div><h2>ONE AETHER -level rewardit</h2><p className="panel-heading-copy">Näe kaikki tasopalkinnot ja tarkista, mitkä niistä ovat jo avautuneet.</p></div>
      <div className="level-rewards-actions">
        <Trophy size={19} className="muted-icon" />
        <button type="button" className="text-button level-rewards-toggle" aria-expanded={isExpanded} aria-controls="progression-level-rewards" onClick={() => setIsExpanded((expanded) => !expanded)}>
          {isExpanded ? "Taita" : "Näytä palkinnot"}
          <ChevronDown size={15} aria-hidden="true" />
        </button>
      </div>
    </div>
    {isExpanded && <div className="level-reward-list" id="progression-level-rewards">
      {totalLevelMilestones.map((milestone) => {
        const isUnlocked = totalLevel >= milestone.level;
        return <article className={`level-reward-card${isUnlocked ? " is-unlocked" : ""}`} key={milestone.level}>
          <div className="level-reward-header">
            <span className="level-reward-level">{milestone.level}</span>
            <div><strong>{milestone.title}</strong><small>{isUnlocked ? "Avattu" : `${milestone.level - totalLevel} leveliä jäljellä`}</small></div>
            <span className="level-reward-status">{isUnlocked ? "✓" : "🔒"}</span>
          </div>
          <div className="level-reward-items">
            <span><i>{milestone.itemIcon}</i>{milestone.item}<small>Keräilyesine</small></span>
            <span><i>{milestone.badgeIcon}</i>{milestone.badge}<small>Merkki</small></span>
            <span><i>✧</i>{milestone.title}<small>Titteli</small></span>
          </div>
        </article>;
      })}
    </div>}
  </section>;
}

function XpLevelRewardsPanel({ totalLevel }: { totalLevel: number }) {
  const [isExpanded, setIsExpanded] = useState(false);
  return <section className="panel xp-all-level-rewards" aria-labelledby="xp-level-rewards-heading">
    <div className="panel-heading">
      <div>
        <div className="eyebrow">LEVEL REWARDS</div>
        <h2 id="xp-level-rewards-heading">ONE AETHER -level rewardit</h2>
        <p className="panel-heading-copy">Kaikki kokonaislevelin tasopalkinnot näkyvät täällä XP-etenemisen yhteydessä.</p>
      </div>
      <div className="level-rewards-actions">
        <Trophy size={19} className="muted-icon" />
        <button type="button" className="text-button level-rewards-toggle" aria-expanded={isExpanded} aria-controls="xp-level-rewards" onClick={() => setIsExpanded((expanded) => !expanded)}>
          {isExpanded ? "Taita" : "Näytä palkinnot"}
          <ChevronDown size={15} aria-hidden="true" />
        </button>
      </div>
    </div>
    {isExpanded && <div className="xp-all-level-reward-grid" id="xp-level-rewards">
      {totalLevelMilestones.map((milestone) => {
        const isEarned = totalLevel >= milestone.level;
        return <article className={`xp-all-level-reward${isEarned ? " is-earned" : ""}`} key={milestone.level}>
          <header>
            <strong>Level {milestone.level}</strong>
            <span>{isEarned ? "Avattu" : `${milestone.level - totalLevel} leveliä jäljellä`}</span>
          </header>
          <div><span className="reward-icon">{milestone.itemIcon}</span><span>{milestone.item}</span></div>
          <div><span className="reward-icon">{milestone.badgeIcon}</span><span>{milestone.badge}</span></div>
          <div><span className="reward-icon">✧</span><span>{milestone.title}</span></div>
        </article>;
      })}
    </div>}
  </section>;
}

function XpProgressPage({ state, onPrestige }: {
  state: NexusState;
  onPrestige: (track: ProgressionTrack) => void;
}) {
  const [confirmTrack, setConfirmTrack] = useState<ProgressionTrack | null>(null);
  const earnedXp = getTotalXp(state);
  const totalLevel = getTotalLevel(state);
  const today = state.xpSystem.days[getLocalDateKey()] ?? emptyXpDay();
  const english = getLocale() === "en-GB";
  const categoryLabels: Record<XpCategory, string> = {
    activity: english ? "Activity" : "Aktiivisuus",
    creator: "Creator",
    gaming: "Gaming",
    social: "Social",
  };
  return <>
    <PageHeading eyebrow="YOUR PROGRESS, AT A GLANCE" title="XP" subtitle="Seuraa kokonais-XP:tä, tasojen etenemistä ja palkintojen avautumista kaikilla poluilla." />
    <section className="xp-overview-summary">
      <div><span className="eyebrow">XP YHTEENSÄ</span><strong>{earnedXp.toLocaleString(getLocale())} <small>XP</small></strong><p>Kaikille poluille kertynyt XP</p></div>
      <div><span className="eyebrow">KOKONAISLEVEL</span><strong>{totalLevel} <small>/ {MAX_TOTAL_LEVEL}</small></strong><p>{english ? `${MAX_TOTAL_LEVEL - totalLevel} levels to max` : `${MAX_TOTAL_LEVEL - totalLevel} leveliä maksimiin`}</p></div>
      <div><span className="eyebrow">SEURAAVA LEVEL</span><strong>{totalLevel >= MAX_TOTAL_LEVEL ? "Valmis" : <>{XP_PER_LEVEL - (earnedXp % XP_PER_LEVEL)} <small>XP</small></>}</strong><p>Lähimpään seuraavaan leveliin</p></div>
    </section>
    <section className="xp-overview-summary xp-daily-summary" aria-label="XP:t tänään">
      {(["activity", "gaming", "creator", "social"] as const).map((category) =>
        <div key={category}><span className="eyebrow">{categoryLabels[category].toUpperCase()} {english ? "TODAY" : "TÄNÄÄN"}</span><strong>{today[category].toLocaleString(getLocale())} <small>XP</small></strong><p>{state.xpSystem.totals[category].toLocaleString(getLocale())} {english ? "XP total" : "XP kaikkiaan"}</p>{category === "activity" && <small>{Math.floor(today.activitySeconds / 60)} min {english ? "active time" : "aktiivista aikaa"}</small>}</div>
      )}
    </section>
    <section className="xp-rules-panel panel">
      <div className="panel-heading"><div><div className="eyebrow">{english ? "HOW XP WORKS" : "XP KERTYY AUTOMAATTISESTI"}</div><h2>{english ? "XP rules" : "Näin XP toimii"}</h2></div></div>
      <ul>
        {english ? <>
          <li>Activity time counts only while the app is visible and focused and you have interacted within the last five minutes. Activity XP is capped at 250 per day.</li>
          <li>Gaming XP uses verified daily playtime from the selected playtime source: 2 XP per 5 minutes, with no daily category cap.</li>
          <li>Messages earn 2 Social XP, up to 20 rewarded messages per day. Video stories and Creator Studio video posts share a limit of two Creator XP rewards per day.</li>
          <li>Gaming, Creator and Social each have their own levels. Each level requires 500 XP and each category caps at level {MAX_CATEGORY_LEVEL}.</li>
          <li>Total level requires 500 total XP per level and caps at level {MAX_TOTAL_LEVEL}. Rewards unlock every ten levels through level 150, then every 20 levels through the cap. Reaching the total cap stops further XP; reaching a category cap stops XP in that category.</li>
          <li>XP is awarded after a successful message or publication. Each event can earn a reward only once.</li>
          <li>Joining a community awards XP once per community. Leaving and joining again does not award it again.</li>
          <li>XP is stored locally in this browser and is not validated by a trusted server, so it is not yet suitable for payments or official competitive results.</li>
        </> : <>
          <li>Aktiivisuusaikaa kertyy vain näkyvällä, fokuksessa olevalla sivulla, kun olet käyttänyt sovellusta viimeisen viiden minuutin aikana. Activity XP:tä saa enintään 250 päivässä.</li>
          <li>Gaming XP perustuu valitun peliaikalähteen vahvistettuun päiväkohtaiseen peliaikaan: 2 XP:tä / 5 minuuttia, ilman päiväkohtaista kategoriakattoa.</li>
          <li>Viestistä saa 2 Social XP:tä enintään 20 XP-palkitusta viestistä päivässä. Videotarinat ja Creator Studion videojulkaisut jakavat kahden Creator XP -palkkion päiväkaton.</li>
          <li>Gaming-, Creator- ja Social-kategorioilla on omat tasonsa. Taso vaatii 500 XP:tä ja kategoriat yltävät tasolle {MAX_CATEGORY_LEVEL}.</li>
          <li>Kokonaisleveli vaatii 500 XP:tä tasoa kohti ja sen katto on taso {MAX_TOTAL_LEVEL}. Palkintoja saa joka kymmenennellä levelillä tasolle 150 asti ja sen jälkeen joka 20. levelillä kattoon asti. Kokonaiskaton jälkeen XP:tä ei enää kerry; kategoriakaton jälkeen kyseiseen kategoriaan ei kerry XP:tä.</li>
          <li>XP myönnetään onnistuneen viestin tai julkaisun jälkeen. Samasta tapahtumasta voi saada palkinnon vain kerran.</li>
          <li>Yhteisöön liittymisestä saa XP:n kerran yhteisöä kohden. Poistuminen ja uudelleen liittyminen eivät anna palkkiota uudelleen.</li>
          <li>XP tallennetaan tämän selaimen paikalliseen tallennustilaan, eikä luotettu palvelin varmista sitä. XP ei sovellu vielä maksuvälineeksi tai viralliseksi kilpailutulokseksi.</li>
        </>}
      </ul>
    </section>
    <XpLevelRewardsPanel totalLevel={totalLevel} />
    <section className="xp-track-list" aria-label="XP-eteneminen poluittain">
      {(["creator", "gaming", "social"] as const).map((track) => {
        const level = getTrackLevel(state, track);
        const cumulativeXp = state.xpSystem.totals[track];
        const xp = cumulativeXp % XP_PER_LEVEL;
        const progress = level >= MAX_CATEGORY_LEVEL ? 100 : (xp / XP_PER_LEVEL) * 100;
        const prestigeCount = getPrestigeCount(state, track);
        const runs = state.prestige?.[track]?.runs ?? [];
        return <article className={`xp-track-panel ${trackColors[track]}`} key={track}>
          <header className="xp-track-header">
            <div><span className={`track-icon ${track}`}><Sparkles size={15} /></span><div><span className="eyebrow">{trackNames[track].toUpperCase()} XP</span><h2>{trackNames[track]}</h2></div></div>
            <strong>{cumulativeXp.toLocaleString(getLocale())} <small>XP yhteensä</small></strong>
          </header>
          <div className="xp-track-level"><strong>Level {level} / {MAX_CATEGORY_LEVEL}</strong><span>{level >= MAX_CATEGORY_LEVEL ? "Maksimitaso saavutettu" : `${xp} / ${XP_PER_LEVEL} XP seuraavaan leveliin`}</span></div>
          <div className="progress-bar" role="progressbar" aria-label={`${trackNames[track]} XP eteneminen`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><span style={{ width: `${progress}%` }} /></div>
          <div className="prestige-block">
            <div className="prestige-head">
              <strong>{`★ Prestige ${prestigeCount} / ${PRESTIGE_MAX_ROUNDS}`}</strong>
              {canPrestige(state, track) && (confirmTrack === track
                ? <span className="prestige-confirm">
                  <small>{english ? `Level resets to 1. Your level ${MAX_CATEGORY_LEVEL} stays in history.` : `Taso nollautuu tasolle 1. Taso ${MAX_CATEGORY_LEVEL} säilyy historiassa.`}</small>
                  <button type="button" className="button button-primary" onClick={() => { setConfirmTrack(null); onPrestige(track); }}>{english ? "Confirm Prestige" : "Vahvista Prestige"}</button>
                  <button type="button" className="button button-secondary" onClick={() => setConfirmTrack(null)}>{english ? "Cancel" : "Peruuta"}</button>
                </span>
                : <button type="button" className="button button-primary" onClick={() => setConfirmTrack(track)}>{english ? "Start Prestige" : "Aloita Prestige"}</button>)}
            </div>
            {!canPrestige(state, track) && <p className="prestige-hint">{prestigeCount >= PRESTIGE_MAX_ROUNDS
              ? (english ? "Maximum Prestige reached." : "Maksimi-Prestige saavutettu.")
              : (english ? `Reach level ${MAX_CATEGORY_LEVEL} to start a Prestige round.` : `Saavuta taso ${MAX_CATEGORY_LEVEL} aloittaaksesi Prestige-kierroksen.`)}</p>}
            <ul className="prestige-rewards">{Array.from({ length: PRESTIGE_MAX_ROUNDS }, (_, index) => {
              const reward = getPrestigeReward(track, index + 1);
              const earned = state.developerUnlockedPrestige === true || prestigeCount > index;
              return <li className={`prestige-reward rarity-${reward.rarity.toLowerCase()}${earned ? " is-earned" : ""}`} key={reward.id} title={reward.badge}>
                <span aria-hidden="true">{reward.icon}</span>
                <span><strong>{reward.title}</strong><small>{`${reward.rarity} · ${earned ? (english ? "Unlocked" : "Avattu") : (english ? "Locked" : "Lukittu")}`}</small></span>
              </li>;
            })}</ul>
            {runs.length > 0 && <ol className="prestige-history">{runs.map((run) => <li key={run.round}>{`${english ? "Round" : "Kierros"} ${run.round}: ${english ? "reached level" : "saavutti tason"} ${run.level} · ${new Intl.DateTimeFormat(getLocale(), { dateStyle: "medium" }).format(new Date(run.completedAt))}`}</li>)}</ol>}
          </div>
        </article>;
      })}
    </section>
    <section className="xp-history-panel panel" aria-labelledby="xp-history-heading">
      <div className="panel-heading"><div><div className="eyebrow">VIIMEISIMMÄT ONE AETHER XP-PALKINNOT</div><h2 id="xp-history-heading">XP-historia</h2></div><span className="soft-label">{state.xpHistory.length} tapahtumaa</span></div>
      {state.xpHistory.length
        ? <ol className="xp-history-list">{state.xpHistory.slice(0, 12).map((entry) => <li key={entry.id}>
          <span className={`xp-history-icon ${trackColors[entry.track]}`}><Sparkles size={14} /></span>
          <span className="xp-history-copy"><strong>{entry.label}</strong><small>{categoryLabels[entry.track]} · {new Intl.DateTimeFormat(getLocale(), { dateStyle: "short", timeStyle: "short" }).format(new Date(entry.at))}</small></span>
          <strong className="xp-history-amount">+{entry.amount} XP</strong>
        </li>)}</ol>
        : <p className="empty-inline">XP-palkinnot näkyvät täällä, kun suoritat toimintoja.</p>}
    </section>
    <p className="local-note"><Circle size={11} /> XP-eteneminen tallennetaan paikallisesti. Peliaika ja Creator Battle -voitot haetaan kirjautuneelta ONE AETHER -palvelulta.</p>
  </>;
}

function MessagesPage({ state, onlineAccount, onlineAccountLoading, onlineFriends, onlineMessagesError, onStartOnlineConversation, onNavigateToCreator, onSendMessage, onCreateGroup, onUpdateGroup, onToggleReaction, onEditMessage, onDeleteMessage, onStoryCreated, onToast }: {
  state: NexusState;
  onlineAccount: CreatorLeagueAccount | null;
  onlineAccountLoading: boolean;
  onlineFriends: CreatorLeagueMessageFriend[];
  onlineMessagesError: string;
  onStartOnlineConversation: (friendId: string) => Promise<ConversationEntry>;
  onNavigateToCreator: () => void;
  onSendMessage: (conversationId: string, text: string) => void;
  onCreateGroup: (group: ConversationEntry) => void;
  onUpdateGroup: (groupId: string, updates: Pick<ConversationEntry, "name" | "avatar" | "members" | "admins">) => void;
  onToggleReaction: (conversationId: string, messageId: string, emoji: string) => void;
  onEditMessage: (conversationId: string, messageId: string, text: string) => void;
  onDeleteMessage: (conversationId: string, messageId: string) => void;
  onStoryCreated: (storyId: string, isVideo: boolean) => void;
  onToast: (message: string) => void;
}) {
  const [stories, setStories] = useState<LocalStory[]>([]);
  const [caption, setCaption] = useState("");
  const [messageDraft, setMessageDraft] = useState("");
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [onlineChatDialogOpen, setOnlineChatDialogOpen] = useState(false);
  const [onlineChatStarting, setOnlineChatStarting] = useState(false);
  const [groupProfileOpen, setGroupProfileOpen] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupMemberIds, setGroupMemberIds] = useState<string[]>([]);
  const [groupAvatarError, setGroupAvatarError] = useState("");
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [reactionPickerMessageId, setReactionPickerMessageId] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [messageContextMenu, setMessageContextMenu] = useState<{ messageId: string; x: number; y: number } | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [selectedConversationId, setSelectedConversationId] = useState(state.conversations[0]?.id ?? "");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [mediaError, setMediaError] = useState("");
  const [storageError, setStorageError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [viewingStory, setViewingStory] = useState<LocalStory | null>(null);
  const [callDialogOpen, setCallDialogOpen] = useState(false);
  const [callMode, setCallMode] = useState<CallMode | null>(null);
  const [callRoomCode, setCallRoomCode] = useState("");
  const [callJoinCode, setCallJoinCode] = useState("");
  const [callStatus, setCallStatus] = useState<CallStatus | null>(null);
  const [callError, setCallError] = useState("");
  const [callHistoryState, setCallHistoryState] = useState(readCallHistory);
  const [localCallStream, setLocalCallStream] = useState<MediaStream | null>(null);
  const [remoteCallStream, setRemoteCallStream] = useState<MediaStream | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const groupAvatarInput = useRef<HTMLInputElement>(null);
  const messageInput = useRef<HTMLTextAreaElement>(null);
  const editInput = useRef<HTMLTextAreaElement>(null);
  const callSession = useRef<CallSession | null>(null);
  const callRequestId = useRef(0);
  const activeCall = useRef<{
    id: string;
    conversationId: string;
    contactName: string;
    mode: CallMode;
    startedAt: string;
    connectedAt: number | null;
  } | null>(null);
  const callHistoryRef = useRef(callHistoryState.entries);
  const localCallVideo = useRef<HTMLVideoElement>(null);
  const remoteCallVideo = useRef<HTMLVideoElement>(null);
  const previewUrl = useMemo(() => selectedFile ? URL.createObjectURL(selectedFile) : "", [selectedFile]);
  const messageEmojis = [
    "😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂", "🙂", "🙃", "😉", "😊",
    "😇", "🥰", "😍", "🤩", "😘", "😗", "☺️", "😚", "😙", "🥲", "😋", "😛",
    "😜", "🤪", "😝", "🤑", "🤗", "🤭", "🫢", "🫣", "🤫", "🤔", "🫡", "🤐",
    "🤨", "😐", "😑", "😶", "🫥", "😏", "😒", "🙄", "😬", "😮", "😯", "😲",
    "🥱", "😴", "🤤", "😪", "😵", "🤯", "🥳", "😎", "🤓", "🧐", "😕", "🫤",
    "😟", "🙁", "☹️", "😮‍💨", "😢", "😭", "😤", "😠", "😡", "🤬", "😳", "🥺",
    "😱", "😨", "😰", "😥", "😓", "🤗", "🫶", "🤝", "👍", "👎", "👏", "🙌",
    "👐", "🤲", "🙏", "✌️", "🤞", "🫰", "🤟", "🤘", "👌", "🤌", "🤏", "👋",
    "💪", "🦾", "✍️", "💅", "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍",
    "🤎", "🩷", "🩵", "🩶", "💔", "❤️‍🔥", "💕", "💞", "💖", "💘", "💝", "💟",
    "💌", "💋", "💯", "💥", "💫", "💦", "💨", "💤", "✨", "🌟", "⭐", "🔥",
    "🌈", "☀️", "🌙", "⚡", "❄️", "☔", "🌸", "🌹", "🌻", "🌺", "🍀", "🌿",
    "🐱", "🐶", "🐼", "🦊", "🐸", "🐵", "🦄", "🐝", "🦋", "🐢", "🐬", "🦖",
    "🍎", "🍓", "🍒", "🍉", "🍕", "🍔", "🍟", "🌮", "🍣", "🍩", "🍪", "🎂",
    "☕", "🧋", "🎮", "🎧", "🎵", "🎶", "🎤", "🎨", "🎉", "🎊", "🎁", "🏆",
    "⚽", "🏀", "🎯", "🚀", "💡", "📸", "✅", "❌", "❓", "❗", "💬", "👀",
  ];

  function startEditingMessage(messageId: string, text: string) {
    setMessageContextMenu(null);
    setReactionPickerMessageId(null);
    setEmojiPickerOpen(false);
    setEditingMessageId(messageId);
    setEditDraft(text);
    requestAnimationFrame(() => editInput.current?.focus());
  }

  function saveMessageEdit(conversationId: string, messageId: string) {
    if (!editDraft.trim()) return;
    onEditMessage(conversationId, messageId, editDraft);
    setEditingMessageId(null);
    setEmojiPickerOpen(false);
    setEditDraft("");
  }

  function deleteConversationMessage(conversationId: string, messageId: string) {
    const conversation = state.conversations.find((item) => item.id === conversationId);
    const message = conversation?.messages.find((item) => item.id === messageId);
    const isGroupModerator = Boolean(conversation?.isGroup
      && (conversation.createdBy === state.profile.username || conversation.admins?.includes(state.profile.username)));
    if (!message || (message.direction !== "outgoing" && !isGroupModerator)) {
      setMessageContextMenu(null);
      return;
    }
    if (!window.confirm("Poistetaanko tämä viesti?")) return;
    onDeleteMessage(conversationId, messageId);
    if (editingMessageId === messageId) {
      setEditingMessageId(null);
      setEditDraft("");
    }
    if (reactionPickerMessageId === messageId) setReactionPickerMessageId(null);
    setMessageContextMenu(null);
  }

  function openMessageActions(messageId: string, button: HTMLButtonElement, isOutgoing: boolean) {
    const bounds = button.getBoundingClientRect();
    const menuHeight = isOutgoing ? 112 : 78;
    setReactionPickerMessageId(null);
    setMessageContextMenu((current) => current?.messageId === messageId ? null : {
      messageId,
      x: Math.max(8, Math.min(bounds.right - 176, window.innerWidth - 184)),
      y: Math.max(8, Math.min(bounds.bottom + 4, window.innerHeight - menuHeight - 8)),
    });
  }

  function insertEditEmoji(emoji: string) {
    const input = editInput.current;
    if (!input) return;
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const next = `${editDraft.slice(0, start)}${emoji}${editDraft.slice(end)}`;
    const caret = start + emoji.length;
    setEditDraft(next);
    setEmojiPickerOpen(false);
    requestAnimationFrame(() => {
      input.focus();
      input.setSelectionRange(caret, caret);
    });
  }

  function insertMessageEmoji(emoji: string) {
    const input = messageInput.current;
    if (!input) return;
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const next = `${messageDraft.slice(0, start)}${emoji}${messageDraft.slice(end)}`;
    const caret = start + emoji.length;
    setMessageDraft(next);
    setEmojiPickerOpen(false);
    requestAnimationFrame(() => {
      input.focus();
      input.setSelectionRange(caret, caret);
    });
  }

  function createGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = groupName.trim();
    const members = state.conversations.filter((conversation) => groupMemberIds.includes(conversation.id));
    if (!name || members.length < 2) return;
    const group: ConversationEntry = {
      id: crypto.randomUUID(),
      name,
      avatar: "👥",
      color: "violet",
      messages: [],
      isGroup: true,
      members: members.map((member) => member.id),
      createdBy: state.profile.username,
      admins: [],
    };
    onCreateGroup(group);
    setSelectedConversationId(group.id);
    setGroupDialogOpen(false);
    setGroupName("");
    setGroupMemberIds([]);
  }

  async function createOnlineChat(friend: CreatorLeagueMessageFriend) {
    setOnlineChatStarting(true);
    try {
      const conversation = await onStartOnlineConversation(friend.id);
      setSelectedConversationId(conversation.id);
      setOnlineChatDialogOpen(false);
    } catch (error) {
      onToast(error instanceof Error ? error.message : "Verkkokeskustelua ei voitu aloittaa.");
    } finally {
      setOnlineChatStarting(false);
    }
  }

  function openGroupProfile(group: ConversationEntry) {
    setGroupName(group.name);
    setGroupAvatarError("");
    setGroupProfileOpen(true);
  }

  function updateSelectedGroup(updates: Partial<Pick<ConversationEntry, "name" | "avatar" | "members" | "admins">>) {
    if (!selectedConversation?.isGroup) return;
    onUpdateGroup(selectedConversation.id, {
      name: updates.name ?? selectedConversation.name,
      avatar: updates.avatar ?? selectedConversation.avatar,
      members: updates.members ?? selectedConversation.members ?? [],
      admins: updates.admins ?? selectedConversation.admins ?? [],
    });
  }

  function saveGroupProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = groupName.trim();
    if (!selectedConversation?.isGroup || !name) return;
    updateSelectedGroup({ name });
    setGroupProfileOpen(false);
    onToast("Ryhmän profiili tallennettiin.");
  }

  function chooseGroupAvatar(file?: File) {
    setGroupAvatarError("");
    if (!file || !selectedConversation?.isGroup) return;
    if (!file.type.startsWith("image/")) {
      setGroupAvatarError("Valitse kuvatiedosto.");
      return;
    }
    if (file.size > 500 * 1024) {
      setGroupAvatarError("Ryhmän kuva saa olla enintään 500 kt.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string" || !reader.result.startsWith("data:image/")) {
        setGroupAvatarError("Kuvaa ei voitu lukea. Valitse toinen tiedosto.");
        return;
      }
      updateSelectedGroup({ avatar: reader.result });
      onToast("Ryhmän kuva vaihdettiin.");
    };
    reader.onerror = () => setGroupAvatarError("Kuvan lukeminen epäonnistui. Yritä uudelleen.");
    reader.readAsDataURL(file);
  }

  function toggleGroupAdmin(memberId: string) {
    if (!selectedConversation?.isGroup || selectedConversation.createdBy !== state.profile.username) return;
    const admins = selectedConversation.admins ?? [];
    updateSelectedGroup({
      admins: admins.includes(memberId) ? admins.filter((id) => id !== memberId) : [...admins, memberId],
    });
  }

  function removeGroupMember(memberId: string) {
    if (!selectedConversation?.isGroup) return;
    const isCreator = selectedConversation.createdBy === state.profile.username;
    const isAdmin = (selectedConversation.admins ?? []).includes(state.profile.username);
    const memberIsAdmin = (selectedConversation.admins ?? []).includes(memberId);
    if (memberId === selectedConversation.createdBy || (!isCreator && (!isAdmin || memberIsAdmin))) return;
    if (!window.confirm(`Poistetaanko ${state.conversations.find((conversation) => conversation.id === memberId)?.name ?? "jäsen"} ryhmästä?`)) return;
    updateSelectedGroup({
      members: (selectedConversation.members ?? []).filter((id) => id !== memberId),
      admins: (selectedConversation.admins ?? []).filter((id) => id !== memberId),
    });
  }

  useEffect(() => {
    let active = true;
    getLocalStories()
      .then((items) => { if (active) setStories(items); })
      .catch((error: unknown) => {
        if (active) setStorageError(error instanceof Error ? error.message : "Tarinoita ei voitu ladata.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  useEffect(() => () => {
    callRequestId.current += 1;
    if (activeCall.current) {
      const active = activeCall.current;
      const entry: CallHistoryEntry = {
        id: active.id,
        conversationId: active.conversationId,
        contactName: active.contactName,
        mode: active.mode,
        startedAt: active.startedAt,
        durationSeconds: active.connectedAt === null ? 0 : Math.max(0, Math.floor((Date.now() - active.connectedAt) / 1000)),
        outcome: active.connectedAt === null ? "missed" : "completed",
      };
      try {
        localStorage.setItem(CALL_HISTORY_STORAGE_KEY, JSON.stringify([entry, ...callHistoryRef.current].slice(0, 100)));
      } catch (error) {
        console.error("Puheluhistorian tallennus epäonnistui.", error);
      }
      activeCall.current = null;
    }
    callSession.current?.stop();
  }, []);

  useEffect(() => {
    if (localCallVideo.current) localCallVideo.current.srcObject = localCallStream;
  }, [callDialogOpen, callMode, localCallStream]);

  useEffect(() => {
    if (remoteCallVideo.current) remoteCallVideo.current.srcObject = remoteCallStream;
  }, [callDialogOpen, callMode, remoteCallStream]);

  function recordCallHistory() {
    const active = activeCall.current;
    if (active) {
      const now = Date.now();
      const nextEntry: CallHistoryEntry = {
        id: active.id,
        conversationId: active.conversationId,
        contactName: active.contactName,
        mode: active.mode,
        startedAt: active.startedAt,
        durationSeconds: active.connectedAt === null ? 0 : Math.max(0, Math.floor((now - active.connectedAt) / 1000)),
        outcome: active.connectedAt === null ? "missed" : "completed",
      };
      const nextHistory = [nextEntry, ...callHistoryRef.current].slice(0, 100);
      activeCall.current = null;
      callHistoryRef.current = nextHistory;
      setCallHistoryState({ entries: nextHistory, error: "" });
      try {
        localStorage.setItem(CALL_HISTORY_STORAGE_KEY, JSON.stringify(nextHistory));
      } catch (error) {
        const message = error instanceof Error ? error.message : "Puheluhistorian tallennus epäonnistui.";
        setCallHistoryState({ entries: nextHistory, error: `Puheluhistoriaa ei voitu tallentaa: ${message}` });
      }
    }
  }

  function clearCallHistory() {
    if (!callHistoryRef.current.length || !window.confirm("Tyhjennetäänkö koko soittohistoria?")) return;
    try {
      localStorage.removeItem(CALL_HISTORY_STORAGE_KEY);
      callHistoryRef.current = [];
      setCallHistoryState({ entries: [], error: "" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Puheluhistorian tyhjennys epäonnistui.";
      setCallHistoryState((current) => ({ ...current, error: `Puheluhistoriaa ei voitu tyhjentää: ${message}` }));
    }
  }

  function endCall() {
    callRequestId.current += 1;
    recordCallHistory();
    callSession.current?.stop();
    callSession.current = null;
    setCallDialogOpen(false);
    setCallMode(null);
    setCallRoomCode("");
    setCallStatus(null);
    setCallError("");
    setLocalCallStream(null);
    setRemoteCallStream(null);
  }

  async function startCall(mode: CallMode, room?: string) {
    if (callSession.current || callMode) return;
    const normalizedRoom = room?.trim().toUpperCase() ?? `${mode === "video" ? "V" : "A"}-${crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()}`;
    if (!/^[AV]-[A-Z0-9]{8}$/.test(normalizedRoom)) {
      setCallError("Tarkista kutsukoodin muoto.");
      setCallDialogOpen(true);
      return;
    }
    const roomMode: CallMode = normalizedRoom.startsWith("V-") ? "video" : "audio";
    const requestId = ++callRequestId.current;
    activeCall.current = {
      id: crypto.randomUUID(),
      conversationId: selectedConversationId,
      contactName: state.conversations.find((conversation) => conversation.id === selectedConversationId)?.name ?? "Tuntematon",
      mode: roomMode,
      startedAt: new Date().toISOString(),
      connectedAt: null,
    };
    setCallMode(roomMode);
    setCallRoomCode(normalizedRoom);
    setCallError("");
    setCallStatus("waiting");
    setCallDialogOpen(true);
    try {
      const session = await CallSession.connect(normalizedRoom, roomMode, {
        onStatus: (status) => {
          setCallStatus(status);
          if (status === "connected" && activeCall.current?.connectedAt === null) {
            activeCall.current.connectedAt = Date.now();
          }
        },
        onError: setCallError,
        onRemoteStream: setRemoteCallStream,
      });
      if (requestId !== callRequestId.current) {
        session.stop();
        return;
      }
      callSession.current = session;
      setLocalCallStream(session.localStream);
    } catch (error) {
      if (requestId !== callRequestId.current) return;
      const mediaErrorName = error instanceof DOMException ? error.name : "";
      const message = mediaErrorName === "NotAllowedError" || mediaErrorName === "SecurityError"
        ? "Salli mikrofonin ja kameran käyttö selaimessa ja yritä uudelleen."
        : mediaErrorName === "NotFoundError"
          ? "Mikrofonia tai kameraa ei löytynyt."
          : mediaErrorName === "NotReadableError"
            ? "Mikrofoni tai kamera on jo käytössä."
            : error instanceof Error ? error.message : "Puhelun käynnistäminen epäonnistui.";
      setCallError(message);
      setCallStatus(null);
    }
  }

  async function copyCallCode() {
    try {
      await navigator.clipboard.writeText(callRoomCode);
      onToast("Kutsukoodi kopioitiin.");
    } catch {
      setCallError("Koodia ei voitu kopioida. Valitse se ja kopioi käsin.");
    }
  }

  function chooseMedia(file?: File) {
    setMediaError("");
    if (!file) return;
    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      setSelectedFile(null);
      setMediaError("Valitse kuva tai videotiedosto.");
      return;
    }
    setSelectedFile(file);
    setComposerOpen(true);
  }

  async function createStory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedFile) {
      setMediaError("Valitse ensin kuva tai video tarinaasi.");
      return;
    }
    setSaving(true);
    setMediaError("");
    try {
      const story: LocalStory = {
        id: crypto.randomUUID(),
        caption: caption.trim(),
        media: selectedFile,
        mediaType: selectedFile.type.startsWith("video/") ? "video" : "image",
        mediaName: selectedFile.name,
        createdAt: Date.now(),
      };
      await saveLocalStory(story);
      setStories((current) => [story, ...current]);
      onStoryCreated(story.id, story.mediaType === "video");
      setCaption("");
      setSelectedFile(null);
      setComposerOpen(false);
      if (fileInput.current) fileInput.current.value = "";
      onToast("Tarina tallennettiin tälle laitteelle.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Tarinan tallennus epäonnistui.";
      setStorageError(message);
      onToast("Tarinaa ei voitu tallentaa. Tarkista selaimen tallennustila.");
    } finally {
      setSaving(false);
    }
  }

  async function removeStory(id: string) {
    try {
      await deleteLocalStory(id);
      setStories((current) => current.filter((story) => story.id !== id));
      setStorageError("");
      onToast("Tarina poistettiin.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Tarinan poistaminen epäonnistui.";
      setStorageError(message);
      onToast("Tarinan poistaminen epäonnistui.");
    }
  }

  const selectedConversation = state.conversations.find((item) => item.id === selectedConversationId);
  const isSelectedGroupModerator = Boolean(selectedConversation?.isGroup
    && (selectedConversation.createdBy === state.profile.username || selectedConversation.admins?.includes(state.profile.username)));
  const isSelectedGroupCreator = Boolean(selectedConversation?.isGroup && selectedConversation.createdBy === state.profile.username);
  const selectedGroupAdmins = selectedConversation?.admins ?? [];
  const selectedGroupMembers = (selectedConversation?.members ?? [])
    .map((memberId) => state.conversations.find((conversation) => conversation.id === memberId))
    .filter((conversation): conversation is ConversationEntry => Boolean(conversation));

  return <>
    <PageHeading eyebrow="STAY IN THE LOOP" title="Messages" subtitle="Kirjaudu Creator Leagueen ja keskustele siellä kavereidesi kanssa verkossa. Muut keskustelut ja tarinat pysyvät tällä laitteella." action={<><button className="button button-primary" onClick={() => setOnlineChatDialogOpen(true)}><MessageSquare size={16} /> Verkkoviesti</button><button className="button button-secondary" onClick={() => setGroupDialogOpen(true)}><UsersRound size={16} /> Luo ryhmä</button></>} />
    <section className="stories-section" aria-labelledby="stories-heading">
      <div className="stories-heading">
        <div><div className="eyebrow">JAA HETKI</div><h2 id="stories-heading">Tarinat</h2></div>
        <span className="soft-label">Tallennetaan vain tälle laitteelle</span>
      </div>
      <div className="story-list" aria-live="polite">
        <button className="story-bubble story-create-bubble" type="button" onClick={() => fileInput.current?.click()}>
          <span className="story-bubble-ring"><Plus size={22} /></span><span>Luo tarina</span>
        </button>
        {loading && <p className="empty-inline">Ladataan tarinoita...</p>}
        {stories.map((story) => <StoryCard key={story.id} story={story} onOpen={() => setViewingStory(story)} onDelete={() => void removeStory(story.id)} />)}
      </div>
      <input ref={fileInput} className="story-file-input" type="file" accept="image/*,video/*" aria-label="Valitse tarinaan kuva tai video" onChange={(event) => chooseMedia(event.target.files?.[0])} />
      {storageError && <p className="story-error" role="alert">{storageError} Tarinat tallennetaan tämän selaimen IndexedDB-tallennukseen.</p>}
      {!loading && stories.length === 0 && <p className="story-empty">Aloita jakamalla kuva tai video.</p>}
    </section>
    {composerOpen && selectedFile && <div className="story-composer-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setComposerOpen(false); }}>
      <form className="story-composer-dialog" role="dialog" aria-modal="true" aria-labelledby="story-composer-title" onSubmit={(event) => void createStory(event)}>
        <div className="story-composer-heading"><div><span className="eyebrow">JAA HETKI</span><h2 id="story-composer-title">Uusi tarina</h2></div><button className="icon-button" type="button" onClick={() => setComposerOpen(false)} aria-label="Sulje tarinan luonti" disabled={saving}><X size={18} /></button></div>
        <div className="story-composer-preview">{selectedFile.type.startsWith("video/")
          ? <video src={previewUrl} controls muted aria-label="Videon esikatselu" />
          : <img src={previewUrl} alt="Valitun kuvan esikatselu" />}</div>
        <label className="story-caption-label" htmlFor="story-caption">Kuvateksti</label>
        <textarea className="story-caption-input" id="story-caption" rows={2} maxLength={240} placeholder="Mitä haluat jakaa?" value={caption} onChange={(event) => setCaption(event.target.value)} />
        <div className="story-file-name" title={selectedFile.name}>{selectedFile.name}</div>
        {mediaError && <p className="story-error" role="alert">{mediaError}</p>}
        <div className="story-composer-actions">
          <button className="button button-secondary" type="button" onClick={() => { setComposerOpen(false); setSelectedFile(null); setCaption(""); setMediaError(""); if (fileInput.current) fileInput.current.value = ""; }}>Peruuta</button>
          <button className="button button-primary" type="submit" disabled={saving}>{saving ? "Tallennetaan..." : "Luo tarina"}</button>
        </div>
      </form>
    </div>}
    {viewingStory && <StoryViewer story={viewingStory} onClose={() => setViewingStory(null)} />}
    <section className="messages-panel">
      <div className="message-list">
        <div className="message-list-heading"><strong>Conversations</strong><span className="soft-label">{state.conversations.length}</span></div>
        {onlineMessagesError && <p className="story-error" role="alert">{onlineMessagesError}</p>}
        {state.conversations.map((conversation) => {
          const latest = conversation.messages[conversation.messages.length - 1];
          const memberCount = (conversation.members?.length ?? 0) + (conversation.isGroup ? 1 : 0);
          return <button className={`conversation-row${conversation.id === selectedConversationId ? " is-selected" : ""}`} key={conversation.id} onClick={() => setSelectedConversationId(conversation.id)}>
            <ConversationAvatar avatar={conversation.avatar} color={conversation.color} online={!conversation.isGroup} />
            <span className="conversation-copy"><strong>{conversation.name}</strong><small>{conversation.isGroup ? `${memberCount} jäsentä` : latest?.text ?? "Aloita keskustelu"}</small></span>
            <span className="conversation-time">{formatConversationTime(latest?.sentAt)}</span>
          </button>;
        })}
        {!state.conversations.length && <p className="empty-inline">Keskusteluja ei vielä ole.</p>}
      </div>
      {selectedConversation ? <div className="message-chat">
        <header className="message-chat-heading">
          {selectedConversation.isGroup
            ? <button className="message-chat-contact group-profile-trigger" type="button" onClick={() => openGroupProfile(selectedConversation)} aria-label="Avaa ryhmän profiili">
              <ConversationAvatar avatar={selectedConversation.avatar} color={selectedConversation.color} />
              <span><strong>{selectedConversation.name}</strong><small>Ryhmän profiili · {(selectedConversation.members?.length ?? 0) + 1} jäsentä</small></span>
            </button>
            : <>
              <ConversationAvatar avatar={selectedConversation.avatar} color={selectedConversation.color} />
              <div className="message-chat-contact"><strong>{selectedConversation.name}</strong><small>{selectedConversation.online ? `Creator League · @${onlineFriends.find((friend) => friend.id === selectedConversation.peerUserId)?.username ?? "kaveri"}` : "Paikallinen keskustelu"}</small></div>
            </>}
          <div className="message-call-actions">
            {callMode ? <>
              <span className="message-call-status">{callStatus === "connected" ? "Puhelu käynnissä" : "Odotetaan osallistujaa"}</span>
              <button className="message-call-button" type="button" onClick={() => setCallDialogOpen(true)} aria-label="Avaa puhelu"><Phone size={14} /> Puhelu</button>
              <button className="message-call-button message-call-end" type="button" onClick={endCall} aria-label="Lopeta puhelu"><PhoneOff size={14} /></button>
            </> : <>
              <button className="message-call-button" type="button" onClick={() => void startCall("audio")} aria-label="Aloita äänipuhelu"><Phone size={14} /> Ääni</button>
              <button className="message-call-button" type="button" onClick={() => void startCall("video")} aria-label="Aloita videopuhelu"><Video size={14} /> Video</button>
              <button className="message-call-button" type="button" onClick={() => { setCallError(""); setCallDialogOpen(true); }}>Liity koodilla</button>
            </>}
          </div>
        </header>
        <div className="message-chat-history" aria-live="polite" aria-label={`Keskustelu henkilön ${selectedConversation.name} kanssa`}>
          {selectedConversation.messages.map((message) => {
            const isEditing = editingMessageId === message.id;
            const reactions = message.reactions ?? [];
            return <article className={`chat-message ${message.direction}${reactionPickerMessageId === message.id ? " has-reaction-picker" : ""}`} key={message.id} onContextMenu={(event) => {
              event.preventDefault();
              setReactionPickerMessageId(null);
              setMessageContextMenu({
                messageId: message.id,
                x: Math.max(8, Math.min(event.clientX, window.innerWidth - 188)),
                y: Math.max(8, Math.min(event.clientY, window.innerHeight - (message.direction === "outgoing" || isSelectedGroupModerator ? 164 : 125))),
              });
            }}>
              {isEditing
                ? <form className="chat-message-edit" onSubmit={(event) => {
                  event.preventDefault();
                  saveMessageEdit(selectedConversation.id, message.id);
                }}>
                  <div className="chat-message-edit-input">
                    <textarea ref={editInput} aria-label="Muokkaa viestiä" maxLength={1000} value={editDraft} onChange={(event) => setEditDraft(event.target.value)} />
                  </div>
                  <time dateTime={message.sentAt}>{formatConversationTime(message.sentAt)}</time>
                  <div className="chat-message-edit-actions">
                    <button className="chat-message-action" type="submit" disabled={!editDraft.trim()}>Tallenna muokkaus</button>
                    <button className="chat-message-action" type="button" onClick={() => { setEditingMessageId(null); setEmojiPickerOpen(false); setEditDraft(""); }}>Peruuta muokkaus</button>
                  </div>
                  <div className="chat-message-edit-reaction">
                    <button
                      className="chat-message-action"
                      type="button"
                      aria-label={reactionPickerMessageId === message.id ? "Sulje reaktiovalikko" : "Lisää reaktio"}
                      aria-expanded={reactionPickerMessageId === message.id}
                      onClick={() => setReactionPickerMessageId((current) => current === message.id ? null : message.id)}
                    >😊 <span>Reagoi</span></button>
                  </div>
                </form>
                : <>
                  <p>{message.text}</p>
                  <time dateTime={message.sentAt}>{formatConversationTime(message.sentAt)}</time>
                  <div className="chat-message-actions">
                    <button className="chat-message-action chat-message-more-action" type="button" aria-label="Lisää viestin toimintoja" aria-haspopup="menu" aria-expanded={messageContextMenu?.messageId === message.id} onClick={(event) => openMessageActions(message.id, event.currentTarget, message.direction === "outgoing" || isSelectedGroupModerator)}><MoreHorizontal size={16} /></button>
                  </div>
                </>}
              {(reactions.length > 0 || reactionPickerMessageId === message.id) && <div className="chat-message-reactions" role="group" aria-label="Viestireaktiot">
                {reactions.map((emoji) => (
                  <button className="chat-reaction is-selected" type="button" key={`${message.id}-${emoji}`} aria-label={`Poista reaktio ${emoji}`} aria-pressed="true" onClick={() => onToggleReaction(selectedConversation.id, message.id, emoji)}>{emoji}</button>
                ))}
                {reactionPickerMessageId === message.id && <div className="message-emoji-picker message-reaction-picker" role="group" aria-label="Valitse emoji reaktioksi" onWheel={(event) => event.stopPropagation()}>
                  <button className="emoji-picker-close" type="button" aria-label="Sulje reaktiovalikko" onClick={() => setReactionPickerMessageId(null)}>Sulje</button>
                  {messageEmojis.map((emoji, index) => <button key={`${message.id}-pick-${index}`} type="button" aria-label={`Reagoi ${emoji}`} aria-pressed={reactions.includes(emoji)} disabled={reactions.length >= 8 && !reactions.includes(emoji)} onClick={() => {
                    onToggleReaction(selectedConversation.id, message.id, emoji);
                    setReactionPickerMessageId(null);
                  }}>{emoji}</button>)}
                </div>}
              </div>}
            </article>;
          })}
          {!selectedConversation.messages.length && <p className="empty-inline">Lähetä ensimmäinen viesti tähän keskusteluun.</p>}
        </div>
        {messageContextMenu && selectedConversation.messages.some((message) => message.id === messageContextMenu.messageId) && <div className="message-context-backdrop" role="presentation" onMouseDown={() => setMessageContextMenu(null)} onContextMenu={(event) => { event.preventDefault(); setMessageContextMenu(null); }}>
          <div className="message-context-menu" role="menu" aria-label="Viestin toiminnot" style={{ left: messageContextMenu.x, top: messageContextMenu.y }} onMouseDown={(event) => event.stopPropagation()}>
            {selectedConversation.messages.find((message) => message.id === messageContextMenu.messageId)?.direction === "outgoing" && <button type="button" role="menuitem" onClick={() => {
              const message = selectedConversation.messages.find((item) => item.id === messageContextMenu.messageId);
              if (message) startEditingMessage(message.id, message.text);
            }}>Muokkaa</button>}
            <button type="button" role="menuitem" onClick={() => {
              const messageId = messageContextMenu.messageId;
              setMessageContextMenu(null);
              setReactionPickerMessageId(messageId);
            }}>Reagoi</button>
            {(selectedConversation.messages.find((message) => message.id === messageContextMenu.messageId)?.direction === "outgoing" || isSelectedGroupModerator) && <button className="message-context-delete" type="button" role="menuitem" onClick={() => deleteConversationMessage(selectedConversation.id, messageContextMenu.messageId)}><Trash2 size={13} /> Poista</button>}
          </div>
        </div>}
        <form className="message-composer" onSubmit={(event) => {
          event.preventDefault();
          if (!messageDraft.trim()) return;
          onSendMessage(selectedConversation.id, messageDraft);
          setMessageDraft("");
        }}>
          <div className="message-composer-input">
            <textarea ref={messageInput} id="message-composer" aria-label="Kirjoita viesti" placeholder="Kirjoita viesti..." rows={2} maxLength={1000} value={messageDraft} onChange={(event) => setMessageDraft(event.target.value)} />
            {emojiPickerOpen && <div className="message-emoji-picker" role="group" aria-label="Valitse emoji" onWheel={(event) => event.stopPropagation()}>
              <button className="emoji-picker-close" type="button" aria-label="Sulje emoji-valikko" onClick={() => setEmojiPickerOpen(false)}>Sulje</button>
              {messageEmojis.map((emoji, index) => <button key={`${emoji}-${index}`} type="button" aria-label={`Lisää ${emoji}`} onPointerDown={(event) => event.preventDefault()} onClick={() => editingMessageId ? insertEditEmoji(emoji) : insertMessageEmoji(emoji)}>{emoji}</button>)}
            </div>}
          </div>
          <button className="message-emoji-toggle" type="button" aria-label={emojiPickerOpen ? "Sulje emoji-valikko" : "Lisää emoji"} aria-expanded={emojiPickerOpen} onClick={() => setEmojiPickerOpen((open) => !open)}><span aria-hidden="true">😊</span></button>
          <button className="button button-primary" type="submit" disabled={!messageDraft.trim()}><ArrowRight size={15} /> Lähetä</button>
          <small>+2 Social XP / viesti · enintään 20 viestiä päivässä</small>
        </form>
      </div> : <div className="message-empty"><div className="message-empty-icon"><MessageSquare size={26} /></div><h2>Viestit odottavat.</h2><p>Valitse keskustelu vasemmalta tai palaa myöhemmin.</p><span className="soft-label"><span className="online-dot" /> Tallennetaan vain tälle laitteelle</span></div>}
      {callDialogOpen && <div className="call-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !callMode) setCallDialogOpen(false); }}>
        <section className="call-dialog" role="dialog" aria-modal="true" aria-labelledby="call-dialog-title">
          <header className="call-dialog-heading">
            <div><span className="eyebrow">NEXUS CALL</span><h2 id="call-dialog-title">{callMode === "video" ? "Videopuhelu" : callMode === "audio" ? "Äänipuhelu" : "Liity puheluun"}</h2></div>
            <div className="call-dialog-heading-actions">
              {callMode && <button className="message-call-button" type="button" onClick={() => setCallDialogOpen(false)}>Piilota</button>}
              <button className="icon-button" type="button" onClick={endCall} aria-label="Lopeta puhelu ja sulje"><X size={18} /></button>
            </div>
          </header>
          {callMode ? <>
            <p className="call-dialog-hint">Jaa kutsukoodi toiselle henkilölle. Koodi yhdistää puheluun, kun hän liittyy samalla koodilla.</p>
            <div className="call-invite-code"><strong>{callRoomCode}</strong><button className="message-call-button" type="button" onClick={() => void copyCallCode()}>Kopioi koodi</button></div>
            <p className="call-connection-status" role="status">{callError || (callStatus === "connected" ? "Yhteys muodostettu." : callStatus === "connecting" ? "Muodostetaan yhteyttä…" : "Odotetaan toista osallistujaa…")}</p>
            <div className={`call-media-stage${callMode === "audio" ? " is-audio" : ""}`}>
              {remoteCallStream
                ? <video ref={remoteCallVideo} className="call-remote-video" autoPlay playsInline aria-label="Toisen osallistujan video" />
                : <div className="call-waiting-message">{selectedConversation ? <ConversationAvatar avatar={selectedConversation.avatar} color={selectedConversation.color} /> : <span>N</span>}<strong>Odotetaan osallistujaa…</strong></div>}
              {callMode === "video" && <video ref={localCallVideo} className="call-local-video" autoPlay muted playsInline aria-label="Oman kameran esikatselu" />}
            </div>
            <div className="call-dialog-actions"><button className="button button-danger" type="button" onClick={endCall}><PhoneOff size={15} /> Lopeta puhelu</button></div>
          </> : <form className="call-join-form" onSubmit={(event) => {
            event.preventDefault();
            void startCall(callJoinCode.trim().toUpperCase().startsWith("V-") ? "video" : "audio", callJoinCode);
          }}>
            <p className="call-dialog-hint">Pyydä soittajalta kutsukoodi ja liity hänen ääni- tai videopuheluunsa.</p>
            <label htmlFor="call-invite-input">Kutsukoodi</label>
            <input id="call-invite-input" autoComplete="off" maxLength={10} placeholder="A-1234ABCD tai V-1234ABCD" value={callJoinCode} onChange={(event) => setCallJoinCode(event.target.value.toUpperCase())} />
            {callError && <p className="call-connection-status is-error" role="alert">{callError}</p>}
            <div className="call-dialog-actions"><button className="button button-primary" type="submit" disabled={!callJoinCode.trim()}><Phone size={15} /> Liity puheluun</button></div>
          </form>}
        </section>
      </div>}
      {onlineChatDialogOpen && <div className="call-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !onlineChatStarting) setOnlineChatDialogOpen(false); }}>
        <section className="call-dialog group-create-dialog" role="dialog" aria-modal="true" aria-labelledby="online-chat-title">
          <header className="call-dialog-heading">
            <div><span className="eyebrow">CREATOR LEAGUE</span><h2 id="online-chat-title">Verkkoviesti</h2></div>
            <button className="icon-button" type="button" onClick={() => setOnlineChatDialogOpen(false)} aria-label="Sulje verkkoviestit" disabled={onlineChatStarting}><X size={18} /></button>
          </header>
          {onlineAccountLoading
            ? <p className="call-dialog-hint">Tarkistetaan kirjautumista...</p>
            : !onlineAccount
              ? <><p className="call-dialog-hint">Kirjaudu Creator Leagueen, jotta voit keskustella verkossa muiden käyttäjien kanssa.</p><div className="call-dialog-actions"><button className="button button-primary" type="button" onClick={onNavigateToCreator}>Avaa Creator League</button></div></>
              : <>
                <p className="call-dialog-hint">Verkkokeskustelu alkaa Creator League -kavereidesi kanssa. Uudet viestit synkronoituvat automaattisesti.</p>
                {onlineMessagesError && <p className="story-error" role="alert">{onlineMessagesError}</p>}
                <div className="group-member-picker" role="list" aria-label="Creator League -kaverit">
                  {onlineFriends.map((friend) => <button className="group-member-option" type="button" role="listitem" key={friend.id} disabled={onlineChatStarting} onClick={() => void createOnlineChat(friend)}>
                    <ConversationAvatar avatar={[...friend.displayName][0]?.toUpperCase() ?? "?"} color="cyan" online />
                    <span><strong>{friend.displayName}</strong><small>@{friend.username}</small></span>
                  </button>)}
                  {onlineFriends.length === 0 && <p className="empty-inline">Sinulla ei ole Creator League -kavereita vielä. Lisää kavereita Creator Leaguen Social-näkymässä.</p>}
                </div>
                {onlineChatStarting && <p className="call-dialog-hint">Avataan verkkokeskustelua...</p>}
                {onlineFriends.length === 0 && <div className="call-dialog-actions"><button className="button button-primary" type="button" onClick={onNavigateToCreator}>Avaa Creator League</button></div>}
              </>}
        </section>
      </div>}
      {groupDialogOpen && <div className="call-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setGroupDialogOpen(false); }}>
        <form className="call-dialog group-create-dialog" role="dialog" aria-modal="true" aria-labelledby="group-create-title" onSubmit={createGroup}>
          <header className="call-dialog-heading">
            <div><span className="eyebrow">MESSAGES</span><h2 id="group-create-title">Luo ryhmä</h2></div>
            <button className="icon-button" type="button" onClick={() => setGroupDialogOpen(false)} aria-label="Sulje ryhmän luonti"><X size={18} /></button>
          </header>
          <p className="call-dialog-hint">Nimeä ryhmä ja valitse vähintään kaksi jäsentä yhteystiedoista.</p>
          <label className="group-create-label" htmlFor="group-name">Ryhmän nimi</label>
          <input className="group-create-name" id="group-name" autoFocus maxLength={40} placeholder="Esim. Peliporukka" value={groupName} onChange={(event) => setGroupName(event.target.value)} required />
          <fieldset className="group-member-picker">
            <legend>Ryhmän jäsenet ({groupMemberIds.length})</legend>
            {state.conversations.filter((conversation) => !conversation.isGroup && !conversation.online).map((conversation) => (
              <label className="group-member-option" key={conversation.id}>
                <input type="checkbox" checked={groupMemberIds.includes(conversation.id)} onChange={(event) => setGroupMemberIds((current) => event.target.checked
                  ? [...current, conversation.id]
                  : current.filter((id) => id !== conversation.id))} />
                <ConversationAvatar avatar={conversation.avatar} color={conversation.color} />
                <span>{conversation.name}</span>
              </label>
            ))}
            {!state.conversations.some((conversation) => !conversation.isGroup && !conversation.online) && <p className="empty-inline">Yhteystietoja ei ole saatavilla.</p>}
          </fieldset>
          {groupMemberIds.length < 2 && <p className="group-create-hint">Valitse vähintään kaksi jäsentä.</p>}
          <div className="call-dialog-actions">
            <button className="button button-secondary" type="button" onClick={() => setGroupDialogOpen(false)}>Peruuta</button>
            <button className="button button-primary" type="submit" disabled={!groupName.trim() || groupMemberIds.length < 2}><UsersRound size={15} /> Luo ryhmä</button>
          </div>
        </form>
      </div>}
      {groupProfileOpen && selectedConversation?.isGroup && <div className="call-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setGroupProfileOpen(false); }}>
        <form className="call-dialog group-profile-dialog" role="dialog" aria-modal="true" aria-labelledby="group-profile-title" onSubmit={saveGroupProfile}>
          <header className="call-dialog-heading">
            <div><span className="eyebrow">GROUP PROFILE</span><h2 id="group-profile-title">Ryhmän profiili</h2></div>
            <button className="icon-button" type="button" onClick={() => setGroupProfileOpen(false)} aria-label="Sulje ryhmän profiili"><X size={18} /></button>
          </header>
          <div className="group-profile-avatar-row">
            <ConversationAvatar avatar={selectedConversation.avatar} color={selectedConversation.color} />
            {isSelectedGroupCreator && <>
              <button className="button button-secondary" type="button" onClick={() => groupAvatarInput.current?.click()}>Vaihda ryhmän kuva</button>
              <input ref={groupAvatarInput} className="story-file-input" type="file" accept="image/*" aria-label="Valitse ryhmän profiilikuva" onChange={(event) => {
                chooseGroupAvatar(event.target.files?.[0]);
                event.target.value = "";
              }} />
            </>}
          </div>
          {isSelectedGroupCreator
            ? <label className="group-create-label" htmlFor="group-profile-name">Ryhmän nimi<input className="group-create-name" id="group-profile-name" maxLength={40} value={groupName} onChange={(event) => setGroupName(event.target.value)} required /></label>
            : <p className="group-profile-name-readonly">{selectedConversation.name}</p>}
          {groupAvatarError && <p className="call-connection-status is-error" role="alert">{groupAvatarError}</p>}
          <fieldset className="group-member-picker group-profile-members">
            <legend>Jäsenet ({selectedGroupMembers.length + 1})</legend>
            <div className="group-profile-member">
              <ConversationAvatar avatar={state.profile.avatar} color="violet" />
              <span className="group-profile-member-name">{state.profile.name}</span>
              <span className="group-member-role">Luoja</span>
            </div>
            {selectedGroupMembers.map((member) => {
              const isAdmin = selectedGroupAdmins.includes(member.id);
              const canRemove = isSelectedGroupCreator || (!isAdmin && member.id !== selectedConversation.createdBy && selectedGroupAdmins.includes(state.profile.username));
              return <div className="group-profile-member" key={member.id}>
                <ConversationAvatar avatar={member.avatar} color={member.color} />
                <span className="group-profile-member-name">{member.name}</span>
                {isAdmin && <span className="group-member-role">Ylläpitäjä</span>}
                {isSelectedGroupCreator && <button className="text-button group-member-role-button" type="button" onClick={() => toggleGroupAdmin(member.id)}>{isAdmin ? "Poista ylläpitäjyys" : "Nimeä ylläpitäjäksi"}</button>}
                {canRemove && <button className="icon-button group-member-remove" type="button" onClick={() => removeGroupMember(member.id)} aria-label={`Poista ${member.name} ryhmästä`}><Trash2 size={14} /></button>}
              </div>;
            })}
          </fieldset>
          <div className="call-dialog-actions">
            <button className="button button-secondary" type="button" onClick={() => setGroupProfileOpen(false)}>Sulje</button>
            {isSelectedGroupCreator && <button className="button button-primary" type="submit" disabled={!groupName.trim() || groupName.trim() === selectedConversation.name}>Tallenna muutokset</button>}
          </div>
        </form>
      </div>}
    </section>
    <section className="call-history-panel panel" aria-labelledby="call-history-title">
      <div className="panel-heading">
        <div><div className="eyebrow">NEXUS CALL</div><h2 id="call-history-title">Soittohistoria</h2></div>
        <div className="call-history-heading-actions">
          <button className="text-button call-history-clear" type="button" onClick={clearCallHistory} disabled={!callHistoryState.entries.length}><Trash2 size={13} /> Tyhjennä historia</button>
          <span className="soft-label"><span>{callHistoryState.entries.length}</span> <span>{callHistoryState.entries.length === 1 ? "puhelu" : "puhelua"}</span></span>
        </div>
      </div>
      {callHistoryState.error && <p className="call-history-error" role="alert">{callHistoryState.error}</p>}
      {callHistoryState.entries.length
        ? <ol className="call-history-list">{callHistoryState.entries.map((entry) => <li className="call-history-row" key={entry.id}>
          <span className="call-history-icon">{entry.mode === "video" ? <Video size={15} /> : <Phone size={15} />}</span>
          <span className="call-history-copy">
            <strong>{entry.contactName}</strong>
            <small>{entry.mode === "video" ? "Videopuhelu" : "Äänipuhelu"} · {new Intl.DateTimeFormat(getLocale(), { dateStyle: "medium", timeStyle: "short" }).format(new Date(entry.startedAt))}</small>
          </span>
          <span className="call-history-duration">
            <strong>{formatCallDuration(entry.durationSeconds)}</strong>
            {entry.outcome === "missed" && <small>Ei yhdistynyt</small>}
          </span>
        </li>)}</ol>
        : <p className="empty-inline">Soittohistoria näkyy täällä puheluiden jälkeen.</p>}
      <p className="local-note"><Circle size={11} /> Soittohistoria tallennetaan vain tähän selaimeen.</p>
    </section>
  </>;
}

function StoryCard({ story, onOpen, onDelete }: { story: LocalStory; onOpen: () => void; onDelete: () => void }) {
  const mediaUrl = useMemo(() => URL.createObjectURL(story.media), [story.media]);
  useEffect(() => () => URL.revokeObjectURL(mediaUrl), [mediaUrl]);

  return <article className="story-bubble">
    <button className="story-bubble-open" type="button" onClick={onOpen} aria-label={`Avaa tarina: ${story.caption || story.mediaName}`}>
      <span className="story-bubble-ring">
        {story.mediaType === "video"
          ? <><video className="story-bubble-media" src={mediaUrl} muted preload="metadata" /><span className="story-video-mark"><Video size={14} /></span></>
          : <img className="story-bubble-media" src={mediaUrl} alt="" />}
      </span>
      <span className="story-bubble-caption">{story.caption || "Oma tarina"}</span>
    </button>
    <button className="story-bubble-delete" type="button" onClick={onDelete} aria-label={`Poista tarina ${story.caption || story.mediaName}`}><Trash2 size={13} /></button>
  </article>;
}

function StoryViewer({ story, onClose }: { story: LocalStory; onClose: () => void }) {
  const mediaUrl = useMemo(() => URL.createObjectURL(story.media), [story.media]);
  useEffect(() => () => URL.revokeObjectURL(mediaUrl), [mediaUrl]);
  return <div className="story-viewer-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="story-viewer" role="dialog" aria-modal="true" aria-label="Tarina">
      <button className="icon-button story-viewer-close" type="button" onClick={onClose} aria-label="Sulje tarina"><X size={19} /></button>
      {story.mediaType === "video"
        ? <video className="story-viewer-media" src={mediaUrl} controls autoPlay />
        : <img className="story-viewer-media" src={mediaUrl} alt={story.caption || story.mediaName} />}
      {story.caption && <p>{story.caption}</p>}
    </section>
  </div>;
}

function ProgressionPage({ state, totalLevel }: { state: NexusState; totalLevel: number }) {
  const unlocked = getUnlockedRewards(totalLevel);
  const nextRewards = rewardCatalog
    .filter((reward) => reward.level > totalLevel)
    .map((reward) => ({
      ...reward,
      xpRemaining: Math.max(0, reward.level * XP_PER_LEVEL - getTotalXp(state)),
    }))
    .sort((first, second) => first.xpRemaining - second.xpRemaining)
    .slice(0, 3);
  const prestigeRewards = getEarnedPrestigeRewards(state);
  const countRewards = (type: RewardCategory) => unlocked.filter((reward) => reward.type === type).length + (type === "Badge" || type === "Title" ? prestigeRewards.length : 0);
  return <>
    <PageHeading eyebrow="ONE AETHER XP & REWARDS" title="Your progression" subtitle="XP kasvattaa kokonaisleveliä ja Creator-, Gaming- ja Social-kategorioiden tasoja. Palkinnot avautuvat tasovirstanpylväissä." />
    <section className="progression-summary">
      <div className="progression-total-icon"><Sparkles size={22} /></div>
      <div>
        <span className="eyebrow">ONE AETHER TOTAL LEVEL</span>
        <strong>{totalLevel}<small> / {MAX_TOTAL_LEVEL}</small></strong>
        <p>{totalLevel >= MAX_TOTAL_LEVEL ? "Maksimitaso saavutettu." : `${MAX_TOTAL_LEVEL - totalLevel} tasoa maksimiin.`}</p>
      </div>
      <div className="summary-progress">
        <div className="progress-bar"><span style={{ width: `${(totalLevel / MAX_TOTAL_LEVEL) * 100}%` }} /></div>
        <span>{Math.round((totalLevel / MAX_TOTAL_LEVEL) * 100)}% kokonaismatkasta · {getTotalXp(state).toLocaleString(getLocale())} XP yhteensä</span>
      </div>
    </section>
    <section className="progression-tracks">
      {(["creator", "gaming", "social"] as const).map((track) =>
        <ProgressCard key={track} track={track} level={getTrackLevel(state, track)} xp={state.xpSystem.totals[track] % XP_PER_LEVEL} />
      )}
    </section>
    <div className="progression-bottom">
      <div className="panel rewards-panel">
        <div className="panel-heading">
          <div><div className="eyebrow">MILESTONES AHEAD</div><h2>Your next rewards</h2></div>
          <Trophy size={19} className="muted-icon" />
        </div>
        {nextRewards.map((reward) => <div className="reward-row" key={reward.id}>
          <span className="reward-icon">{reward.icon}</span>
          <span><strong>{reward.name}</strong><small>{getRewardCategoryLabel(reward.type)} · {reward.xpRemaining} XP jäljellä</small></span>
          <ArrowUpRight size={15} />
        </div>)}
        {!nextRewards.length && <p className="empty-inline">Kaikki ONE AETHERin rewardit on avattu.</p>}
      </div>
      <div className="panel collection-panel">
        <div className="panel-heading"><div><div className="eyebrow">YOUR COLLECTION</div><h2>Earned so far</h2></div></div>
        <div className="collection-counts">
          <div><span className="collection-icon badge-collection">✦</span><strong>{countRewards("Badge")}</strong><small>Badges</small></div>
          <div><span className="collection-icon title-collection">♛</span><strong>{countRewards("Title")}</strong><small>Titles</small></div>
          <div><span className="collection-icon item-collection">◇</span><strong>{countRewards("Item")}</strong><small>Items</small></div>
        </div>
        <div className="collection-note"><Sparkles size={14} /> Palkinnot ovat ONE AETHERin tasopalkintoja.</div>
      </div>
    </div>
    <LevelRewardsPanel totalLevel={totalLevel} />
    <div className="skill-tree-panel">
      <div><div className="eyebrow">GROW YOUR CRAFT</div><h2>Skill trees are coming.</h2><p>Editing, aim, collaboration ja muut erikoistumiset saavat omat polkunsa.</p></div>
      <div className="skill-nodes"><span>CREATOR</span><i /><i /><i /><span>GAMING</span><i /><i /><i /><span>SOCIAL</span><i /><i /><i /></div>
    </div>
  </>;
}

function ProfilePage({ state, totalLevel, onActivity, onEdit, onSetBanner, onSetState, onSelectLeagueFrame }: {
  state: NexusState;
  totalLevel: number;
  onActivity: (track: ProgressionTrack, label: string) => void;
  onEdit: () => void;
  onSetBanner: (bannerImage?: string) => void;
  onSetState: Dispatch<SetStateAction<NexusState>>;
  onSelectLeagueFrame: (frame: NexusState["profile"]["leagueBronzeFrame"]) => void;
}) {
  const [leagueSnapshot, setLeagueSnapshot] = useState<CreatorLeagueSnapshot | null>(null);
  const [leagueError, setLeagueError] = useState("");
  const [bannerError, setBannerError] = useState("");
  const [showLeagueFrames, setShowLeagueFrames] = useState(false);
  const [showPrestigeAvatars, setShowPrestigeAvatars] = useState(false);
  async function chooseBanner(file?: File) {
    setBannerError("");
    if (!file) return;
    try {
      onSetBanner(await prepareProfileBanner(file));
    } catch (error) {
      setBannerError(error instanceof Error ? error.message : "Bannerikuvaa ei voitu tallentaa.");
    }
  }
  useEffect(() => {
    let active = true;
    getCreatorLeagueSnapshot()
      .then((snapshot) => {
        if (active) setLeagueSnapshot(snapshot);
      })
      .catch((error: unknown) => {
        if (active) setLeagueError(error instanceof Error ? error.message : "Creator League -rankkia ei voitu ladata.");
      });
    return () => { active = false; };
  }, []);
  const rewards = getUnlockedRewards(totalLevel);
  const prestigeRewards = getEarnedPrestigeRewards(state);
  const unlockedTitles = rewards.filter((reward) => reward.type === "Title");
  const unlockedBadges = [
    ...rewards.filter((reward) => reward.type === "Badge"),
    ...prestigeRewards.map((reward) => ({ id: reward.id, name: reward.badge, icon: reward.icon })),
  ];
  const trophies = leagueSnapshot?.earnedRewards.filter((reward) => reward.kind === "trophy") ?? [];
  const badgeCount = unlockedBadges.length;
  const selectedTitles = state.profile.selectedTitles ?? [];
  const selectedBadges = state.profile.selectedBadges ?? [];
  const selectedTrophies = state.profile.selectedTrophies ?? [];
  const [showCollection, setShowCollection] = useState(true);
  const [showTitles, setShowTitles] = useState(false);
  const [showBadges, setShowBadges] = useState(false);
  const [showTrophies, setShowTrophies] = useState(false);
  const openRewardSections = Number(showTitles) + Number(showBadges) + Number(showTrophies);
  const peakLeaguePoints = leagueSnapshot?.leagueProfile?.peakRank.rating ?? -1;
  const today = getLocalDateKey();
  const yesterday = getPreviousLocalDateKey();
  const currentStreak = state.lastActiveDate === today || state.lastActiveDate === yesterday ? state.streakDays : 0;
  const sampleProjectIds = new Set(["project-northern-lights", "project-creator-toolkit"]);
  const achievements = [
    {
      title: "Ensimmäinen yhteys",
      detail: "Lähetä ensimmäinen viesti keskustelussa.",
      icon: "♧",
      earned: state.conversations.some((conversation) => conversation.messages.some((message) => message.direction === "outgoing")),
    },
    {
      title: "Rakentaja",
      detail: "Luo ensimmäinen oma projektisi.",
      icon: "⌘",
      earned: state.projects.some((project) => !sampleProjectIds.has(project.id)),
    },
    {
      title: "Viikon rytmi",
      detail: "Ylläpidä 7 päivän aktiivisuusputkea.",
      icon: "🔥",
      earned: currentStreak >= 7,
    },
  ];
  function toggleCollectionReward(kind: "title" | "badge" | "trophy", id: string) {
    onSetState((current) => {
      const key = kind === "title" ? "selectedTitles" : kind === "badge" ? "selectedBadges" : "selectedTrophies";
      const selected = current.profile[key] ?? [];
      const limit = kind === "trophy" ? 1 : 3;
      const next = selected.includes(id) ? selected.filter((item) => item !== id) : selected.length < limit ? [...selected, id] : selected;
      return { ...current, profile: { ...current.profile, [key]: next } };
    });
  }
  return <><PageHeading eyebrow="YOUR IDENTITY, YOUR STORY" title="My Profile" subtitle="Tämä on sinun nurkkauksesi NEXUS-universumissa." action={<div className="profile-header-actions"><button type="button" className="button button-secondary profile-edit-button" onClick={onEdit}><Settings2 size={16} /> Muokkaa profiilia</button><button type="button" className="button button-secondary" onClick={() => onActivity("social", "Jaoit profiilisi")}><ArrowUpRight size={14} /> Jaa profiili</button></div>} /><section className="profile-overview"><section className={`profile-cover${state.profile.bannerImage ? " has-banner" : ""}`} style={state.profile.bannerImage ? { backgroundImage: `linear-gradient(90deg, #11182730, #11182718), url("${state.profile.bannerImage}")` } : undefined}><span className="cover-glow cover-glow-a" /><span className="cover-glow cover-glow-b" /><div className="profile-cover-actions">{state.profile.bannerImage ? <button className="profile-cover-remove" type="button" onClick={() => { onSetBanner(undefined); setBannerError(""); }}>Poista banneri</button> : <label className="profile-cover-upload"><ImagePlus size={14} />Lataa banneri<input type="file" accept="image/jpeg,image/png,image/webp" aria-label="Lataa profiilibanneri" onChange={(event) => { void chooseBanner(event.target.files?.[0]); event.target.value = ""; }} /></label>}</div>{bannerError && <p className="profile-cover-error" role="alert">{bannerError}</p>}{state.profile.leagueBronzeFrame ? <span className={`profile-cover-avatar profile-border-frame border-league-${state.profile.leagueBronzeFrame}`} aria-label={`${leagueProfileFrames.find(([id]) => id === state.profile.leagueBronzeFrame)?.[1]} profiilikehys`}><LeagueFrameArt frameId={state.profile.leagueBronzeFrame} /><span className="avatar profile-avatar"><AvatarFace state={state} /></span><span className="profile-border-rank-mark" data-rank={state.profile.leagueBronzeFrame.slice(-1)} aria-hidden="true" /></span> : <span className="profile-cover-avatar"><span className="avatar profile-avatar"><AvatarFace state={state} /></span></span>}</section><section className="profile-identity"><div className="profile-name-block"><h2>{state.profile.name}</h2><span>@{state.profile.username}</span><p>{state.profile.bio}</p></div></section>{(selectedTitles.length > 0 || selectedBadges.length > 0 || selectedTrophies.length > 0) && <div className="profile-selected-rewards" aria-label="Valitut palkinnot profiilissa"><div className="profile-selected-reward-label">Valitut palkinnot</div><div className="profile-selected-reward-list">{selectedTitles.length > 0 && <div className="profile-selected-reward-group"><div className="profile-selected-reward-group-label">Tittelit</div><div className="profile-selected-reward-group-items">{unlockedTitles.filter((reward) => selectedTitles.includes(reward.id)).map((reward) => <span className="profile-selected-reward" key={reward.id}>{reward.name}</span>)}</div></div>}{selectedBadges.length > 0 && <div className="profile-selected-reward-group"><div className="profile-selected-reward-group-label">Badget</div><div className="profile-selected-reward-group-items">{unlockedBadges.filter((reward) => selectedBadges.includes(reward.id)).map((reward) => <span className="profile-selected-reward" key={reward.id}>{reward.name}</span>)}</div></div>}{selectedTrophies.length > 0 && <div className="profile-selected-reward-group"><div className="profile-selected-reward-group-label">Pokaalit</div><div className="profile-selected-reward-group-items">{trophies.filter((reward) => selectedTrophies.includes(reward.id)).map((reward) => <span className="profile-selected-reward" key={reward.id}>{reward.name}</span>)}</div></div>}</div></div>}</section><section className="panel profile-border-gallery-panel">
    <div className="panel-heading"><div><div className="eyebrow">CREATOR LEAGUE · RANKKIKORISTEET</div><h2>Profiilikehys</h2></div><div className="profile-border-controls"><span className="soft-label">{leagueSnapshot?.leagueProfile?.peakRank.label ?? "Rankki lukitaan League-tilillä"}</span><button className="text-button profile-border-toggle" type="button" aria-expanded={showLeagueFrames} aria-controls="league-profile-frame-options" onClick={() => setShowLeagueFrames((visible) => !visible)}>{showLeagueFrames ? "Piilota kehykset" : "Näytä kehykset"}</button></div></div>
    {showLeagueFrames && <>
      <p className="panel-copy">Avaa pronssi-, hopea-, kulta-, platina-, timantti-, Master-, Grandmaster- ja Legend-kehykset saavuttamalla divisioonat. Valittu kehys näkyy profiilikuvasi ympärillä.</p>
      {leagueError && <p className="creator-publish-error" role="alert">{leagueError}</p>}
      {!leagueError && !leagueSnapshot?.account && <p className="empty-inline">Kirjaudu Creator Leagueen Creator-sivulla avataksesi rankkikehykset.</p>}
      <div className="profile-border-gallery" id="league-profile-frame-options">
      <button type="button" className={`profile-border-option${!state.profile.leagueBronzeFrame ? " is-selected" : ""}`} aria-pressed={!state.profile.leagueBronzeFrame} onClick={() => onSelectLeagueFrame(undefined)}>
        <span className="profile-border-frame border-none"><span className="avatar border-gallery-avatar"><AvatarFace state={state} /></span></span><span>Ei kehystä</span>
      </button>
      {leagueProfileFrames.map(([id, label], rankIndex) => {
        const requiredPoints = leagueFrameUnlockPoints(rankIndex);
        const unlocked = state.developerUnlockedLeagueFrames === true || (Boolean(leagueSnapshot?.account) && peakLeaguePoints >= requiredPoints);
        const selected = state.profile.leagueBronzeFrame === id;
        return <button type="button" key={id} className={`profile-border-option${selected ? " is-selected" : ""}${unlocked ? "" : " is-locked"}`} aria-pressed={selected} disabled={!unlocked} onClick={() => onSelectLeagueFrame(id)}>
          <span className={`profile-border-frame border-league-${id}`}><LeagueFrameArt frameId={id} /><span className="avatar border-gallery-avatar"><AvatarFace state={state} /></span><span className="profile-border-rank-mark" data-rank={id.slice(-1)} aria-hidden="true" /></span>
          <span><strong>{label}</strong><small>{unlocked ? (selected ? "Käytössä" : "Käytä profiilissa") : `${requiredPoints.toLocaleString(getLocale())} CLP`}</small></span>
        </button>;
      })}
      </div>
    </>}
  </section><section className="panel prestige-avatar-panel" id="prestige-avatars"><div className="panel-heading"><div><div className="eyebrow">PRESTIGE</div><h2>Prestige-profiilikuvat</h2></div><span className="soft-label">{getPrestigeAvatars(state).filter((avatar) => avatar.unlocked).length} / {PRESTIGE_AVATARS.length} avattu</span><button className="text-button profile-border-toggle" type="button" aria-expanded={showPrestigeAvatars} onClick={() => setShowPrestigeAvatars((visible) => !visible)}>{showPrestigeAvatars ? "Piilota kuvat" : "Näytä kuvat"}</button></div>{showPrestigeAvatars && <><p className="panel-copy">Avaa Prestige-profiilikuvia aloittamalla Prestige-kierroksia. Valittu kuva näkyy profiilikuvanasi.</p><div className="prestige-avatar-grid"><button type="button" className={`prestige-avatar-option${!state.prestigeAvatar ? " is-selected" : ""}`} aria-pressed={!state.prestigeAvatar} onClick={() => onSetState((current) => ({ ...current, prestigeAvatar: undefined }))}><span className="avatar prestige-avatar-preview">{state.profile.avatar}</span><span><strong>Oletus</strong><small>{!state.prestigeAvatar ? "Käytössä" : "Käytä"}</small></span></button></div>{PRESTIGE_TRACKS.map((track) => { const group = getPrestigeAvatars(state).filter((avatar) => avatar.track === track); return group.length > 0 && <div className="prestige-avatar-group" key={track}><h3>{group[0].trackLabel} Prestige</h3><div className="prestige-avatar-grid">{group.map((avatar) => <button type="button" key={avatar.id} className={`prestige-avatar-option${state.prestigeAvatar === avatar.id ? " is-selected" : ""}${avatar.unlocked ? "" : " is-locked"}`} disabled={!avatar.unlocked} aria-pressed={state.prestigeAvatar === avatar.id} onClick={() => onSetState((current) => ({ ...current, prestigeAvatar: avatar.id }))}><span className="avatar prestige-avatar-preview"><img className="prestige-avatar-img" src={avatar.src} alt="" /></span><span><strong>{avatar.label}</strong><small>{avatar.unlocked ? (state.prestigeAvatar === avatar.id ? "Käytössä" : "Käytä") : `Lukittu · ${avatar.trackLabel} Prestige ${avatar.round}`}</small></span></button>)}</div></div>; })}</>}</section><div className="profile-stats-strip"><div><span>ONE AETHER LEVEL</span><strong>{totalLevel}<small> / {MAX_TOTAL_LEVEL}</small></strong></div><div><span>BADGES EARNED</span><strong>{badgeCount}</strong></div><div><span>CREATOR LEAGUE</span><strong>Ei aktiivista <small>kautta</small></strong></div></div><section className="profile-details-grid"><div className="panel profile-progress-panel"><div className="panel-heading"><div><div className="eyebrow">YOUR JOURNEY</div><h2>Level breakdown</h2></div><Trophy size={18} className="muted-icon" /></div>{(["creator", "gaming", "social"] as const).map((track) => <div className="profile-level-row" key={track}><span>{trackNames[track]}{getPrestigeCount(state, track) > 0 && <b className="prestige-star" title={`Prestige ${getPrestigeCount(state, track)}`}>{` ★${getPrestigeCount(state, track)}`}</b>}</span><div className="progress-bar"><span className={trackColors[track]} style={{ width: `${state.levels[track] >= MAX_CATEGORY_LEVEL ? 100 : state.xp[track]}%` }} /></div><strong>{state.levels[track]}<small>/150 · {state.xp[track]} XP</small></strong></div>)}<div className="profile-level-total"><span>Total level</span><strong>{totalLevel} / {MAX_TOTAL_LEVEL}</strong></div></div><div className="panel interests-panel"><div className="panel-heading"><div><div className="eyebrow">WHAT YOU'RE INTO</div><h2>Interests</h2></div></div><div className="interest-tags">{state.profile.interests.length ? state.profile.interests.map((interest) => <span key={interest}>{interest}</span>) : <span>Lisää kiinnostuksenkohteita asetuksissa</span>}</div><div className="interest-note"><Heart size={14} /> Löydä samanhenkisiä ihmisiä <ArrowRight size={13} /></div></div></section><section className="panel profile-achievements"><div className="panel-heading"><div><div className="eyebrow">ONE AETHER ACHIEVEMENTS</div><h2>Saavutukset</h2></div><span className="soft-label">{achievements.filter((achievement) => achievement.earned || state.developerUnlockedAchievements === true).length} / {achievements.length} avattu</span></div><div className="profile-achievement-list">{achievements.map((achievement) => { const earned = achievement.earned || state.developerUnlockedAchievements === true; return <article className={`profile-achievement${earned ? " is-earned" : ""}`} key={achievement.title}><span className="profile-achievement-icon" aria-hidden="true">{achievement.icon}</span><span className="profile-achievement-copy"><strong>{achievement.title}</strong><span>{earned ? "Saavutettu" : achievement.detail}</span></span></article>; })}  </div></section><section className="panel profile-rewards-panel"><div className="panel-heading"><div><div className="eyebrow">YOUR COLLECTION</div><h2>Tittelit, badget ja pokaalit</h2></div><div className="profile-collection-controls"><span className="soft-label">{unlockedTitles.length + unlockedBadges.length + trophies.length} palkintoa</span><button className="text-button profile-border-toggle" type="button" aria-expanded={showCollection} onClick={() => setShowCollection((visible) => !visible)}>{showCollection ? "Sulje kokoelma" : "Avaa kokoelma"}</button></div></div>{showCollection && <div className={`profile-reward-columns open-count-${openRewardSections}`}><div className={`profile-reward-group${showTitles ? " is-expanded" : ""}`} onClick={() => setShowTitles((visible) => !visible)}><h3><button className="profile-reward-group-toggle" type="button" aria-expanded={showTitles} onClick={(event) => { event.stopPropagation(); setShowTitles((visible) => !visible); }}><span aria-hidden="true">✧</span><span>Tittelit</span><small>{selectedTitles.length} / 3 valittu</small></button></h3>{showTitles && <div className="profile-reward-list">{unlockedTitles.length ? unlockedTitles.map((reward) => { const selected = selectedTitles.includes(reward.id); return <button type="button" className={`profile-reward-item profile-reward-selectable${selected ? " is-selected" : ""}`} aria-pressed={selected} onClick={(event) => { event.stopPropagation(); toggleCollectionReward("title", reward.id); }} key={reward.id}>{reward.name}</button>; }) : <span className="profile-reward-empty">Nosta tasoasi avataksesi titteleitä.</span>}</div>}</div><div className={`profile-reward-group${showBadges ? " is-expanded" : ""}`} onClick={() => setShowBadges((visible) => !visible)}><h3><button className="profile-reward-group-toggle" type="button" aria-expanded={showBadges} onClick={(event) => { event.stopPropagation(); setShowBadges((visible) => !visible); }}><span aria-hidden="true">✦</span><span>Badget</span><small>{selectedBadges.length} / 3 valittu</small></button></h3>{showBadges && <div className="profile-reward-list">{unlockedBadges.length ? unlockedBadges.map((reward) => { const selected = selectedBadges.includes(reward.id); return <button type="button" className={`profile-reward-item profile-reward-selectable${selected ? " is-selected" : ""}`} aria-pressed={selected} onClick={(event) => { event.stopPropagation(); toggleCollectionReward("badge", reward.id); }} key={reward.id}>{reward.name}</button>; }) : <span className="profile-reward-empty">Ensimmäinen badge odottaa.</span>}</div>}</div><div className={`profile-reward-group${showTrophies ? " is-expanded" : ""}`} onClick={() => setShowTrophies((visible) => !visible)}><h3><button className="profile-reward-group-toggle" type="button" aria-expanded={showTrophies} onClick={(event) => { event.stopPropagation(); setShowTrophies((visible) => !visible); }}><span aria-hidden="true">♛</span><span>Pokaalit</span><small>{selectedTrophies.length} / 1 valittu</small></button></h3>{showTrophies && <div className="profile-reward-list">{trophies.length ? trophies.map((reward) => { const selected = selectedTrophies.includes(reward.id); return <button type="button" className={`profile-reward-item profile-reward-selectable${selected ? " is-selected" : ""}`} aria-pressed={selected} onClick={(event) => { event.stopPropagation(); toggleCollectionReward("trophy", reward.id); }} key={reward.id}>{reward.name}</button>; }) : <span className="profile-reward-empty">Creator League -pokaalit näkyvät täällä.</span>}</div>}</div></div>}</section><section className="panel profile-activity"><div className="panel-heading"><div><div className="eyebrow">YOUR DIGITAL HISTORY</div><h2>Activity</h2></div><span className="soft-label">Visible to you</span></div>{state.activities.slice(0, 5).map((item) => <div className="activity-row" key={item.id}><span className="activity-dot" /><span className="activity-text">{item.label}</span><span className="activity-time">{item.time}</span></div>)}</section><DeveloperConsole state={state} setState={onSetState} /></>;
}

function DeveloperConsole({ state, setState }: {
  state: NexusState;
  setState: Dispatch<SetStateAction<NexusState>>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [session, setSession] = useState<DeveloperSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [changingCredentials, setChangingCredentials] = useState(false);
  const [creatingDeveloper, setCreatingDeveloper] = useState(false);
  const [error, setError] = useState("");
  const [totalXpDraft, setTotalXpDraft] = useState(String(state.xpSystem.total));
  const [categoryXpDrafts, setCategoryXpDrafts] = useState<Record<XpCategory, string>>({
    activity: String(state.xpSystem.totals.activity),
    creator: String(state.xpSystem.totals.creator),
    gaming: String(state.xpSystem.totals.gaming),
    social: String(state.xpSystem.totals.social),
  });
  const [levelDraft, setLevelDraft] = useState(String(getTotalLevel(state)));

  useEffect(() => {
    if (!expanded) return;
    let active = true;
    setLoading(true);
    setError("");
    getDeveloperSession()
      .then((value) => { if (active) setSession(value); })
      .catch((requestError: unknown) => {
        if (active) setError(requestError instanceof Error ? requestError.message : "Developer Console -istuntoa ei voitu tarkistaa.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [expanded]);

  function updateXp(category: XpCategory | "total", draft: string) {
    const value = Number(draft);
    const max = category === "total" || category === "activity" ? MAX_TOTAL_XP : MAX_CATEGORY_XP;
    if (!Number.isSafeInteger(value) || value < 0 || value > max) {
      setError(`Anna kokonaisluku väliltä 0–${max.toLocaleString()}.`);
      return;
    }
    setState((current) => setDeveloperXp(current, category, value));
    setError("");
  }

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await loginDeveloper(email, password);
      setPassword("");
      setSession({ configured: true, authenticated: true, setupAllowed: false });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Developer Console -kirjautuminen epäonnistui.");
    } finally {
      setLoading(false);
    }
  }

  async function createDeveloperLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password !== passwordConfirmation) {
      setError("Salasanat eivät täsmää.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      if (creatingDeveloper) await resetDeveloper(email, password);
      else await setupDeveloper(email, password);
      setEmail("");
      setPassword("");
      setPasswordConfirmation("");
      setCreatingDeveloper(false);
      setSession({ configured: true, authenticated: true, setupAllowed: false });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Developer Console -tunnusten luonti epäonnistui.");
    } finally {
      setLoading(false);
    }
  }

  async function signOut() {
    setLoading(true);
    setError("");
    try {
      await logoutDeveloper();
      setSession({ configured: true, authenticated: false, setupAllowed: false });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Developer Console -uloskirjautuminen epäonnistui.");
    } finally {
      setLoading(false);
    }
  }

  async function changeCredentials(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password !== passwordConfirmation) {
      setError("Salasanat eivät täsmää.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await changeDeveloperCredentials(email, password);
      setEmail("");
      setPassword("");
      setPasswordConfirmation("");
      setChangingCredentials(false);
      setSession({ configured: true, authenticated: true, setupAllowed: false });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Developer-tunnusten vaihto epäonnistui.");
    } finally {
      setLoading(false);
    }
  }

  function unlockAllLocalRewards() {
    setState((current) => {
      let unlocked = setDeveloperXp(current, "creator", MAX_CATEGORY_XP);
      unlocked = setDeveloperXp(unlocked, "gaming", MAX_CATEGORY_XP);
      unlocked = setDeveloperXp(unlocked, "social", MAX_CATEGORY_XP);
      unlocked = setDeveloperXp(unlocked, "activity", MAX_TOTAL_XP - MAX_CATEGORY_XP * 3);
      return {
        ...unlocked,
        developerUnlockedAchievements: true,
        developerUnlockedLeagueFrames: true,
        developerUnlockedRankRewards: true,
        developerUnlockedPrestige: true,
      };
    });
    setTotalXpDraft(String(MAX_TOTAL_XP));
    setCategoryXpDrafts({
      activity: String(MAX_TOTAL_XP - MAX_CATEGORY_XP * 3),
      creator: String(MAX_CATEGORY_XP),
      gaming: String(MAX_CATEGORY_XP),
      social: String(MAX_CATEGORY_XP),
    });
    setLevelDraft(String(MAX_TOTAL_LEVEL));
    setError("");
  }

  return <section className="panel developer-console">
    <button type="button" className="developer-console-trigger" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}>
      <span><Settings2 size={16} /> Developer Console</span><span>{expanded ? "Sulje" : "Avaa"}</span>
    </button>
    {expanded && <div className="developer-console-content">
      <p className="panel-copy">Kehitystyökalut muuttavat vain tämän selaimen paikallista profiilia. Creator League -tilin kausipalkintoja ei muuteta.</p>
      {error && <p className="creator-publish-error" role="alert">{error}</p>}
      {loading && <p className="empty-inline">Tarkistetaan kehittäjäistuntoa…</p>}
      {!loading && !session?.authenticated && <>
        {session?.setupAllowed || creatingDeveloper
          ? <form className="developer-login-form" onSubmit={(event) => void createDeveloperLogin(event)}>
            <p className="panel-copy">Luo paikallinen Developer Console -tunnus. Salasana tallennetaan palvelimelle suojattuna tiivisteenä.</p>
            <label className="setting-field"><span>Käyttäjätunnus / sähköposti</span><input type="email" autoComplete="username" value={email} required onChange={(event) => setEmail(event.target.value)} /></label>
            <label className="setting-field"><span>Luo salasana (vähintään 12 merkkiä)</span><input type="password" autoComplete="new-password" minLength={12} maxLength={128} value={password} required onChange={(event) => setPassword(event.target.value)} /></label>
            <label className="setting-field"><span>Vahvista salasana</span><input type="password" autoComplete="new-password" minLength={12} maxLength={128} value={passwordConfirmation} required onChange={(event) => setPasswordConfirmation(event.target.value)} /></label>
            <button className="button button-primary" type="submit" disabled={loading}>{creatingDeveloper ? "Luo uusi Developer ja kirjaudu" : "Luo tunnukset ja kirjaudu sisään"}</button>
            {creatingDeveloper && <button className="text-button" type="button" onClick={() => { setCreatingDeveloper(false); setError(""); }}>Peruuta</button>}
          </form>
          : !session?.configured
            ? <p className="empty-inline">Kirjautumista ei ole määritetty tälle palvelimelle. Paikallinen ensiasetus on käytettävissä vain kehityspalvelimella.</p>
            : <form className="developer-login-form" onSubmit={(event) => void signIn(event)}>
            <label className="setting-field"><span>Käyttäjätunnus</span><input type="text" autoComplete="username" value={email} required onChange={(event) => setEmail(event.target.value)} /></label>
            <label className="setting-field"><span>Kehittäjän salasana</span><input type="password" autoComplete="current-password" value={password} required onChange={(event) => setPassword(event.target.value)} /></label>
            <button className="button button-primary" type="submit" disabled={loading}>Kirjaudu Developer Consoleen</button>
          </form>}
        {!session?.setupAllowed && !creatingDeveloper && <button className="text-button" type="button" onClick={() => { setCreatingDeveloper(true); setError(""); }}>Luo uusi Developer</button>}
      </>}
      {!loading && session?.authenticated && <>
        <div className="developer-console-heading"><strong>Paikallinen profiili</strong><span><button type="button" className="text-button" onClick={() => { setChangingCredentials((value) => !value); setError(""); }} disabled={loading}>{changingCredentials ? "Peruuta vaihto" : "Vaihda Developer-tunnukset"}</button><button type="button" className="text-button" onClick={() => void signOut()} disabled={loading}>Kirjaudu ulos</button></span></div>
        {changingCredentials && <form className="developer-login-form" onSubmit={(event) => void changeCredentials(event)}>
          <p className="panel-copy">Luo uudet paikalliset Developer Console -tunnukset. Nykyinen kirjautunut istunto vahvistaa muutoksen.</p>
          <label className="setting-field"><span>Uusi sähköposti</span><input type="email" autoComplete="email" value={email} required onChange={(event) => setEmail(event.target.value)} /></label>
          <label className="setting-field"><span>Uusi salasana (vähintään 12 merkkiä)</span><input type="password" autoComplete="new-password" minLength={12} maxLength={128} value={password} required onChange={(event) => setPassword(event.target.value)} /></label>
          <label className="setting-field"><span>Vahvista uusi salasana</span><input type="password" autoComplete="new-password" minLength={12} maxLength={128} value={passwordConfirmation} required onChange={(event) => setPasswordConfirmation(event.target.value)} /></label>
          <button className="button button-primary" type="submit" disabled={loading}>Tallenna uudet tunnukset</button>
        </form>}
        <button className="button button-primary developer-unlock-all" type="button" onClick={unlockAllLocalRewards}>Avaa kaikki paikalliset palkinnot, rankkipalkinnot ja profiilikehykset</button>
        <div className="developer-rank-tools">
          <button className="button button-secondary" type="button" aria-pressed={state.developerUnlockedRankRewards === true} onClick={() => setState((current) => ({ ...current, developerUnlockedRankRewards: !current.developerUnlockedRankRewards }))}>
            {state.developerUnlockedRankRewards ? "Piilota rankkipalkintojen esikatselu" : "Avaa kaikki ranked-kausipalkinnot"}
          </button>
          <button className="button button-secondary" type="button" aria-pressed={state.developerUnlockedLeagueFrames === true} onClick={() => setState((current) => ({ ...current, developerUnlockedLeagueFrames: !current.developerUnlockedLeagueFrames }))}>
            {state.developerUnlockedLeagueFrames ? "Sulje kaikki profiilikehykset" : "Avaa kaikki ranked-profiilikehykset"}
          </button>
          <button className="button button-secondary" type="button" aria-pressed={state.developerUnlockedPrestige === true} onClick={() => setState((current) => ({ ...current, developerUnlockedPrestige: !current.developerUnlockedPrestige }))}>
            {state.developerUnlockedPrestige ? "Sulje kaikki Prestige-palkinnot" : "Avaa kaikki Prestige-palkinnot"}
          </button>
        </div>
        <div className="developer-xp-grid">
          <form onSubmit={(event) => { event.preventDefault(); updateXp("total", totalXpDraft); }}>
            <label className="setting-field"><span>Kokonais-XP · taso {getTotalLevel(state)}/{MAX_TOTAL_LEVEL}</span><input type="number" min="0" max={MAX_TOTAL_XP} step="1" value={totalXpDraft} onChange={(event) => setTotalXpDraft(event.target.value)} /></label>
            <button className="button button-secondary" type="submit">Aseta kokonais-XP</button>
          </form>
          {(["activity", "creator", "gaming", "social"] as const).map((category) => <form key={category} onSubmit={(event) => { event.preventDefault(); updateXp(category, categoryXpDrafts[category]); }}>
            <label className="setting-field"><span>{category === "activity" ? "Activity" : trackNames[category]} XP{category !== "activity" && ` · taso ${getTrackLevel(state, category)}/${MAX_CATEGORY_LEVEL}`}</span><input type="number" min="0" max={category === "activity" ? MAX_TOTAL_XP : MAX_CATEGORY_XP} step="1" value={categoryXpDrafts[category]} onChange={(event) => setCategoryXpDrafts((current) => ({ ...current, [category]: event.target.value }))} /></label>
            <button className="button button-secondary" type="submit">Aseta XP</button>
          </form>)}
          <form onSubmit={(event) => {
            event.preventDefault();
            const level = Number(levelDraft);
            if (!Number.isSafeInteger(level) || level < 1 || level > MAX_TOTAL_LEVEL) {
              setError(`Anna taso väliltä 1–${MAX_TOTAL_LEVEL}.`);
              return;
            }
            const amount = level * XP_PER_LEVEL;
            setTotalXpDraft(String(amount));
            updateXp("total", String(amount));
          }}>
            <label className="setting-field"><span>Kokonaislevel</span><input type="number" min="1" max={MAX_TOTAL_LEVEL} step="1" value={levelDraft} onChange={(event) => setLevelDraft(event.target.value)} /></label>
            <button className="button button-secondary" type="submit">Aseta level</button>
          </form>
        </div>
        <label className="setting-field developer-title-field"><span>Sovelluksen teema</span><select value={state.theme} onChange={(event) => {
          const theme = event.target.value;
          if (theme === "midnight" || theme === "aurora" || theme === "void") {
            setState((current) => ({ ...current, theme }));
          }
        }}>
          <option value="midnight">Midnight</option><option value="aurora">Aurora</option><option value="void">Void</option>
        </select></label>
        <div className="developer-console-actions">
          <button className="button button-secondary" type="button" onClick={() => {
            if (!window.confirm("Nollataanko XP ja Developer Consolella avatut saavutukset sekä profiilikehykset?")) return;
            setState((current) => {
              const reset = setDeveloperXp(current, "total", 0);
              return {
                ...reset,
                xpSystem: { ...reset.xpSystem, days: {}, seenEvents: {} },
                xpHistory: [],
                developerUnlockedAchievements: false,
                developerUnlockedLeagueFrames: false,
                developerUnlockedRankRewards: false,
                developerUnlockedPrestige: false,
              };
            });
            setTotalXpDraft("0");
            setCategoryXpDrafts({ activity: "0", creator: "0", gaming: "0", social: "0" });
            setLevelDraft("1");
          }}>Nollaa XP ja developer-avaukset</button>
        </div>
      </>}
    </div>}
  </section>;
}

function SettingsPage({ state, setState, onExport, onImport, importError, onToast }: {
  state: NexusState;
  setState: Dispatch<SetStateAction<NexusState>>;
  onExport: () => void;
  onImport: (file?: File) => Promise<void>;
  importError: string;
  onToast: (message: string) => void;
}) {
  const settingsNavRef = useRef<HTMLElement>(null);
  const bioRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const element = settingsNavRef.current;
    if (!element) return;
    const handleWheel = (event: WheelEvent) => {
      if (element.scrollWidth <= element.clientWidth) return;
      const delta = Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
      if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
      event.preventDefault();
      element.scrollLeft += delta;
    };
    element.addEventListener("wheel", handleWheel, { passive: false });
    return () => element.removeEventListener("wheel", handleWheel);
  }, []);
  useEffect(() => {
    const element = bioRef.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${element.scrollHeight}px`;
  }, [state.profile.bio]);
  const prefs = getPreferences(state);
  const onTheme = (theme: NexusTheme) => setState((current) => ({ ...current, theme }));
  const setPref = <K extends keyof Preferences>(key: K, value: Preferences[K]) => setState((current) => ({ ...current, preferences: { ...current.preferences, [key]: value } }));
  const goTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  const optionRows: { title: string; hint: string; control: ReactNode }[] = [
    { title: "Kieli", hint: "Valitse käyttöliittymän kieli.", control: <select aria-label="Kieli" value={prefs.language} onChange={(event) => { setPref("language", event.target.value as Preferences["language"]); onToast("Kieli tallennettu."); }}><option value="fi">Suomi</option><option value="en">English</option></select> },
    { title: "Taustakuva", hint: "Valitse sovelluksen taustakuva.", control: <select aria-label="Taustakuva" value={prefs.background} onChange={(event) => setPref("background", event.target.value as Preferences["background"])}><option value="plain">Tasainen</option><option value="glow">Hehku</option><option value="grid">Ruudukko</option><option value="ocean">Syvä meri</option><option value="ember">Hiillos</option><option value="neon">Neon</option><option value="sunset">Auringonlasku</option><option value="forest">Metsä</option></select> },
    { title: "Fontti", hint: "Valitse käyttöliittymän tekstin fontti.", control: <select aria-label="Fontti" value={prefs.font} onChange={(event) => setPref("font", event.target.value as Preferences["font"])}><option value="default">Oletus</option><option value="serif">Serif</option><option value="mono">Monospace</option></select> },
    { title: "Tekstin koko", hint: "Säädä tekstin kokoa.", control: <select aria-label="Tekstin koko" value={prefs.textSize} onChange={(event) => setPref("textSize", event.target.value as Preferences["textSize"])}><option value="small">Pieni</option><option value="medium">Normaali</option><option value="large">Suuri</option></select> },
    { title: "Profiilin näkyvyys", hint: "Kenelle profiilisi näkyy.", control: <select aria-label="Profiilin näkyvyys" value={prefs.profileVisibility} onChange={(event) => setPref("profileVisibility", event.target.value as Preferences["profileVisibility"])}><option value="everyone">Kaikille</option><option value="friends">Vain ystäville</option><option value="private">Vain minulle</option></select> },
    { title: "Kuka voi lähettää viestejä", hint: "Rajaa keskustelujen aloitus.", control: <select aria-label="Kuka voi lähettää viestejä" value={prefs.messagePrivacy} onChange={(event) => setPref("messagePrivacy", event.target.value as Preferences["messagePrivacy"])}><option value="everyone">Kaikki</option><option value="friends">Vain ystävät</option><option value="nobody">Ei kukaan</option></select> },
  ];
  const toggleRows = [
    { title: "Ilmoitukset", hint: "Näytä sovelluksen ilmoitukset.", on: state.notificationsEnabled, label: "Vaihda ilmoitukset", change: () => setState((current) => ({ ...current, notificationsEnabled: !current.notificationsEnabled })) },
    { title: "Tiivis näkymä", hint: "Tiiviimpi asettelu sovelluksessa.", on: state.compactMode, label: "Vaihda tiivis näkymä", change: () => setState((current) => ({ ...current, compactMode: !current.compactMode })) },
  ];
  return <><PageHeading eyebrow="MAKE NEXUS YOURS" title="Settings" subtitle="Hallinnoi profiiliasi ja paikallisia asetuksiasi." /><div className="settings-layout"><aside ref={settingsNavRef} className="settings-nav" aria-label="Asetusten osiot" tabIndex={0}><button type="button" onClick={() => goTo("appearance")}><Sparkles size={16} /> Ulkoasu</button><button type="button" onClick={() => goTo("themes")}><Palette size={16} /> Teemat</button><button type="button" onClick={() => goTo("account")}><UsersRound size={16} /> Profiili</button><button type="button" onClick={() => goTo("preferences")}><Bell size={16} /> Ilmoitukset</button><button type="button" onClick={() => goTo("data")}><Bookmark size={16} /> Data</button></aside><div className="settings-content"><section className="settings-list" id="appearance"><header className="settings-list-head"><h2>Ulkoasu ja personointi</h2><p>Rakenna NEXUSin näkymä omien mieltymystesi mukaan.</p></header>{optionRows.map((row) => <div className="settings-list-row" key={row.title}><div><strong>{row.title}</strong><small>{row.hint}</small></div>{row.control}</div>)}</section><section className="settings-section" id="themes"><div className="settings-section-heading"><div><div className="eyebrow">YOUR NEXUS, YOUR COLORS</div><h2>Teemat</h2><p>Valitse teema ja vaihda NEXUSin tunnelmaa milloin tahansa.</p></div></div><ThemePicker theme={state.theme} onSelect={onTheme} /></section><section className="settings-list" id="preferences"><header className="settings-list-head"><h2>Ilmoitukset ja näkymä</h2><p>Hallitse ilmoituksia ja asettelun tiiviyttä.</p></header>{toggleRows.map((row) => <div className="settings-list-row" key={row.title}><div><strong>{row.title}</strong><small>{row.hint}</small></div><button type="button" className={`toggle${row.on ? " on" : ""}`} onClick={row.change} aria-label={row.label} aria-pressed={row.on}><i /></button></div>)}</section><section className="settings-section" id="account"><div className="settings-section-heading"><div><div className="eyebrow">YOUR PROFILE</div><h2>Personal details</h2></div><span className="soft-label">Stored on this device</span></div><label className="setting-field"><span>Avatar letter or emoji</span><input value={state.profile.avatar} maxLength={4} onChange={(event) => setState((current) => ({ ...current, profile: { ...current.profile, avatar: event.target.value } }))} /></label><label className="setting-field"><span>Display name</span><input value={state.profile.name} maxLength={32} onChange={(event) => setState((current) => ({ ...current, profile: { ...current.profile, name: event.target.value } }))} /></label><label className="setting-field"><span>Username</span><div className="input-prefix"><span>@</span><input value={state.profile.username} maxLength={24} onChange={(event) => setState((current) => ({ ...current, profile: { ...current.profile, username: event.target.value.replace(/\s/g, "").toLowerCase() } }))} /></div></label><label className="setting-field"><span>Kaverikoodi <small>käytä tätä koodia kavereiden haussa</small></span><input value={state.profile.friendCode ?? "NEX-7K4P2"} readOnly aria-readonly="true" /></label><label className="setting-field"><span>Bio</span>    <textarea ref={bioRef} className="auto-grow" rows={1} maxLength={160} value={state.profile.bio} onChange={(event) => setState((current) => ({ ...current, profile: { ...current.profile, bio: event.target.value } }))} /></label><label className="setting-field"><span>Interests <small> pilkulla eroteltuna</small></span><input value={state.profile.interests.join(", ")} onChange={(event) => setState((current) => ({ ...current, profile: { ...current.profile, interests: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) } }))} /></label></section><section className="settings-section" id="data"><div className="settings-section-heading"><div><div className="eyebrow">YOUR DATA, YOURS</div><h2>Backup & restore</h2><p>Vie tai palauta NEXUS-tietosi JSON-tiedostona.</p></div></div><div className="data-actions"><button className="button button-secondary" onClick={onExport}><ArrowUpRight size={15} /> Export NEXUS data</button><label className="button button-secondary import-button"><Plus size={15} /> Import backup<input type="file" accept=".json,application/json" onChange={(event) => void onImport(event.target.files?.[0])} /></label></div>{importError && <p className="import-error" role="alert">{importError}</p>}<div className="data-note"><span className="online-dot" /> Tietosi ovat vain tällä laitteella. NEXUS ei lähetä niitä palvelimelle.</div></section><button className="reset-demo" onClick={() => { setState(initialState); onToast("Demotiedot palautettu."); }}>Palauta demon tiedot</button></div></div></>;
}

export default App;
