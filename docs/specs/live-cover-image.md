# Live cover consistency

Use the supplied logo asset as the shared default, fit the complete original image over a static blurred backdrop from the same image, and fix setup/list/summary cover frames at 16:9. Invalid/missing/failed sources fall back to the local default; selecting a new source resets the load failure. Live playback frame geometry and Agora are outside scope.

Implementation order: shared source validation/default/component; switch setup/list/host/viewer/summary and old demo fallbacks; remove description UI and send null while retaining the API/database contract; test errors/source changes and five image ratios, then TypeScript/lint/tests/web export and browser layout verification.

Use existing Expo Image layers and FlatList virtualization, with no new dependencies or per-frame image work. Check `node --experimental-strip-types scripts/test.mjs`, `npx tsc --noEmit`, `npx expo lint`, `npx expo export --platform web --max-workers 1 --output-dir .codex-tmp/live-cover-web`. Tests are colocated with Live features. Source URLs are validated at the UI boundary; never alter camera tracks or backend schema for this change.
