import { createProductionTransport } from './host-transport';
import { readNativeHostMessage } from './native-navigation';

type Options = Parameters<typeof createProductionTransport>[0];
export function createNativeHostChannel(options: Omit<Options, 'source' | 'send'> & { send: (value: string) => void }) {
  const source = {}, transport = createProductionTransport({ ...options, source: () => source,
    send: message => options.send(JSON.stringify(message)) });
  let stopped = false;
  return {
    async receive(event: unknown) {
      if (stopped) return;
      const data = readNativeHostMessage(event, options.hostOrigin);
      if (data) await transport.handle({ origin: options.hostOrigin, source, data });
    },
    dispose() { if (!stopped) { stopped = true; transport.dispose(); } },
  };
}
