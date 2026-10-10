const PROFILE_FIELDS = [
  'account_type', 'phone', 'cpf', 'legal_name', 'username', 'avatar_url',
  'password_created', 'terms_accepted_at', 'terms_version',
  'moderation_blocked', 'moderation_block_reason', 'moderation_blocked_at',
];

// Partial profile saves must retain the account type and other existing profile
// fields. Never copy authentication credentials or read-only User attributes.
export default function preserveAccountProfile(auth) {
  const updateMe = auth.updateMe.bind(auth);
  let pending = Promise.resolve();
  auth.updateMe = (changes) => {
    const save = pending.then(async () => {
      const current = await auth.me();
      const profile = Object.fromEntries(PROFILE_FIELDS
        .filter(field => current[field] !== undefined)
        .map(field => [field, current[field]]));
      return updateMe({ ...profile, ...changes });
    });
    // Serialize writes so simultaneous changes do not restore an older profile.
    // The caller still receives the original rejection and displays its error.
    pending = save.catch(() => {});
    return save;
  };
}