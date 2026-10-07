# Community and News image display

Approved scope: display full, undistorted image media across existing PostCard consumers and ArticleBlockView. Keep gallery geometry and News actions. Single community images use intrinsic dimensions with a responsive height cap; inline article images use their natural ratio. Fixed frames use a contained foreground and the same image blurred behind letterboxing only. Provide themed loading/error states, no retries. Avatar and video rendering remain independent.

Hide hashtag tokens in published community/article text only; retain stored/editor content, links, code blocks and mention behavior.

Implementation sequence: shared sizing/display-text tests and media component; opt-in ViewableImage integration and call sites; six-ratio browser harness; TypeScript, lint, suite and web export; concise handoff. Verify 16:9, 9:16, 1:1, 4:3, 3:4, 21:9, edge content, source changes, failed URLs, light/dark and responsive layouts. Browser harness verifies real components; authenticated routes require a connected signed-in session.
