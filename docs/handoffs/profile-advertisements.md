# Profile advertisements

- Profile-specific feed/video responses and post/video detail responses now include
  optional `advertisement` presentation. The backend resolves active public campaigns
  in one batch per page, selecting the latest eligible campaign per post. Status,
  UTC schedule, published/undeleted content, active account and remaining held/total
  budget are checked. Ordinary community feed delivery is unchanged.
- DTO exposes only campaign id, CTA, destination, headline, description and owner
  preview flag. No schema migration or financial data is added to public responses.
- Client mappers preserve original content, ownership, interactions and counts.
  Profile PostCards and video tiles disclose sponsorship; the video viewer and
  standalone post/video screens use existing advertisement CTA navigation.
- Own-profile content refreshes when focused. Owner preview clicks skip tracking;
  profile display does not add paid impression tracking.
- Owner sponsored posts keep the normal working options menu and owner actions;
  advertiser feedback is limited to other users' posts. Only the creation-form demo
  disables the options button. Community owner-ad mapping preserves ownership.
- Verification: focused SQLite projection tests, mapping/navigation tests, existing
  post preview tests, TypeScript and targeted lint. Full repository queries cannot
  run on SQLite (SQL APPLY); isolated PostgreSQL failed to start in this environment.
  Chrome DevTools also reported an occupied profile, preventing live visual QA.
- Deploy backend and frontend together for profile campaign presentation to appear.
