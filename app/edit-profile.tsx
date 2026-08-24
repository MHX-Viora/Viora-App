import { ResponsiveContent } from "@/components/layout/responsive-content";
import { EditProfileScreen } from "@/features/profile/edit-profile-screen";
import { layout } from "@/theme";

export default function EditProfileRoute() {
  return (
    <ResponsiveContent maxWidth={layout.profileSubpageMaxWidth}>
      <EditProfileScreen />
    </ResponsiveContent>
  );
}
