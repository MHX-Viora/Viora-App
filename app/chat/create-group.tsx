import { ResponsiveContent } from "@/components/layout/responsive-content";
import { CreateGroupScreen } from "@/features/chat/create-group-screen";
import { layout } from "@/theme/layout";

export default function CreateGroupRoute() {
  return (
    <ResponsiveContent maxWidth={layout.createGroupMaxWidth}>
      <CreateGroupScreen />
    </ResponsiveContent>
  );
}
