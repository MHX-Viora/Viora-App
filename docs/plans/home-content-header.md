# Implementation Plan: Home content header

## Task 1: Add an optional feed content-type contract

- Acceptance: existing callers remain valid; Post and Article feeds paginate on
  the server.
- Verify: frontend type-check and backend tests.
- Files: feed client, feed controller/query/repository.

## Task 2: Add the responsive category header

- Acceptance: three accessible icon buttons render above the composer and the
  fixed-bar height matches its content.
- Verify: focused regression test and browser widths 320, 768, 1024, 1440.
- Files: feed header, composer, feed screen and responsive layout.

## Checkpoint

- Full frontend tests, lint and type-check pass.
- Backend tests pass.
- Browser console is clean.
