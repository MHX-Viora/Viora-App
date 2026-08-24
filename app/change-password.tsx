import { ResponsiveContent } from "@/components/layout/responsive-content";
import { ChangePasswordScreen } from "@/features/profile/change-password-screen";
import { layout } from "@/theme";

export default function ChangePasswordRoute() {
  return (
    <ResponsiveContent maxWidth={layout.profileSubpageMaxWidth}>
      <ChangePasswordScreen />
    </ResponsiveContent>
  );
}
