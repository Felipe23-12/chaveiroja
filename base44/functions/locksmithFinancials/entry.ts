import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Busca (ou cria, se ainda não existir) o registro financeiro do chaveiro.
// LocksmithFinancials guarda os campos sensíveis que antes viviam soltos no
// Locksmith (Pix, banco, saldo, documentos de revalidação) — separados numa
// entity com leitura/escrita restrita ao próprio dono + admin, corrigindo a
// exposição desses dados a qualquer usuário logado.
async function getOrCreateFinancials(base44, locksmith) {
  const existing = await base44.asServiceRole.entities.LocksmithFinancials.filter({ locksmith_id: locksmith.id });
  if (existing?.[0]) return existing[0];
  return base44.asServiceRole.entities.LocksmithFinancials.create({
    locksmith_id: locksmith.id,
    locksmith_user_id: locksmith.created_by_id,
  });
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();

    // Reenvio de documentos para reativar um perfil desativado por inatividade.
    if (body.action === 'save_revalidation') {
      const profiles = await base44.asServiceRole.entities.Locksmith.filter({ created_by_id: user.id });
      const locksmith = profiles?.[0];
      if (!locksmith) return Response.json({ error: 'Perfil de chaveiro não encontrado' }, { status: 404 });
      const docs = Array.isArray(body.documents) ? body.documents.filter((d) => typeof d === 'string' && d) : [];
      if (!docs.length) return Response.json({ error: 'Envie pelo menos um documento' }, { status: 400 });

      const financials = await getOrCreateFinancials(base44, locksmith);
      const now = new Date().toISOString();
      await base44.asServiceRole.entities.LocksmithFinancials.update(financials.id, {
        revalidation_documents: docs,
        revalidated_at: now,
      });
      const updatedLocksmith = await base44.asServiceRole.entities.Locksmith.update(locksmith.id, {
        last_accepted_at: now,
        inactive_deactivated: false,
        available: true,
      });
      return Response.json({ success: true, locksmith: updatedLocksmith, revalidation_documents: docs, revalidated_at: now });
    }

    return Response.json({ error: 'Ação inválida' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
