// Versão vigente das regras/termos.
export const TERMS_VERSION = "2026-09-08";

// O aceite dos termos é obrigatório apenas UMA vez, no cadastro.
export const needsTermsAcceptance = (user) => {
  if (!user) return false;
  return !user.terms_accepted_at;
};

export const termsPayload = () => ({
  terms_accepted_at: new Date().toISOString(),
  terms_version: TERMS_VERSION,
});