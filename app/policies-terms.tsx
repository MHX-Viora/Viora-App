import { ResponsiveContent } from "@/components/layout/responsive-content";
import { LegalDocumentsMenuScreen } from "@/features/legal/legal-documents-menu-screen";
import { layout } from "@/theme";

export default function PoliciesTermsRoute() {
  return (
    <ResponsiveContent maxWidth={layout.profileSubpageMaxWidth}>
      <LegalDocumentsMenuScreen />
    </ResponsiveContent>
  );
}
