export const desktopNavigationItems = [
  {
    href: "/" as const,
    icon: "home-outline" as const,
    iconActive: "home" as const,
    route: "index" as const,
    title: "Trang chủ",
  },
  {
    href: "/utilities" as const,
    icon: "grid-outline" as const,
    iconActive: "grid" as const,
    route: "utilities" as const,
    title: "Tiện ích",
  },
  {
    href: "/chat" as const,
    icon: "chatbubble-outline" as const,
    iconActive: "chatbubble" as const,
    route: "chat" as const,
    title: "Trò chuyện",
  },
  {
    href: "/notification" as const,
    icon: "notifications-outline" as const,
    iconActive: "notifications" as const,
    route: "notification" as const,
    title: "Thông báo",
  },
  {
    href: "/profile" as const,
    icon: "person-outline" as const,
    iconActive: "person" as const,
    route: "profile" as const,
    title: "Hồ sơ",
  },
] as const;
export type DesktopRoute = (typeof desktopNavigationItems)[number]["route"];

export const getActiveDesktopRoute = (route: string): DesktopRoute =>
  desktopNavigationItems.some((item) => item.route === route)
    ? (route as DesktopRoute)
    : "index";
