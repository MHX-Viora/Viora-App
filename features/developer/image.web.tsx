import type { ImgHTMLAttributes } from "react";

export default function Image({ priority, ...props }: ImgHTMLAttributes<HTMLImageElement> & { priority?: boolean }) {
  return <img {...props} loading={priority ? "eager" : "lazy"} />;
}
