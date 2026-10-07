import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import { scheduleCrownSoundCues, type CrownSoundCue } from "./crown-coronation-cues";
import type { PremiumGiftEffect } from "./premium-gift-effect-model";

export function useCrownSoundCues(effect: PremiumGiftEffect, reducedMotion: boolean, onCue?: (cue: CrownSoundCue) => void) {
  const callback = useRef(onCue);
  callback.current = onCue;
  const enabled = Boolean(onCue);
  const { id, effectType } = effect;
  useEffect(() => {
    if (effectType !== 3 || !enabled || reducedMotion || (AppState.currentState && AppState.currentState !== "active")) return;
    const cancel = scheduleCrownSoundCues(cue => callback.current?.(cue), {
      schedule: (action, delay) => setTimeout(action, delay),
      cancel: timer => clearTimeout(timer as ReturnType<typeof setTimeout>),
    });
    const subscription = AppState.addEventListener("change", state => { if (state !== "active") cancel(); });
    return () => { cancel(); subscription.remove(); };
  }, [id, effectType, enabled, reducedMotion]);
}
