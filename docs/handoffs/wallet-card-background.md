# Wallet card background

- Copied the supplied PNG unchanged to `assets/images/wallet-card-background.png`.
- `components/wallet/wallet-summary-card.tsx` now renders the image as a decorative, noninteractive cover layer inside the rounded card, with a light dark overlay and light text across themes.
- Balance masking, loading/error states and deposit/withdraw/history callbacks retain their behavior.
- Existing test harness now supplies the static asset and ignores decorative layers when inspecting layout.
- Follow-up: React Native Web supplied intrinsic 1855x848 asset dimensions; absolute positioning alone left the oversized image clipped to its dark left side. Set explicit 100% width/height on the image to override intrinsic dimensions before applying cover sizing.
- Verification: TypeScript and component ESLint passed; all nine existing wallet-card tests passed with intrinsic asset dimensions in the fixture. Browser DOM confirms the image loaded (1855x848 source) and its rendered container exactly matches the background frame. Screenshot capture previously timed out.
