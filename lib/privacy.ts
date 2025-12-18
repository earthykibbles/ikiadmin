export function shortId(input?: string | null, len = 6) {
  const v = (input || '').trim();
  if (!v) return 'unknown';
  const clean = v.replace(/[^a-zA-Z0-9]/g, '');
  if (clean.length <= len) return clean;
  return clean.slice(-len);
}

export function maskEmail(email?: string | null) {
  const v = (email || '').trim();
  if (!v) return '';
  const at = v.indexOf('@');
  if (at <= 0) return `${v.slice(0, 1)}***`;
  const name = v.slice(0, at);
  const domain = v.slice(at + 1);
  const visible = name.slice(0, 1);
  return `${visible}${'*'.repeat(Math.min(6, Math.max(1, name.length - 1)))}@${domain}`;
}

export function maskPhone(phone?: string | null) {
  const v = (phone || '').trim();
  if (!v) return '';
  const digits = v.replace(/\D/g, '');
  if (!digits) return '***';
  const last = digits.slice(-4);
  return `***-***-${last.padStart(4, '*')}`;
}

export function maskName(name?: string | null) {
  const v = (name || '').trim();
  if (!v) return '';
  return `${v.slice(0, 1)}***`;
}

export function dicebearAvatarUrl(seed: string) {
  // Use a non-initials style to avoid leaking name/initials.
  const safeSeed = encodeURIComponent((seed || 'user').trim() || 'user');
  return `https://api.dicebear.com/9.x/bottts-neutral/svg?seed=${safeSeed}`;
}

export type BasicUserLike = {
  id?: string | null;
  firstname?: string | null;
  lastname?: string | null;
  username?: string | null;
  email?: string | null;
};

export function getUserLabel(user: BasicUserLike, privacyMode: boolean) {
  if (privacyMode) {
    return `User ${shortId(user.id || user.username || user.email)}`;
  }

  const first = (user.firstname || '').trim();
  const last = (user.lastname || '').trim();
  if (first && last) return `${first} ${last}`;
  if (first) return first;
  if ((user.username || '').trim()) return (user.username || '').trim();
  if ((user.email || '').trim()) return (user.email || '').trim();
  return 'Unknown User';
}

export function getUserSecondaryLabel(user: BasicUserLike, privacyMode: boolean) {
  if (privacyMode) {
    const id = shortId(user.id || user.username || user.email);
    return `id:${id}`;
  }

  if ((user.username || '').trim()) return `@${(user.username || '').trim()}`;
  return '';
}

export function getUserAvatarSeed(user: BasicUserLike) {
  return (user.id || user.username || user.email || 'user').toString();
}

export function redactFreeText(value?: string | null, privacyMode?: boolean) {
  const v = (value || '').trim();
  if (!v) return '';
  if (!privacyMode) return v;
  return '[Hidden in privacy mode]';
}



