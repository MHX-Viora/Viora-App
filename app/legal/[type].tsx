import { ResponsiveContent } from "@/components/layout/responsive-content";
import { LegalDocumentScreen } from "@/features/legal/legal-document-screen";
import { layout } from "@/theme";

export default function LegalDocumentRoute() {
  return (
    <ResponsiveContent maxWidth={layout.profileSubpageMaxWidth}>
      <LegalDocumentScreen />
    </ResponsiveContent>
  );
}
