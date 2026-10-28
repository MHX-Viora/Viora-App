# Advertisement feed layout

## Objective
Use the advertisement creation preview's presentation for delivered PostCards.
Keep the existing news/article layout, content, custom copy and callbacks.

## Acceptance criteria
- Delivered ads show sponsored metadata with visibility, uppercase destination domain,
  neutral CTA, and the same LearnMore label as the creation preview.
- Delivered ads retain their working options menu and ad click/feedback callbacks.
- Draft-only markers and disabled preview controls remain limited to drafts.
- Ordinary posts retain timestamps, visibility and existing presentation.

## Plan and verification
1. Extend the existing renderer fixture to represent real delivered ads; verify layout parity.
2. Reuse existing preview styles for all advertisement cards, without changing delivery data.
3. Run Node rendering tests, targeted ESLint, TypeScript and mobile/desktop browser checks.

Commands (from `viora`):
`node --test features/advertisements/post-advertisement-preview.test.mjs`
`npx eslint components/feed/post-card.tsx`
`npx tsc --noEmit`

Existing React Native PostCard styles and render-test conventions apply; no dependencies,
API changes, tracking changes or unrelated edits.
