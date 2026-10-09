import { base44 } from '@/api/base44Client';
import { claimCpf } from '@/lib/cpfRegistration';
import { termsPayload } from '@/lib/termsVersion';

const KEY = 'cliente_onboarding';
export function saveClientOnboarding(draft) {
  // Nunca armazene senha; a API continua responsável por verificar a conta.
  const data = JSON.stringify({ ...draft, savedAt: Date.now(), terms: termsPayload() });
  localStorage.setItem(KEY, data);
  sessionStorage.setItem(KEY, data);
}
export async function resumeClientOnboarding(user) {
  if (!user || user.account_type === 'chaveiro') return user;
  const raw = localStorage.getItem(KEY) || sessionStorage.getItem(KEY);
  if (!raw) return user;
  let draft;
  try { draft = JSON.parse(raw); } catch { return user; }
  if (!draft.email || draft.email !== user.email?.trim().toLowerCase() || !draft.savedAt || Date.now() - draft.savedAt > 24 * 60 * 60 * 1000) return user;
  await claimCpf(draft.cpf);
  const updated = await base44.auth.updateMe({
    legal_name: user.legal_name || draft.fullName.trim(),
    phone: user.phone || draft.phone,
    account_type: 'cliente',
    ...(user.terms_accepted_at ? {} : draft.terms),
  });
  localStorage.removeItem(KEY);
  sessionStorage.removeItem(KEY);
  return updated;
}
