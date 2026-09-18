// Dados financeiros/sensíveis do chaveiro (Pix, banco, saldo, documentos de
// revalidação) vivem em LocksmithFinancials — entity separada do Locksmith,
// com leitura/escrita restrita ao próprio dono + admin. Antes desses campos
// serem separados, qualquer usuário autenticado conseguia ler o Locksmith de
// qualquer chaveiro por inteiro, expondo esses dados.
export async function getOrCreateFinancials(base44, locksmith) {
  const existing = await base44.asServiceRole.entities.LocksmithFinancials.filter({ locksmith_id: locksmith.id });
  if (existing?.[0]) return existing[0];
  return base44.asServiceRole.entities.LocksmithFinancials.create({
    locksmith_id: locksmith.id,
    locksmith_user_id: locksmith.created_by_id,
  });
}

export async function getFinancials(base44, locksmithId) {
  if (!locksmithId) return null;
  const existing = await base44.asServiceRole.entities.LocksmithFinancials.filter({ locksmith_id: locksmithId });
  return existing?.[0] || null;
}
