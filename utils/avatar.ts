export function getAvatarInitial(displayName?: string | null) {
  const [initial] = Array.from(displayName?.trim() ?? "");
  return initial ? initial.toLocaleUpperCase("vi-VN") : "?";
}
