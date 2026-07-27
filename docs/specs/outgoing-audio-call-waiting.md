# Spec: Outgoing audio call waiting

## Objective

Make the outgoing audio-call waiting screen match the video-call header,
animate three rings around the other participant's avatar, play a louder
bundled ringtone for both caller and receiver, and leave unanswered calls
after 30 seconds.

## Tech stack

- Expo 54 / React Native 0.81
- Expo Audio 1.1
- React Native Animated
- Existing REST, SignalR, and WebRTC call flow

## Commands

- Unit test: `node --experimental-strip-types features/calls/call-waiting.test.mjs`
- Type-check: `npx tsc --noEmit`
- Lint: `npm run lint`

## Project structure

- `features/calls/voice-call-screen.tsx`: call lifecycle and screen layout
- `components/calls/call-visuals.tsx`: reusable avatar halo animation
- `features/calls/call-waiting.ts`: waiting-state policy
- `assets/audio/`: bundled ringback audio

## Code style

Keep timeout and ringback policy pure and tested. UI effects consume that
policy and always clean up timers, animation loops, and audio playback.

## Testing strategy

- Unit-test the exact 30-second timeout, caller ringback policy, and volume.
- Run TypeScript and ESLint.
- Manually verify outgoing audio calls on a physical device.

## Boundaries

- Always: stop caller ringback on accept, reject, cancel, error, timeout, or unmount.
- Ask first: change backend call status semantics.
- Never: modify video media negotiation or WebRTC signaling order.

## Success criteria

- Audio-call header shows the participant name and current status like video.
- Three rings animate around the avatar only while waiting/connecting.
- A boosted `nhac_chuong.mp3` plays on the receiver notification and caller waiting screen.
- Incoming notification prominently shows caller avatar/name, call state, and answer/reject actions.
- An unanswered outgoing call leaves the call screen after exactly 30 seconds.
- Existing backend timeout remains the durable source of missed-call state.

## Open questions

- None.
