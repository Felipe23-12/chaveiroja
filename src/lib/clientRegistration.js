import { isValidCpf, onlyDigits } from '@/lib/cpf';
import { isFullName } from '@/lib/fullName';

export function clientRegistrationComplete(user) {
  return user?.role === 'admin' || Boolean(user && isValidCpf(user.cpf) && /^\d{10,11}$/.test(onlyDigits(user.phone)) && isFullName(user.legal_name || user.full_name) && user.is_verified === true && user.password_created === true && user.terms_accepted_at);
}

export function clientCompletionUrl(serviceId = '') {
  const returnTo = serviceId ? `/?step=2&service=${encodeURIComponent(serviceId)}` : '/';
  return `/google-complete?tipo=cliente&returnTo=${encodeURIComponent(returnTo)}`;
}