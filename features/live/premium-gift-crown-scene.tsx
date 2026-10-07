import { memo, useMemo } from "react";
import type { SceneProps } from "./premium-gift-cinematic-parts";
import { crownLayout } from "./premium-gift-crown-model";
import { RoyalAtmosphere, RoyalArrival, RoyalCrownShadow, RoyalHalo, RoyalLightBurst, RoyalLightColumn, RoyalRays, RoyalShockwave } from "./premium-gift-crown-environment";
import { RoyalConfetti, RoyalGoldDust } from "./premium-gift-crown-particles";
import { RoyalCrownRenderer } from "./premium-gift-crown-renderer";
import { GiftSenderSignature } from "./crown-gift-signature";

export const CrownCinematicScene = memo(function CrownCinematicScene({ bounds, effect, progress, reducedMotion, quality }: SceneProps) {
  const layout = useMemo(() => crownLayout(bounds), [bounds]);
  const layers = { bounds, layout, progress, reducedMotion, quality };
  return <>
    <RoyalAtmosphere {...layers} />
    {!reducedMotion ? <><RoyalArrival {...layers} /><RoyalRays {...layers} /><RoyalGoldDust {...layers} /></> : null}
    <RoyalLightColumn {...layers} />
    <RoyalHalo {...layers} />
    <RoyalCrownShadow {...layers} />
    {!reducedMotion ? <RoyalLightBurst {...layers} /> : null}
    <RoyalCrownRenderer {...layers} />
    {!reducedMotion ? <><RoyalShockwave {...layers} /><RoyalConfetti {...layers} /></> : null}
    <GiftSenderSignature effect={effect} progress={progress} layout={layout} width={bounds.width} reducedMotion={reducedMotion} />
  </>;
});
