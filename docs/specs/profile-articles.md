# Compact media and profile articles

Use contained images with existing same-source blur. Reduce single community media to max 420px desktop / min(420px,55% viewport) mobile; cap News thumbnails at 280px. Keep natural inline article images and fullscreen viewing.

Profile posts show community posts only. Add a Bài báo tab using existing canCreateArticle(accountStyle) policy of the viewed profile, for both own and visited profiles. Personal accounts have no article tab. Fetch community/articles separately with userId and postType using the existing feed API so each list has its own first-page quota. News cards retain Share/Options and navigate to the existing article reader. Preserve current privacy filtering on the server, video, comments and sharing. Existing profile first-page limit remains 30 per type.

Plan: test filtered requests/account policy; compact media and profile tab integration; verify owner/visitor binding, ordinary account hiding, article navigation and responsive components; run TypeScript/lint/suite/export and write handoff.
