# Follow the article author

Place a follow button at the far right of the author's name row in the article
reader, with reading metadata below. Hide it for the current user's own article.
Use getUserProfile to load the existing relationship and followUser to toggle it.
Disable while loading/saving and guard rapid presses. Failed toggles keep the
previous state and show an error; a failed initial load offers retry. Ignore late
responses after unmount/article navigation. Preserve compact mobile layout.

Plan: focused behavior tests; reusable author follow button + reader name row;
verify loading/follow/unfollow/error and desktop/mobile alignment in Chrome;
run TypeScript and targeted ESLint. No backend changes.
