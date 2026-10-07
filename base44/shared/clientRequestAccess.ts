import { clientRegistrationComplete } from './registrationEligibility.ts';
import { verifiedCpf } from './verifiedCpf.ts';

export function requestCustomerName(value) {
  const name = String(value || '').trim().replace(/\s+/g, ' ');
  return name.length >= 2 && name.length <= 100 && /\p{L}/u.test(name) && !/[\u0000-\u001f\u007f]/.test(name) ? name : '';
}

// A decisão vem do histórico da conta, nunca do armazenamento do aparelho.
export async function clientRequestAccess(base44, user) {
  if (!user?.id) return { allowed: false, registration_required: true };
  const complete = clientRegistrationComplete(user, await verifiedCpf(base44, user.id));
  if (complete) return { allowed: true, registration_complete: true, registration_required: false };
  const events = await base44.asServiceRole.entities.ClientCancellationEvent.filter({ client_id: user.id }, '-created_date', 1);
  const cancelled = events.length ? events : await base44.asServiceRole.entities.ServiceRequest.filter({
    created_by_id: user.id, status: 'cancelled', cancelled_by: 'cliente',
  }, '-created_date', 1);
  return { allowed: !cancelled.length, registration_complete: false, registration_required: !!cancelled.length };
}
