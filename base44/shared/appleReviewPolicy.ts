// Only this server-side module defines the Apple review account allowlist.
const ACCOUNTS = Object.freeze({
  cliente: 'felipemotacs1+cliente@gmail.com',
  chaveiro: 'felipemotacs1+chaveiro@gmail.com',
});
export function appleReviewRole(user) {
  if (!user?.id) return null;
  const email = String(user.email || '').trim().toLowerCase();
  return Object.keys(ACCOUNTS).find(role => ACCOUNTS[role] === email) || null;
}
export function isAppleReviewRequest(request) { return request?.apple_review === true; }
export async function appleReviewAccounts(base44) {
  const users = await base44.asServiceRole.entities.User.filter({ email: { $in: Object.values(ACCOUNTS) } });
  return Object.fromEntries(Object.keys(ACCOUNTS).map(role => [role, users.find(u => appleReviewRole(u) === role) || null]));
}
export async function appleReviewUserIds(base44) {
  return Object.values(await appleReviewAccounts(base44)).filter(Boolean).map(u => u.id);
}
export async function reviewPairAllowed(base44, clientId, locksmithUserId) {
  const accounts = await appleReviewAccounts(base44);
  const clientReview = accounts.cliente?.id === clientId;
  const locksmithReview = accounts.chaveiro?.id === locksmithUserId;
  return clientReview === locksmithReview;
}