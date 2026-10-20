import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { CAMPAIGN, USER_FIELDS, eligibleUser, pageContext, webSubscriptionAvailable } from './audience.ts';
import { deliverNotice } from './deliver.ts';

export default async function(req) {
  let base44;
  let lockId;
  const runToken = crypto.randomUUID();
  try {
    base44 = createClientFromRequest(req);
    const admin = await base44.auth.me();
    if (!admin || admin.role !== 'admin') return Response.json({ error: 'Acesso exclusivo de administrador.' }, { status: 403 });
    const body = await req.json();
    if (body.dryRun !== undefined && typeof body.dryRun !== 'boolean') return Response.json({ error: 'dryRun deve ser booleano.' }, { status: 400 });
    const dryRun = body.dryRun !== false;
    const started = Date.now();
    const counts = { total_users: 0, eligible_users: 0, excluded_users: 0, native_push: null, native_push_candidates: 0, web_push: 0, web_push_unknown: 0, email: 0, already_attempted: 0 };
    const run = { sent: 0, failed: 0, skipped: 0 };
    let complete = true;
    if (!dryRun) {
      const campaigns = await base44.asServiceRole.entities.UpdateNoticeCampaign.filter({ campaign_key: CAMPAIGN }, { limit: 2 });
      if (campaigns.items.length !== 1) throw new Error('Campanha não inicializada ou duplicada; nenhum envio iniciado.');
      const campaign = campaigns.items[0];
      const claimed = await base44.asServiceRole.entities.UpdateNoticeCampaign.updateMany({ id: campaign.id, locked_until: { $lt: new Date().toISOString() } }, {
        $set: { run_token: runToken, locked_until: new Date(Date.now() + 7 * 60000).toISOString() },
      });
      if (claimed.updated !== 1) return Response.json({ error: 'Envio já está em andamento. Aguarde antes de tentar novamente.' }, { status: 409 });
      lockId = campaign.id;
    }
    // User does not support count/aggregate/cursors: read bounded positional pages.
    let offset = 0;
    pageLoop: while (true) {
      const users = await base44.asServiceRole.entities.User.list('id', 50, offset, USER_FIELDS);
      if (!users.length) break;
      const context = await pageContext(base44, users);
      for (const user of users) {
        if (Date.now() - started > 210000) {
          if (dryRun) throw new Error('Simulação excedeu o tempo disponível; contagens parciais não serão apresentadas como totais.');
          complete = false;
          break pageLoop;
        }
        counts.total_users++;
        if (!eligibleUser(user)) { counts.excluded_users++; continue; }
        counts.eligible_users++;
        const channels = [];
        // No read-only native device registry is exposed by Core. Do not invent
        // a subscriber count: null means unknown; candidates counts send attempts.
        if (context.attempted.has(`${user.id}:native_push`)) counts.already_attempted++;
        else { counts.native_push_candidates++; channels.push('native_push'); }
        if (context.attempted.has(`${user.id}:email`)) counts.already_attempted++;
        else if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email || '')) { counts.email++; channels.push('email'); }
        if (context.attempted.has(`${user.id}:web_push`)) counts.already_attempted++;
        else {
          try {
            if (await webSubscriptionAvailable(context.identities.get(user.id))) { counts.web_push++; channels.push('web_push'); }
          } catch {
            counts.web_push_unknown++;
            // With a registered identity, let the real send record the provider's
            // success/failure rather than silently abandoning this channel.
            if (!dryRun && context.identities.has(user.id)) channels.push('web_push');
          }
        }
        if (!dryRun) {
          const outcomes = await Promise.all(channels.map(channel => deliverNotice(base44, user, channel)));
          outcomes.forEach(status => { run[status]++; });
        }
      }
      offset += users.length;
      if (users.length < 50) break;
    }
    if (dryRun) return Response.json(counts);
    const summary = await base44.asServiceRole.entities.UpdateNoticeDelivery.aggregate({ query: { campaign_key: CAMPAIGN }, groupBy: 'status' });
    const result = { campaign: CAMPAIGN, complete, counts, this_run: run, cumulative: summary.rows, resume_by_calling_again: !complete };
    await base44.asServiceRole.entities.UpdateNoticeCampaign.update(lockId, { last_result: result });
    return Response.json(result);
  } catch (error) {
    console.error('broadcastUpdateNotice:', error?.message);
    return Response.json({ error: 'Não foi possível concluir. Tentativas já registradas não serão repetidas.', detail: error?.message }, { status: 500 });
  } finally {
    if (lockId && base44) await base44.asServiceRole.entities.UpdateNoticeCampaign.updateMany({ id: lockId, run_token: runToken }, { $set: { locked_until: new Date(0).toISOString(), run_token: '' } });
  }
}