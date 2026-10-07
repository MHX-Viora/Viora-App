import type { LivePlaybackState } from "./audience-agora-view";

export function nextViewerPlaybackState(current: LivePlaybackState, next: LivePlaybackState): LivePlaybackState {
  return current === "ended" ? "ended" : next;
}
