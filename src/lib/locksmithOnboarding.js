import { base44 } from '@/api/base44Client';

let pendingPreparation = null;

export default function prepareLocksmithProfile() {
  if (pendingPreparation) return pendingPreparation;
  pendingPreparation = (async () => {
    const user = await base44.auth.me();
    const raw = sessionStorage.getItem('chaveiro_onboarding');
    const draft = raw ? JSON.parse(raw) : null;
    const digits = value => String(value || '').replace(/\D/g, '');
    const belongsToUser = draft && ((draft.email && draft.email === user.email?.toLowerCase()) || (digits(draft.cpf) && digits(draft.cpf) === digits(user.cpf)));
    const profile = belongsToUser ? { specialty: draft.specialty, specialties: draft.specialties, vehicle: draft.vehicle, bio: draft.bio } : {};
    const { data } = await base44.functions.invoke('mercadoPagoConnect', { action: 'prepare_profile', profile });
    if (!data?.locksmith?.id) throw new Error('Não foi possível preparar seu perfil. Tente novamente.');
    if (belongsToUser && sessionStorage.getItem('chaveiro_onboarding') === raw) sessionStorage.removeItem('chaveiro_onboarding');
    return data.locksmith;
  })().finally(() => { pendingPreparation = null; });
  return pendingPreparation;
}