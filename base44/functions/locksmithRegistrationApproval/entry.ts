import { createClientFromRequest } from 'npm:@base44/sdk@0.8.53';
import { locksmithApprovalQueue } from '../../shared/locksmithApprovalQueue.ts';
import { cpfCanBeAssigned, SHARED_OWNER_EXCEPTION } from '../../shared/cpfOwnershipPolicy.ts';
import { isValidCpf, onlyDigits } from '../../shared/registrationEligibility.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const admin = await base44.auth.me();
    if (!admin || admin.role !== 'admin') return Response.json({ error: 'Acesso exclusivo da administração.' }, { status: 403 });
    const body = await req.json();
    if (body.action === 'list') {
      if (body.cursor != null && (typeof body.cursor !== 'string' || body.cursor.length > 4000)) return Response.json({ error: 'Página inválida.' }, { status: 400 });
      return Response.json(await locksmithApprovalQueue(base44, body.cursor));
    }
    if (body.action !== 'approve' || typeof body.id !== 'string' || !body.id || body.id.length > 100) return Response.json({ error: 'Solicitação inválida.' }, { status: 400 });
    const note = typeof body.note === 'string' ? body.note.trim() : '';
    if (body.ownership_confirmed !== true || note.length < 10 || note.length > 1000) return Response.json({ error: 'Confirme a comprovação de titularidade e registre a conferência realizada.' }, { status: 400 });
    const row = await base44.entities.VerifiedCpf.get(body.id);
    if (!row) return Response.json({ error: 'Solicitação não encontrada.' }, { status: 404 });
    const target = await base44.entities.User.get(row.user_id);
    if (!target || target.account_type !== 'chaveiro') return Response.json({ error: 'Esta solicitação não pertence a uma conta de chaveiro.' }, { status: 409 });
    if (row.ownership_verified === true) return Response.json({ approved: true, already_approved: true });
    const cpf = onlyDigits(row.cpf);
    if (!isValidCpf(cpf)) return Response.json({ error: 'O CPF solicitado é inválido.' }, { status: 409 });
    if (target.is_verified !== true || !/^\d{10,11}$/.test(onlyDigits(target.phone)) || String(target.legal_name || target.full_name || '').trim().split(/\s+/).length < 2) return Response.json({ error: 'O chaveiro precisa confirmar o email e preencher nome completo e telefone antes da aprovação.' }, { status: 409 });
    const exception = cpf === SHARED_OWNER_EXCEPTION.cpf && String(target.email || '').toLowerCase() === SHARED_OWNER_EXCEPTION.locksmithEmail;
    if (onlyDigits(target.cpf) && onlyDigits(target.cpf) !== cpf && !exception) return Response.json({ error: 'O CPF solicitado difere do CPF atual do cadastro. Confira a titularidade antes de prosseguir.' }, { status: 409 });
    if (!(await cpfCanBeAssigned(base44, target, cpf))) return Response.json({ error: 'CPF bloqueado ou vinculado a outra conta. A aprovação não foi realizada.' }, { status: 409 });
    // Setting the profile CPF alone never approves it: the trusted record is written last.
    await base44.entities.User.update(target.id, { cpf });
    await base44.entities.VerifiedCpf.update(row.id, { ownership_verified: true, reviewed_by: admin.id, reviewed_at: new Date().toISOString(), review_note: note });
    return Response.json({ approved: true });
  } catch (error) {
    console.error('Falha na aprovação de cadastro:', error.message);
    return Response.json({ error: 'Não foi possível processar a aprovação. Atualize a lista e tente novamente.' }, { status: 500 });
  }
}