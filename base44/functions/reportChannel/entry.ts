import { createClientFromRequest } from 'npm:@base44/sdk@0.8.48';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();

    if (body.action === 'createReport') {
      const data = body.data || {};
      if (!data.reported_id || data.reported_id === user.id || !data.category || !String(data.description || '').trim()) {
        return Response.json({ error: 'Dados da denúncia inválidos' }, { status: 400 });
      }
      const deadline = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
      const report = await base44.asServiceRole.entities.ConductReport.create({
        ...data,
        reporter_id: user.id,
        reporter_name: user.full_name || user.email,
        reporter_type: user.account_type || 'cliente',
        description: String(data.description).trim(),
        status: 'awaiting_defense',
        defense_deadline: deadline,
      });
      await base44.asServiceRole.entities.ReportMessage.create({
        report_id: report.id,
        sender_id: user.id,
        sender_name: 'Administração Chaveiro Já',
        sender_role: 'system',
        reporter_id: user.id,
        reported_id: data.reported_id,
        message: `Denúncia registrada. A parte denunciada pode apresentar sua defesa até ${new Date(deadline).toLocaleString('pt-BR')}.`,
      });
      return Response.json({ report });
    }

    if (body.action === 'sendMessage') {
      const report = await base44.asServiceRole.entities.ConductReport.get(body.reportId);
      const isAdmin = user.role === 'admin';
      const isParticipant = report.reporter_id === user.id || report.reported_id === user.id;
      if (!isAdmin && !isParticipant) return Response.json({ error: 'Forbidden' }, { status: 403 });
      const message = String(body.message || '').trim();
      if (!message) return Response.json({ error: 'Mensagem obrigatória' }, { status: 400 });
      const created = await base44.asServiceRole.entities.ReportMessage.create({
        report_id: report.id,
        sender_id: user.id,
        sender_name: isAdmin ? 'Administração Chaveiro Já' : (user.full_name || user.email),
        sender_role: isAdmin ? 'admin' : (user.account_type || 'cliente'),
        reporter_id: report.reporter_id,
        reported_id: report.reported_id,
        message,
      });
      if (report.reported_id === user.id && !report.defense_submitted_at) {
        await base44.asServiceRole.entities.ConductReport.update(report.id, { defense_submitted_at: new Date().toISOString(), status: 'reviewing' });
      }
      return Response.json({ message: created });
    }

    return Response.json({ error: 'Ação inválida' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}