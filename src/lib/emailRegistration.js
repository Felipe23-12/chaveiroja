import { base44 } from '@/api/base44Client';

export function requiresEmailVerification(error) {
  const message = String(error?.message || '');
  return /email[_ ]not[_ ]verified|email[_ ]verification[_ ]required|unverified[_ ]email|email (?:is |has )?not (?:been )?(?:verified|confirmed)|(?:verify|confirm) your (?:e-?mail|email address)|e-?mail n[aã]o (?:verificado|confirmado)|confirme seu e-?mail/i.test(message);
}

export function registrationErrorMessage(error) {
  const detail = error?.response?.data;
  const message = String(detail?.message || detail?.detail || detail?.error || error?.message || '');
  if (/already (?:exists|registered)|already.*(?:in use|taken)|j[aá].*(?:cadastrad|registrad|existe|uso)/i.test(message) || error?.response?.status === 409) {
    return 'Não foi possível criar uma nova conta. Se você já se cadastrou, use Entrar ou Esqueci minha senha; não é necessário cadastrar novamente.';
  }
  return message || 'Não foi possível cadastrar. Tente novamente.';
}

export async function registerEmailAccount(email, password) {
  try {
    await base44.auth.register({ email: email.trim().toLowerCase(), password });
  } catch (error) {
    // Somente uma exigência explícita de verificação permite retomar o OTP.
    // Um erro genérico contendo "email" não significa que um código foi enviado.
    if (!requiresEmailVerification(error)) throw error;
    await base44.auth.resendOtp(email.trim().toLowerCase());
  }
}