import Svg, { Path } from "react-native-svg";
import { Platform } from "react-native";

type GoogleLogoProps = {
  size?: number;
};

export function GoogleLogo({ size = 20 }: GoogleLogoProps) {
  const nativeAccessibilityProps =
    Platform.OS === "web"
      ? {}
      : {
          accessibilityElementsHidden: true,
          importantForAccessibility: "no-hide-descendants" as const,
        };

  return (
    <Svg
      {...nativeAccessibilityProps}
      height={size}
      viewBox="0 0 24 24"
      width={size}
    >
      <Path
        d="M21.81 12.23c0-.71-.06-1.4-.18-2.07H12v3.91h5.5a4.7 4.7 0 0 1-2.04 3.08v2.54h3.31c1.94-1.79 3.04-4.42 3.04-7.46Z"
        fill="#4285F4"
      />
      <Path
        d="M12 22c2.76 0 5.08-.92 6.77-2.49l-3.31-2.54c-.92.61-2.09.98-3.46.98-2.66 0-4.92-1.8-5.73-4.22H2.85v2.62A10.23 10.23 0 0 0 12 22Z"
        fill="#34A853"
      />
      <Path
        d="M6.27 13.73A6.15 6.15 0 0 1 6.27 9.8V7.18H2.85a10.25 10.25 0 0 0 0 9.17l3.42-2.62Z"
        fill="#FBBC05"
      />
      <Path
        d="M12 5.57c1.5 0 2.85.52 3.91 1.53l2.94-2.94A9.86 9.86 0 0 0 12 1.5a10.23 10.23 0 0 0-9.15 5.68L6.27 9.8C7.08 7.38 9.34 5.57 12 5.57Z"
        fill="#EA4335"
      />
    </Svg>
  );
}
