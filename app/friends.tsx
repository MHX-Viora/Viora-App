import { ResponsiveContent } from "@/components/layout/responsive-content";
import { FriendsScreen } from "@/features/profile/friends-screen";
import { layout } from "@/theme";

export default function FriendsRoute() {
  return (
    <ResponsiveContent maxWidth={layout.profileSubpageMaxWidth}>
      <FriendsScreen />
    </ResponsiveContent>
  );
}
