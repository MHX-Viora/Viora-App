import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import { scheduleRocketSoundCues } from "./premium-gift-rocket-cues";
import type { PremiumGiftEffect } from "./premium-gift-effect-model";
import type { RocketSoundCue } from "./premium-gift-rocket-model";

export function useRocketSoundCues(effect: PremiumGiftEffect | null, onCue?: (cue: RocketSoundCue) => void, reducedMotion = false) {
  const callback = useRef(onCue);
  callback.current = onCue;
  const id = effect?.id; const type = effect?.effectType; const duration = effect?.durationMs;
  const enabled = Boolean(onCue);
  useEffect(() => {
    if (!id || type !== 2 || !duration || !enabled || reducedMotion || (AppState.currentState && AppState.currentState !== "active")) return;
    const cancel = scheduleRocketSoundCues(duration, (cue) => callback.current?.(cue), {
      schedule: (action, delay) => setTimeout(action, delay),
      cancel: (timer) => clearTimeout(timer as ReturnType<typeof setTimeout>),
    });
    const subscription = AppState.addEventListener("change", (state) => { if (state !== "active") cancel(); });
    return () => { cancel(); subscription.remove(); };
  }, [id, type, duration, enabled, reducedMotion]);
}
