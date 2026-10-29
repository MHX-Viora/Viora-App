# Advertisement start calendar

Both post and video creation share one schedule control. Keep existing quick-date
choices and add an inline month calendar using the existing React Native theme.
Disable dates before the device's local today and navigation to earlier months.
Use local calendar dates without UTC date truncation. Today starts immediately;
future dates start at local midnight. Keep campaign duration in 24-hour days to
match the existing API/budget contract. Revalidate the chosen day at submission,
including forms left open overnight. No dependency or API changes.

Plan: date helpers and deterministic tests, calendar component, shared form wiring,
then component/submit tests, TypeScript and targeted lint.
Commands: `node features/advertisements/advertisement-schedule.test.mjs`,
`npx tsc --noEmit`, `npx eslint features/advertisements`.
