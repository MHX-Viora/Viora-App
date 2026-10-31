# Native category header safe area

2026-10-31: User reported Cộng đồng / Video / Báo / Live tabs overlapping the phone status bar and requested a little more top space.

- FixedTopBar used top=-safeTopInset, canceling its own safe-area padding while Feed/Reels/Live render in ordinary Views without top safe-area padding.
- Native header now starts at top=0 with safeTopInset+8 padding. Shared layout height includes that space for all native header modes.
- Feed, Reels and Live pass the current top inset into the same layout helper, reserving matching list/skeleton space. Native Reels sort/actions header also sits below category tabs.
- Desktop and compact-web geometry remain unchanged. Invalid insets clamp to zero before the extra 8 px gap.
- Regression tests cover zero, 24, 44 and 59 px insets, invalid values, header modes, matching content space and unchanged web geometry. Seven focused layout/Reels tests passed; TypeScript passed.
- No native device/emulator available; physical touch verification remains pending. No build, commit, push or release performed.
- Broader Reels theme suite has an existing search palette assertion failure (borderBottomColor/borderBottomWidth); reproduced using the test from HEAD without this patch. Not changed here. ESLint has no errors on changed files; Feed/Reels screen warnings predate this fix.
