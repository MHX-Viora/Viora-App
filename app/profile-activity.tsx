import { ProfileActivityScreen } from "@/features/profile/profile-activity-screen";
import { ResponsiveContent } from "@/components/layout/responsive-content";
import { layout } from "@/theme";

export default function ProfileActivityRoute() {
  return (
    <ResponsiveContent maxWidth={layout.profileSubpageMaxWidth}>
      <ProfileActivityScreen />
    </ResponsiveContent>
  );
}
