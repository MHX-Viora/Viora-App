import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
} from "@microsoft/signalr";

import { getAccessToken } from "@/stores/session-store";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "";

let connection: HubConnection | null = null;
let startPromise: Promise<HubConnection | null> | null = null;
const reconnectListeners = new Set<() => void>();

const waitForConnected = async (next: HubConnection) =>
  new Promise<HubConnection | null>((resolve) => {
    const startedAt = Date.now();
    const timer = setInterval(() => {
      if (next.state === HubConnectionState.Connected) {
        clearInterval(timer);
        resolve(next);
      } else if (
        next.state === HubConnectionState.Disconnected ||
        Date.now() - startedAt >= 10000
      ) {
        clearInterval(timer);
        resolve(null);
      }
    }, 50);
  });

const getConnection = () => {
  if (!connection) {
    connection = new HubConnectionBuilder()
      .withUrl(`${BASE_URL}/hubs/calls`, {
        accessTokenFactory: async () => (await getAccessToken()) ?? "",
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000])
      .configureLogging(LogLevel.None)
      .build();
    connection.onreconnecting((error) => {
      console.info(
        "[Call][SignalR] reconnecting",
        error?.message ?? "connection interrupted",
      );
    });
    connection.onreconnected(() => {
      console.info("[Call][SignalR] reconnected");
      reconnectListeners.forEach((listener) => listener());
    });
    connection.onclose((error) => {
      console.info("[Call][SignalR] closed", error?.message ?? "connection closed");
    });
  }
  return connection;
};

export const startCallRealtime = async () => {
  if (!BASE_URL) return null;
  const next = getConnection();
  if (next.state === HubConnectionState.Connected) return next;
  if (startPromise) return startPromise;
  if (next.state === HubConnectionState.Disconnected) {
    startPromise = next
      .start()
      .then(() => next)
      .finally(() => {
        startPromise = null;
      });
    return startPromise;
  }
  return waitForConnected(next);
};

export const onCallRealtime = (eventName: string, handler: (payload: unknown) => void) => {
  const next = getConnection();
  next.on(eventName, handler);
  return () => next.off(eventName, handler);
};

export const onCallRealtimeReconnected = (handler: () => void) => {
  reconnectListeners.add(handler);
  return () => reconnectListeners.delete(handler);
};

const invokeCallHub = async (methodName: string, ...args: unknown[]) => {
  const next = await startCallRealtime();
  if (!next) {
    throw new Error("Không thể kết nối máy chủ cuộc gọi.");
  }
  await next.invoke(methodName, ...args);
};

export const sendCallOffer = (callId: string, offer: unknown) =>
  invokeCallHub("Offer", callId, offer);

export const sendCallAccepted = (callId: string) =>
  invokeCallHub("AcceptCall", callId);

export const sendCallAnswer = (callId: string, answer: unknown) =>
  invokeCallHub("Answer", callId, answer);

export const sendCallIceCandidate = (callId: string, candidate: unknown) =>
  invokeCallHub("IceCandidate", callId, candidate);

export const sendReconnectCall = (callId: string) =>
  invokeCallHub("ReconnectCall", callId);
