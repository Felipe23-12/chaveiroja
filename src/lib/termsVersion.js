// Versão vigente das regras/termos.
export const TERMS_VERSION = "2026-09-28";

// Um novo aceite registra a versão vigente quando as regras mudam.
export const needsTermsAcceptance = (user) => {
  if (!user) return false;
  return !user.terms_accepted_at || user.terms_version !== TERMS_VERSION;
};

export const termsPayload = () => ({
  terms_accepted_at: new Date().toISOString(),
  terms_version: TERMS_VERSION,
});