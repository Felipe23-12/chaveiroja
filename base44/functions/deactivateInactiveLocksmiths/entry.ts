import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { verifyInternalCall } from '../../shared/internalCall.ts';

const INACTIVITY_DAYS = 30;

// Desativa somente quem está offline e há 30 dias sem acessar o aplicativo.
// Acessar o app ou estar online reinicia a contagem, independentemente de aceites.
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));

    if (!verifyInternalCall(req, body)) {
      const user = await base44.auth.me().catch(() => null);
      if (!user || user.role !== 'admin') {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const now = new Date().toISOString();
    const limit = new Date(Date.now() - INACTIVITY_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const inactiveQuery = {
      online: { $ne: true },
      inactive_deactivated: { $ne: true },
      $or: [
        { last_activity_at: { $lte: limit } },
        { last_activity_at: { $exists: false }, created_date: { $lte: limit } },
        { last_activity_at: null, created_date: { $lte: limit } },
      ],
    };
    if (body.dry_run === true) return Response.json({ dry_run: true, candidates: await base44.asServiceRole.entities.Locksmith.count(inactiveQuery) });

    // Cada lote deixa de satisfazer a consulta, evitando repetir as mesmas linhas.
    const onlineQuery = {
      online: true, inactive_deactivated: { $ne: true },
      $or: [{ last_activity_at: { $lt: now } }, { last_activity_at: { $exists: false } }, { last_activity_at: null }],
    };
    let refreshed = 0;
    let result;
    do {
      result = await base44.asServiceRole.entities.Locksmith.updateMany(onlineQuery, { $set: { last_activity_at: now } });
      refreshed += result.updated || 0;
    } while (result.has_more);

    // A condição é reavaliada na gravação: um acesso simultâneo impede o bloqueio.
    let deactivated = 0;
    do {
      result = await base44.asServiceRole.entities.Locksmith.updateMany(inactiveQuery, {
        $set: { inactive_deactivated: true, deactivated_at: now, available: false, online: false },
      });
      deactivated += result.updated || 0;
    } while (result.has_more);
    return Response.json({ refreshed, deactivated });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}