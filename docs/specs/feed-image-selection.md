# Spec: Feed image selection

## Objective
Let users append, remove, and preview up to four draft post images.

## Tech stack and commands
- Expo 54, React Native 0.81, TypeScript.
- Verify: `npm run lint` and `npx tsc --noEmit`.

## Structure and style
- Draft state stays in `features/feed/feed-screen.tsx`.
- Preview interactions stay in `components/feed/create-post-modal.tsx`.
- Reuse theme tokens and accessible `Pressable` controls.

## Testing strategy
- Typecheck and lint the state/UI contract.
- Manually verify append, remove, limit, and layouts for 1–4 images.

## Boundaries
- Always cap drafts at four images and preserve existing selections.
- Do not add dependencies or change persisted post data.

## Success criteria
- Selecting more images appends into remaining slots.
- Each preview can be removed independently.
- One image is full width; two are balanced; three use one wide plus two tiles; four use a 2×2 grid.

