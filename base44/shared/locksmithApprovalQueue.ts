// Caller must verify the administrator before invoking this query.
export async function locksmithApprovalQueue(base44, cursor) {
  // User has no cursor/count API; filter by account type on the server.
  const users = await base44.entities.User.filter({ account_type: 'chaveiro' });
  const byId = new Map(users.map(user => [user.id, user]));
  const query = { user_id: { $in: [...byId.keys()] }, ownership_verified: { $ne: true } };
  const [page, total] = await Promise.all([
    base44.entities.VerifiedCpf.filter(query, { sort: 'created_date', limit: 25, ...(cursor ? { cursor } : {}) }),
    base44.entities.VerifiedCpf.count(query),
  ]);
  const ids = [...new Set(page.items.map(row => row.user_id))];
  const profiles = ids.length ? await base44.entities.Locksmith.filter({ created_by_id: { $in: ids } }, { sort: '-updated_date', limit: 100, fields: ['created_by_id', 'specialty', 'specialties', 'vehicle', 'bio'] }) : { items: [] };
  const profileByUser = new Map();
  for (const profile of profiles.items) if (!profileByUser.has(profile.created_by_id)) profileByUser.set(profile.created_by_id, profile);
  return {
    total, next_cursor: page.next_cursor, has_more: page.has_more,
    items: page.items.map(row => {
      const user = byId.get(row.user_id);
      return { id: row.id, cpf: row.cpf, created_date: row.created_date, name: user.legal_name || user.full_name, email: user.email, phone: user.phone, profile: profileByUser.get(row.user_id) || null };
    }),
  };
}