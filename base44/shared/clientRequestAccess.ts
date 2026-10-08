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
  const firstCall = history.length === 0;
  // O primeiro chamado pode ser feito apenas com o login e o nome/localização exigidos
  // pelo fluxo simplificado. Depois que existe qualquer chamado no histórico — inclusive
  // um chamado cancelado — o cliente precisa concluir o cadastro antes de solicitar outro.
  // Clientes já completos continuam liberados normalmente.
  return {
    allowed: complete || firstCall,
    registration_complete: complete,
    registration_required: !complete && !firstCall,
    first_call_available: firstCall,
  };
}