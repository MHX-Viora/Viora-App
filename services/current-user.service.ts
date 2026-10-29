import { getUserProfile } from '@/services/user.service';
import { getSession, updateUser } from '@/stores/session-store';
import type { User } from '@/types/auth';

export async function refreshCurrentUser(): Promise<User | null> {
  const session = await getSession();
  if (!session?.user) return null;
  try {
    const profile = await getUserProfile(session.user.id);
    const current = await getSession();
    if (current?.user?.id !== session.user.id || profile.id !== session.user.id) return current?.user ?? null;
    const user = { ...current.user, accountStyle: profile.accountStyle, isVerified: profile.isVerified };
    await updateUser(user);
    return user;
  } catch {
    return (await getSession())?.user ?? null;
  }
}
