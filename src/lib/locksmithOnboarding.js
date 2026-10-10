import { base44 } from '@/api/base44Client';
import { readLocksmithOnboarding, clearLocksmithOnboarding } from '@/lib/locksmithRegistration';

let pendingPreparation = null;

export default function prepareLocksmithProfile() {
  if (pendingPreparation) return pendingPreparation;
  pendingPreparation = (async () => {
    const user = await base44.auth.me();
    const draft = readLocksmithOnboarding(user);
    const belongsToUser = Boolean(draft);
    const profile = belongsToUser ? { specialty: draft.specialty, specialties: draft.specialties, vehicle: draft.vehicle, bio: draft.bio } : {};
    const { data } = await base44.functions.invoke('mercadoPagoConnect', { action: 'prepare_profile', profile });
    if (!data?.locksmith?.id) throw new Error('Não foi possível preparar seu perfil. Tente novamente.');
    if (belongsToUser) clearLocksmithOnboarding();
    return data.locksmith;
  })().finally(() => { pendingPreparation = null; });
  return pendingPreparation;
}