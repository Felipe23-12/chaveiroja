import { createClientFromRequest } from 'npm:@base44/sdk@0.8.48';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();

    if (body.action === 'createReport') {
      const data = body.data || {};
      const categories = ['pornography', 'violence', 'harassment', 'discrimination', 'illegal_activity', 'human_dignity', 'other'];
      const description = String(data.description || '').trim();
      if (!data.reported_id || data.reported_id === user.id || !categories.includes(data.category) || !description || description.length > 3000) {
        return Response.json({ error: 'Dados da denúncia inválidos' }, { status: 400 });
      }
      const reportedUser = await base44.asServiceRole.entities.User.get(data.reported_id).catch(() => null);
      if (!reportedUser) return Response.json({ error: 'Usuário denunciado não encontrado' }, { status: 404 });
      const contextType = data.context_type === 'service' ? 'service' : 'chat';
      const photos = Array.isArray(data.photos)
        ? data.photos.filter((url) => typeof url === 'string' && url.length <= 2000).slice(0, 5)
        : [];
      const deadline = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
      const report = await base44.asServiceRole.entities.ConductReport.create({
        reporter_id: user.id,
        reporter_name: user.full_name || user.email,
        reported_id: reportedUser.id,
        reported_name: reportedUser.full_name || reportedUser.email,
        reporter_type: user.account_type === 'chaveiro' ? 'chaveiro' : 'cliente',
        reported_type: reportedUser.account_type === 'chaveiro' ? 'chaveiro' : 'cliente',
        context_type: contextType,
        request_id: typeof data.request_id === 'string' ? data.request_id : undefined,
        locksmith_id: typeof data.locksmith_id === 'string' ? data.locksmith_id : undefined,
        category: data.category,
        description,
        photos,
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

    if (body.action === 'adminListReports') {
      if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
      const reports = [], users = [], locksmiths = [];
      for (let offset = 0; offset < 2000; offset += 100) {
        const page = await base44.asServiceRole.entities.ConductReport.filter({}, '-created_date', 100, offset);
        reports.push(...page);
        if (page.length < 100) break;
      }
      const participantIds = new Set(reports.flatMap((report) => [report.reporter_id, report.reported_id]));
      for (let offset = 0; offset < 5000; offset += 100) {
        const page = await base44.asServiceRole.entities.User.filter({}, 'created_date', 100, offset);
        users.push(...page.filter((item) => participantIds.has(item.id)).map((item) => ({ id: item.id, full_name: item.full_name, username: item.username, email: item.email, phone: item.phone, account_type: item.account_type, avatar_url: item.avatar_url, moderation_blocked: item.moderation_blocked, moderation_block_reason: item.moderation_block_reason })));
        if (page.length < 100) break;
      }
      for (let offset = 0; offset < 5000; offset += 100) {
        const page = await base44.asServiceRole.entities.Locksmith.filter({}, 'created_date', 100, offset);
        locksmiths.push(...page.filter((item) => participantIds.has(item.created_by_id)).map((item) => ({ id: item.id, created_by_id: item.created_by_id, name: item.name, display_name: item.display_name, phone: item.phone, avatar_url: item.avatar_url, specialty: item.specialty, rating: item.rating, available: item.available, online: item.online })));
        if (page.length < 100) break;
      }
      return Response.json({ reports, users, locksmiths });
    }

    if (body.action === 'adminSetUserBlock') {
      if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
      const target = await base44.asServiceRole.entities.User.get(String(body.userId || '')).catch(() => null);
      if (!target || target.role === 'admin') return Response.json({ error: 'Perfil inválido' }, { status: 400 });
      const blocked = body.blocked === true;
      const updated = await base44.asServiceRole.entities.User.update(target.id, {
        moderation_blocked: blocked,
        moderation_block_reason: blocked ? String(body.reason || 'Bloqueio administrativo').slice(0, 300) : '',
        moderation_blocked_at: blocked ? new Date().toISOString() : target.moderation_blocked_at,
      });
      return Response.json({ user: updated });
    }

    if (body.action === 'sendMessage') {
      const report = await base44.asServiceRole.entities.ConductReport.get(body.reportId);
      const isAdmin = user.role === 'admin';
      const isParticipant = report.reporter_id === user.id || report.reported_id === user.id;
      if (!isAdmin && !isParticipant) return Response.json({ error: 'Forbidden' }, { status: 403 });
      const message = String(body.message || '').trim();
      const mediaUrl = String(body.media_url || '').trim();
      const mediaType = body.media_type === 'video' ? 'video' : 'image';
      if (!message && !mediaUrl) return Response.json({ error: 'Mensagem ou arquivo obrigatório' }, { status: 400 });
      const created = await base44.asServiceRole.entities.ReportMessage.create({
        report_id: report.id,
        sender_id: user.id,
        sender_name: isAdmin ? 'Administração Chaveiro Já' : (user.full_name || user.email),
        sender_role: isAdmin ? 'admin' : (user.account_type || 'cliente'),
        reporter_id: report.reporter_id,
        reported_id: report.reported_id,
        message,
        media_url: mediaUrl || undefined,
        media_type: mediaUrl ? mediaType : undefined,
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