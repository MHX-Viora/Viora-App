import type { ImageProps } from "expo-image";
import { LiveCoverImage } from "./live-cover-image";

export function LiveCoverBackdrop({ source, blurredOnly = false }: { source?: ImageProps["source"]; blurredOnly?: boolean }) {
  return <LiveCoverImage fill source={source} blurredOnly={blurredOnly} />;
}
