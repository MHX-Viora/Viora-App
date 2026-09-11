# Plan: Individual chat attachments

1. Add and test a pure rule that splits selected attachments into ordered one-file send units.
2. Update the optimistic send flow to create and settle one message per unit.
3. Add regression coverage for independent failures/actions, then run test, typecheck, and lint.
