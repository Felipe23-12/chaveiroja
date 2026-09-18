import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { getOrCreateFinancials } from '../../shared/locksmithFinancials.ts';

// Migração única (correção do C3, auditoria de segurança de 2026-09-18):
// Pix, banco, saldo, comissão pendente e documentos de revalidação viviam
// soltos no Locksmith, entity que qualquer usuário autenticado consegue ler
// por inteiro. Esses campos foram movidos para LocksmithFinancials (leitura/
// escrita restrita ao próprio dono + admin), e todo código novo já lê/escreve
// só na entity nova. Esta function faz a faxina nos registros que já
// existiam antes da mudança: soma o que estiver represado no Locksmith
// antigo dentro do registro financeiro correspondente, e zera/limpa os
// campos no Locksmith (fechando a exposição para quem já tinha perfil antes
// da correção). Rode com dry_run: true primeiro para conferir o que seria
// alterado, sem gravar nada.
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Apenas administradores podem executar esta migração' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const dryRun = body.dry_run === true;

    const locksmiths = await base44.asServiceRole.entities.Locksmith.list('-created_date', 1000);
    const touched: any[] = [];

    for (const l of locksmiths) {
      const hasLegacyData =
        Number(l.wallet_balance || 0) !== 0 ||
        Number(l.pending_balance || 0) !== 0 ||
        Number(l.pending_cash_commission || 0) !== 0 ||
        !!String(l.pix_key_value || '').trim() ||
        !!String(l.bank_name || '').trim() ||
        (Array.isArray(l.revalidation_documents) && l.revalidation_documents.length > 0) ||
        !!l.revalidated_at;

      if (!hasLegacyData) continue;

      touched.push({
        id: l.id,
        name: l.name,
        legacy_wallet_balance: l.wallet_balance || 0,
        legacy_pending_balance: l.pending_balance || 0,
        legacy_pending_cash_commission: l.pending_cash_commission || 0,
        had_pix: !!String(l.pix_key_value || '').trim(),
        had_bank: !!String(l.bank_name || '').trim(),
        documents_count: l.revalidation_documents?.length || 0,
      });

      if (dryRun) continue;

      const financials = await getOrCreateFinancials(base44, l);
      await base44.asServiceRole.entities.LocksmithFinancials.update(financials.id, {
        // Soma: o registro novo pode já ter acumulado atividade legítima
        // desde que o código passou a escrever só nele; o valor antigo do
        // Locksmith fica congelado desde então, então somar não duplica nada.
        wallet_balance: Math.round(((Number(financials.wallet_balance || 0) + Number(l.wallet_balance || 0))) * 100) / 100,
        pending_balance: Math.round(((Number(financials.pending_balance || 0) + Number(l.pending_balance || 0))) * 100) / 100,
        pending_cash_commission: Math.round(((Number(financials.pending_cash_commission || 0) + Number(l.pending_cash_commission || 0))) * 100) / 100,
        pix_key_type: financials.pix_key_type || l.pix_key_type || undefined,
        pix_key_value: financials.pix_key_value || l.pix_key_value || undefined,
        bank_name: financials.bank_name || l.bank_name || undefined,
        revalidation_documents: financials.revalidation_documents?.length ? financials.revalidation_documents : (l.revalidation_documents || []),
        revalidated_at: financials.revalidated_at || l.revalidated_at || undefined,
      });

      await base44.asServiceRole.entities.Locksmith.update(l.id, {
        wallet_balance: 0,
        pending_balance: 0,
        pending_cash_commission: 0,
        pix_key_type: null,
        pix_key_value: null,
        bank_name: null,
        revalidation_documents: [],
        revalidated_at: null,
      });
    }

    return Response.json({ checked: locksmiths.length, migrated: touched.length, details: touched, dry_run: dryRun });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
