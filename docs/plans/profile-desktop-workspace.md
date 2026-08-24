# Implementation Plan: Profile desktop workspace

## Architecture decisions

- Reuse `ProfileContent` and constrain its parent rather than resizing media internally.
- Activate side rails only at the existing large-desktop breakpoint.
- Reuse the settings sheet content in an inline presentation.
- Load a small accepted-friends preview with the existing friends service.

## Tasks

### 1. Narrow profile content

- Acceptance: both profile screens consume a 760px semantic token; mobile/native remain full width.
- Verify: focused layout test, then typecheck.
- Files: layout token and profile layout test.

### 2. Add inline settings presentation

- Acceptance: settings rows and actions render as a bounded right panel without a modal backdrop on large desktop; mobile retains the sheet.
- Verify: focused test and typecheck.
- Files: settings component and profile screen.

### 3. Add desktop friend sidebar

- Acceptance: left rail shows Friends and QR actions plus accepted friends with loading, empty, and retry states.
- Verify: focused test and full suite.
- Files: new sidebar component and profile screen.

### 4. Polish rail spacing and video grid sizing

- Acceptance: desktop rails use the available viewport width with a small gutter; video tiles remain a three-column grid based on their container width.
- Verify: focused layout test and Web export.
- Files: profile layout tokens/screen and reels grid viewer.

## Checkpoint

- `npm test`, `npx tsc --noEmit`, `npm run lint`, and `npx expo export --platform web` pass.
- Review confirms no API, mobile behavior, or unrelated screen changes.
