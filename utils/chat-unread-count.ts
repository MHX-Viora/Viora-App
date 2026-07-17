type Listener = (count: number) => void;

const listeners = new Set<Listener>();
let unreadCount = 0;

export const getChatUnreadCount = () => unreadCount;

export const setChatUnreadCount = (count: number) => {
  unreadCount = Math.max(0, count);
  setTimeout(() => {
    listeners.forEach((listener) => listener(unreadCount));
  }, 0);
};

export const subscribeChatUnreadCount = (listener: Listener) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
