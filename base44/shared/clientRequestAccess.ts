import { clientRegistrationComplete } from './registrationEligibility.ts';
import { verifiedCpf } from './verifiedCpf.ts';

export function requestCustomerName(value) {
  const name = String(value || '').trim().replace(/\s+/g, ' ');
  return name.length >= 2 && name.length <= 100 && /\p{L}/u.test(name) && !/[\u0000-\u001f\u007f]/.test(name) ? name : '';
}

// A decisão vem do histórico da conta, nunca do armazenamento do aparelho.
export async function clientRequestAccess(base44, user) {
  if (!user?.id) return { allowed: false, registration_required: true };
  const history = await base44.asServiceRole.entities.ServiceRequest.filter({ created_by_id: user.id }, '-created_date', 1);
  const complete = clientRegistrationComplete(user, await verifiedCpf(base44, user.id));
  // O modo aplicativo exige login, não CPF, telefone, endereço de cadastro ou senha local.
  // Cadastro completo permanece exclusivo do modo livre; débitos e bloqueios são verificados no fluxo do chamado.
  return { allowed: true, registration_complete: complete, registration_required: false, first_call_available: history.length === 0 };
}