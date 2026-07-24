# Call history messages

## Objective

Persist one system message in a private conversation whenever an audio or video
call reaches a terminal state. Both participants see it immediately through the
existing chat realtime channel and after reloading message history.

## Commands

```powershell
cd viora-BE
dotnet build viora-BE\viora-BE.csproj --no-restore
dotnet test Viora.Infrastructure\Viora.Infrastructure.Tests\Viora.Infrastructure.Tests.csproj --no-restore --filter "FullyQualifiedName~CallHistoryMessage"

cd ..\viora
npx tsc --noEmit
npm run lint
```

## Structure

- Application Calls: formatting and persistence contract.
- Infrastructure Calls: idempotent message persistence.
- Call delivery: realtime `ReceiveMessage` publication.
- Existing chat renderer: displays `MessageType.System`.

## Testing

- Unit-test content for ended, rejected, cancelled, and missed calls.
- Verify deterministic message ID prevents duplicate history entries.
- Build backend and type-check/lint the mobile app.

## Boundaries

- Always: use the existing `Messages` table and realtime chat contract.
- Ask first: add a new table, dependency, or migration.
- Never: allow clients to create call-history messages directly.

## Success criteria

- Exactly one message exists per call.
- Ended calls show type and duration.
- Other terminal states show a Vietnamese result label.
- Both users receive the message without refreshing.
- Reloading the conversation retains the message.
