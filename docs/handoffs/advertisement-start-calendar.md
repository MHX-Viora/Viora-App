# Advertisement start calendar

- Post and video ads use `AdvertisementStartCalendar` in the shared creation form.
  Existing today/tomorrow/+3-day shortcuts remain and select absolute local dates.
- The inline themed calendar uses Monday-first weeks, month navigation, selected
  date and today markers. Past dates and navigation before this month are disabled;
  the press handler also rechecks the current local day.
- `advertisement-schedule.ts` validates local date strings and submission dates.
  Today uses submission time; future dates use local midnight. Duration remains
  fixed 24-hour days, matching the existing billing API. Forms left open overnight
  must reselect if their start day has passed. No new dependencies/API changes.
- Verification: 4 helper tests plus 3 component/form tests cover calendar selection,
  past dates, midnight expiry, leap/month/year boundaries, and submissions for both
  post types. TypeScript and targeted ESLint passed. Live browser verification was
  blocked by Chrome DevTools reporting an already occupied browser profile.
