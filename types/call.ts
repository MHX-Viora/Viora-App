export type CallParticipant = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
};

export enum CallStatus {
  Calling = 0,
  Accepted = 1,
  Rejected = 2,
  Missed = 3,
  Cancelled = 4,
  Ended = 5,
}

export enum CallType {
  Audio = 0,
  Video = 1,
}

export type CallSession = {
  id: string;
  conversationId: string;
  caller: CallParticipant;
  receiver: CallParticipant;
  callType: CallType;
  status: CallStatus;
  startedAt: string;
  answeredAt: string | null;
  endedAt: string | null;
  duration: number | null;
};

export type IncomingCallEvent = {
  callId: string;
  conversationId: string;
  caller: CallParticipant;
  callType: CallType;
};

export type CallEndedEvent = {
  callId: string;
  conversationId: string;
  status: CallStatus;
  duration: number | null;
};

export type CallSignalEvent = {
  callId: string;
  conversationId: string;
  fromUserId: string;
  signal: unknown;
};

export type IceServer = {
  urls: string[];
  username?: string;
  credential?: string;
};
