# Spec: Reel viewer controls

## Objective

Improve short-video viewing: replay a reel from the start when revisited, expose controls after a short long-press, align reel actions with post actions, and keep captions/hashtags readable.

## Tech stack and commands

- Expo 54, React Native 0.81, `expo-video` 3.
- Verify: `npx tsc --noEmit` and `npm run lint`.

## Structure and style

- UI remains in `components/reels/reel-card.tsx` and uses the existing theme and Ionicons.
- Use local state and native accessible controls; add no dependency or API change.

## Testing strategy

- Type-check and lint the component.
- Runtime-check replay, long-press controls, seeking, speed, mute, save, and expanded copy on the reel screen.

## Boundaries

- Always: preserve the reel data contract and current design system.
- Ask first: dependencies, backend persistence, or data-model changes.
- Never: hide hashtags or enable native video controls.

## Success criteria

- Returning to a reel restarts and plays it.
- Holding the video briefly opens seek, playback-speed, and audio controls.
- Like/comment counts sit closer to their icons; share uses `paper-plane-outline`; save is available.
- Caption is at most two lines; hashtags are one visible line. “Xem thêm” sits below hashtags and opens both in a bottom sheet that slides upward.
- Long-press works on the unobstructed video surface, and buffering never flashes loading copy while scrolling.
- While a video overlay is open, vertical reel paging is locked; tapping the dimmed area closes the overlay and restores paging.
- Seeking owns the drag gesture, previews smoothly, and commits on release. Playback speed, mute state, seek preview, and open panels reset when leaving a reel.
- The left header action is a polished pencil button for creating a new video post.
