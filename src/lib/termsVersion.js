// Versão vigente das regras/termos. Ao alterar os termos, atualize esta data:
// todos os usuários serão obrigados a aceitar novamente no próximo acesso.
export const TERMS_VERSION = "2026-09-06";

const SESSION_KEY = "terms_accepted_session";

// O aceite vale para a sessão atual do app: ao abrir o aplicativo novamente,
// o usuário precisa confirmar as regras antes de usar as funções.
export const markTermsAcceptedThisSession = () => {
  try { sessionStorage.setItem(SESSION_KEY, TERMS_VERSION); } catch (e) { /* ignora */ }
};

export const acceptedThisSession = () => {
  try { return sessionStorage.getItem(SESSION_KEY) === TERMS_VERSION; } catch (e) { return false; }
};

export const needsTermsAcceptance = (user) => {
  if (!user) return false;
  if (user.terms_version !== TERMS_VERSION) return true;
  return !acceptedThisSession();
};

export const termsPayload = () => ({
  terms_accepted_at: new Date().toISOString(),
  terms_version: TERMS_VERSION,
});