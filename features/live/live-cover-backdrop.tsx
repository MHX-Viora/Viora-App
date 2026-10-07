import type { ImageProps } from "expo-image";
import { LiveCoverImage } from "./live-cover-image";

export function LiveCoverBackdrop({ source }: { source?: ImageProps["source"] }) {
  return <LiveCoverImage fill source={source} />;
}
