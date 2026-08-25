export type WebCallOfferState = {
  offer: unknown | null;
  sending: boolean;
  sent: boolean;
};

export type WebCallOfferResult =
  | { status: "in-flight" | "sent" }
  | { error: unknown; status: "failed" };

export const createWebCallOfferState = (): WebCallOfferState => ({
  offer: null,
  sending: false,
  sent: false,
});

export const sendWebCallOfferOnce = async (
  state: WebCallOfferState,
  createOffer: () => Promise<unknown>,
  sendOffer: (offer: unknown) => Promise<void>,
): Promise<WebCallOfferResult> => {
  if (state.sent) return { status: "sent" };
  if (state.sending) return { status: "in-flight" };

  state.sending = true;
  try {
    state.offer ??= await createOffer();
    await sendOffer(state.offer);
    state.offer = null;
    state.sent = true;
    return { status: "sent" };
  } catch (error) {
    return { error, status: "failed" };
  } finally {
    state.sending = false;
  }
};
