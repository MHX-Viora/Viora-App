type Listener = (count: number) => void;

const listeners = new Set<Listener>();
let unreadCount = 0;

export const getNotificationUnreadCount = () => unreadCount;

export const setNotificationUnreadCount = (count: number) => {
  unreadCount = Math.max(0, count);
  setTimeout(() => {
    listeners.forEach((listener) => listener(unreadCount));
  }, 0);
};

export const subscribeNotificationUnreadCount = (listener: Listener) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
