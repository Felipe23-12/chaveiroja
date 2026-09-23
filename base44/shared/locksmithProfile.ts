const SPECIALTIES = ['Residencial', 'Automotivo', 'Comercial', 'Emergencial'];

// Recebe exclusivamente o usuário autenticado pelo chamador; nunca um ID do payload.
export async function ensureLocksmithProfile(base44, user, details = {}) {
  const profiles = await base44.asServiceRole.entities.Locksmith.filter({ created_by_id: user.id }, '-updated_date', 1);
  if (profiles[0]) return profiles[0];
  if (user.account_type !== 'chaveiro' || user.is_verified !== true) {
    throw new Error('Entre com sua conta de chaveiro e confirme seu email para configurar os recebimentos.');
  }
  const name = String(user.legal_name || user.full_name || '').trim();
  if (!name) throw new Error('Complete seu nome no cadastro antes de configurar os recebimentos.');
  const source = Array.isArray(details?.specialties) ? details.specialties : [details?.specialty || 'Residencial'];
  const specialties = [...new Set(source.filter(value => SPECIALTIES.includes(value)))].slice(0, 4);
  const vehicle = typeof details?.vehicle === 'string' ? details.vehicle.trim().slice(0, 160) : '';
  const bio = typeof details?.bio === 'string' ? details.bio.trim().slice(0, 1000) : '';
  return await base44.asServiceRole.entities.Locksmith.create({
    created_by_id: user.id,
    name,
    phone: user.phone || '',
    specialty: specialties[0] || 'Residencial',
    specialties: specialties.length ? specialties : ['Residencial'],
    vehicle,
    bio,
    work_mode: 'app',
    available: true,
    online: false,
  });
}