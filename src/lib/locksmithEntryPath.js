import { isFullName } from '@/lib/fullName';
import { isValidCpf, onlyDigits } from '@/lib/cpf';

// Missing profile data must lead to the editable, authenticated form, not
// back to account creation. Service-access guards remain unchanged.
export default function locksmithEntryPath(user, returnTo = '/') {
  if (user.role === 'admin') return returnTo !== '/' ? returnTo : '/painel-admin';
  if (user.account_type !== 'chaveiro') return returnTo;
  if (!isFullName(user.legal_name || user.full_name) ||
      !/^\d{10,11}$/.test(onlyDigits(user.phone)) || !isValidCpf(user.cpf)) return '/meus-dados';
  const path = returnTo.split('?')[0];
  const registration = /^\/(?:login|register|cadastro\/(?:chaveiro|cliente)|google-complete)(?:\/|$)/.test(path);
  return returnTo === '/' || registration ? '/painel-chaveiro' : returnTo;
}