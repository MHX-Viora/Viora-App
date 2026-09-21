import type { Session, User } from "../types/auth";

export const withUpdatedUser = (session: Session, user: User): Session => ({
  ...session,
  user: { ...session.user, ...user },
});
