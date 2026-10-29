# Article hashtag topics

Reuse `/api/hashtags` and the existing Hashtags/PostHashtags model. Article create
and update accept optional `hashtags: string[]`; responses include `{id,name}`
tags. Missing update field preserves existing tags; an explicit empty array
clears them. Normalize/deduplicate and synchronize tag usage counts transactionally.
No schema changes. Existing clients remain compatible.

The editor uses reel-style debounced search, suggestions, selected chips/removal
and adding a typed tag into the shared hashtag pool. Pending input is committed
on publish. At least one topic is required by the new editor. Compact layouts
open a topic modal on publish when none are selected; the modal can publish once
topics are added. A header action allows editing topics any time. At >=1240px,
show an independent topic panel to the right of the editor, preserving readable
card width; missing topics focus that panel. On wide screens, anchor the panel
16px from the right edge and reserve equal space on both sides of the editor
so writing cards remain centered in the viewport, shrinking when needed to
avoid overlapping the panel. Keep selection on resize/errors and
load existing topics when editing. Reader displays the saved topics.

Plan: backend contract/persistence tests, API and storage; topic picker/editor
layouts; reader and search integration; component/browser checks at mobile,
tablet and desktop widths. Run focused .NET tests/build, Node tests, TypeScript
and ESLint. Use fake APIs for browser publishing checks.
