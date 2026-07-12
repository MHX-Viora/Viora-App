# Spec: Profile screen

Build the profile tab from the supplied reference with a header, cover/avatar, identity, metrics, content tabs, and an edit pencil aligned beside the user name. Use existing Expo/React Native primitives and theme tokens; add no dependencies. Verify with TypeScript and lint.

Add a real, locally rendered profile QR and camera scanner that accepts only Viora profile QR schemes. The settings action opens a dismissible TikTok-style sheet listing saved, favorites, support, privacy, account, policies, and logout actions.

The QR page opens directly on the personal QR card without tabs. A camera action below the card enters scanning mode, which provides a clear route back to the personal QR.

The friends action opens a dedicated screen containing the user's locally defined friend list. The screen provides a clear back action, accessible friend rows, and preserves the existing profile tab state when returning.
