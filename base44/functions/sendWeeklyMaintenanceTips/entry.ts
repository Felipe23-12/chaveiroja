import { createClientFromRequest } from 'npm:@base44/sdk@0.8.46';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const admin = await base44.auth.me();
    if (!admin || admin.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
    const body = await req.json();
    let offset = body.offset ?? 0;
    if (!Number.isSafeInteger(offset) || offset < 0) return Response.json({ error: 'Offset inválido' }, { status: 400 });
    const tips = [
      'A chave está dura para girar? Não force: confira se a porta está alinhada e procure um chaveiro para uma revisão preventiva.',
      'Evite quebrar a chave na fechadura: se ela estiver torta, trincada ou desgastada, peça a avaliação de um chaveiro antes de continuar usando.',
      'Fechadura eletrônica: acompanhe o aviso de bateria e siga o manual para a troca. Uma revisão preventiva ajuda a evitar ficar do lado de fora.',
      'Porta raspando ou precisando ser levantada para trancar? Pode haver desalinhamento. Um ajuste profissional pode evitar danos à fechadura.',
      'Na limpeza da fechadura, use pano macio e evite produtos corrosivos. Lubrificantes devem seguir a orientação do fabricante; na dúvida, consulte um chaveiro.',
      'Confira sua chave reserva antes de uma emergência e guarde-a em local seguro, sem identificação do endereço. Precisa de uma cópia? Consulte um chaveiro.',
      'Maçaneta frouxa ou fechadura com folga merece atenção. Solicite uma revisão antes que um pequeno problema impeça a abertura da porta.',
      'Não use a chave como puxador da porta nem ferramenta. Esses esforços podem deformá-la e danificar o cilindro da fechadura.'
    ];
    const weekNumber = Math.floor((Date.now() - Date.UTC(2026, 8, 7, 3)) / 604800000);
    const week = String(weekNumber);
    const tipIndex = ((weekNumber % tips.length) + tips.length) % tips.length;
    let sent = 0, failed = 0, skipped = 0;
    while (true) {
    const users = await base44.asServiceRole.entities.User.list('id', 25, offset);
    if (body.dry_run === true) return Response.json({ dry_run: true, batch_users: users.length, tip: tips[tipIndex], has_more: users.length === 25 });
    const deliveries = users.length ? await base44.asServiceRole.entities.MaintenanceTipDelivery.filter({ week, user_id: { $in: users.map(u => u.id) } }, '-created_date', 100) : [];
    for (const user of users) {
      if (deliveries.some(d => d.user_id === user.id && d.status === 'sent')) { skipped++; continue; }
      const professional = user.account_type === 'chaveiro';
      const actionUrl = user.role === 'admin' ? '/painel-admin' : professional ? '/painel-chaveiro' : '/mapa';
      const invitation = professional ? ' Ofereça cuidados preventivos aos seus clientes pelo aplicativo.' : ' Encontre um profissional no mapa do aplicativo.';
      let status = 'sent', error = '';
      try {
        await base44.asServiceRole.integrations.Core.SendPushNotification({
          user_id: user.id, title: 'Dica da semana: cuide das suas fechaduras',
          content: tips[tipIndex] + invitation, action_label: 'Abrir aplicativo', action_url: actionUrl
        });
        sent++;
      } catch (err) {
        status = 'failed'; error = String(err.message || 'Falha no envio').slice(0, 400); failed++;
      }
      await base44.asServiceRole.entities.MaintenanceTipDelivery.create({ user_id: user.id, week, tip_index: tipIndex, status, error });
    }
    offset += users.length;
    if (users.length < 25) break;
    }
    return Response.json({ sent, failed, skipped });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}