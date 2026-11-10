import type { NexusState } from "./types";
import { findPrestigeAvatar } from "./prestige";

export function AvatarFace({ state }: { state: NexusState }) {
  const avatar = findPrestigeAvatar(state, state.prestigeAvatar);
  return avatar
    ? <img className="prestige-avatar-img" src={avatar.src} alt={avatar.label} />
    : <>{state.profile.avatar}</>;
}
