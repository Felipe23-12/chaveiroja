import { base44 } from '@/api/base44Client';
import { termsPayload } from '@/lib/termsVersion';
import { isFullName } from '@/lib/fullName';
import { isValidCpf, onlyDigits } from '@/lib/cpf';

const KEY = 'chaveiro_onboarding';
export function saveLocksmithOnboarding(draft) {
  const raw = JSON.stringify({ ...draft, savedAt: Date.now(), terms: termsPayload() });
  localStorage.setItem(KEY, raw);
  sessionStorage.setItem(KEY, raw);
}
export function readLocksmithOnboarding(user) {
  const raw = sessionStorage.getItem(KEY) || localStorage.getItem(KEY);
  if (!raw) return null;
  let draft;
  try { draft = JSON.parse(raw); } catch { return null; }
  if (draft.email?.trim().toLowerCase() !== user.email?.trim().toLowerCase()) return null;
  if (draft.savedAt && Date.now() - draft.savedAt > 24 * 60 * 60 * 1000) return null;
  return draft;
}
export function clearLocksmithOnboarding() {
  localStorage.removeItem(KEY);
  sessionStorage.removeItem(KEY);
}
export async function resumeLocksmithOnboarding(user) {
  if (!user || user.role === 'admin' || user.is_verified !== true) return user;
  const draft = readLocksmithOnboarding(user);
  if (!draft || !isFullName(draft.fullName) || !/^\d{10,11}$/.test(onlyDigits(draft.phone)) || !isValidCpf(draft.cpf)) return user;
  await base44.auth.updateMe({
    legal_name: user.legal_name || draft.fullName.trim(),
    phone: user.phone || draft.phone,
    account_type: 'chaveiro',
    ...(user.terms_accepted_at ? {} : draft.terms || termsPayload()),
  });
  const { data: status } = await base44.functions.invoke('claimCpf', { action: 'status' });
  if (!status.linked && !status.pending && !status.rejected) {
    const { data } = await base44.functions.invoke('claimCpf', { cpf: draft.cpf });
    if (!data?.received) throw new Error('Não foi possível enviar o cadastro para análise.');
  }
  return base44.auth.me();
}