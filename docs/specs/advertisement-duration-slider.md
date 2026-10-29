# Advertisement duration and automatic audience

Both post and reel creation use the shared advertisement form. Replace duration
chips with a themed slider selecting whole days from 1 to 30 (default 3). Show the
selected days and endpoints; update total budget and end date immediately. Hide
audience settings and always submit Automatic without custom age fields.

Plan: constrain schedule duration, add an accessible web/native slider, wire the
shared form, verify both content types and boundary durations. Preserve the existing
calendar, API contracts and unrelated workspace changes. No new dependencies.

Follow existing TypeScript function components and theme tokens in
`features/advertisements`. Verify with `node --test features/advertisements/*.test.mjs`,
`npx tsc --noEmit` and `npx eslint features/advertisements`.
