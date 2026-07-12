# Plan: Home feed search

1. Extend `PostComposer` with an accessible right-aligned search action.
2. Add an isolated feed-search overlay with query, result, empty, clear, and close states.
3. Connect the action and current posts in `FeedScreen` without altering post creation.
4. Verify with TypeScript, lint, and final diff review.
