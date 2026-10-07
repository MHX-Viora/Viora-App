# Plan

1. Trace API/realtime/overlay/model and reproduce quantity loss with lifecycle tests.
2. Replace merged/drop queue with descriptor expansion, capped stagger scheduler, transaction dedupe, immutable snapshot and per-event counters; test virtual lifecycle clock exhaustively.
3. Mount independently keyed scenes with own completion clock, pause/resume and deterministic variants. Synchronize progressive banner quantity/milestones with real starts.
4. Inspect actual scene START/COMPLETE in host/viewer fixtures, repeated/mixed quantity, reduced motion, mobile bounds, resource cap/cleanup/memory. Run checks, review and document evidence/limits.
