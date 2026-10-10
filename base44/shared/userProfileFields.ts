const PROFILE_FIELDS = [
  'account_type', 'phone', 'cpf', 'legal_name', 'username', 'avatar_url',
  'password_created', 'terms_accepted_at', 'terms_version',
  'moderation_blocked', 'moderation_block_reason', 'moderation_blocked_at',
];

// Preserve only app profile fields, never credentials or built-in User fields.
export function userProfileFields(user) {
  return Object.fromEntries(PROFILE_FIELDS
    .filter(field => user[field] !== undefined)
    .map(field => [field, user[field]]));
}