// Display hint only. Never use this value for authorization or API access.
export function writePublicProfileHint(user) {
  if (typeof window === 'undefined') return;
  try {
    if (typeof user?.displayName === 'string' && user.displayName) window.localStorage.setItem('ankt.public-profile-hint', JSON.stringify({ displayName: user.displayName.slice(0, 80) }));
    else window.localStorage.removeItem('ankt.public-profile-hint');
  } catch { /* Display hints must never block login or logout. */ }
}
