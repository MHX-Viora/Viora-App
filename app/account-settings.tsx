import { AccountSettingsScreen } from "@/features/profile/account-settings-screen";
import { ResponsiveContent } from "@/components/layout/responsive-content";
import { layout } from "@/theme";

export default function AccountSettingsRoute() {
  return (
    <ResponsiveContent maxWidth={layout.profileSubpageMaxWidth}>
      <AccountSettingsScreen />
    </ResponsiveContent>
  );
}
