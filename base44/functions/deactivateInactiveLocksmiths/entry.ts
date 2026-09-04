import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { verifyInternalCall } from '../../shared/internalCall.ts';

const INACTIVITY_DAYS = 30;

// Desativa automaticamente os perfis de chaveiro sem nenhum chamado aceito
// há mais de 30 dias, exigindo revalidação dos documentos para voltar a atender.
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));

    if (!verifyInternalCall(body)) {
      const user = await base44.auth.me().catch(() => null);
      if (!user || user.role !== 'admin') {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const limit = Date.now() - INACTIVITY_DAYS * 24 * 60 * 60 * 1000;
    const locksmiths = await base44.asServiceRole.entities.Locksmith.list('-created_date', 500);
    const deactivated = [];

    for (const l of locksmiths) {
      if (l.inactive_deactivated) continue;

      let lastActivity = l.last_accepted_at || l.revalidated_at || null;
      if (!lastActivity) {
        const last = await base44.asServiceRole.entities.ServiceRequest.filter(
          { locksmith_id: l.id },
          '-created_date',
          1
        );
        lastActivity = last[0]?.accepted_at || last[0]?.created_date || l.created_date;
      }

      if (new Date(lastActivity).getTime() > limit) continue;

      await base44.asServiceRole.entities.Locksmith.update(l.id, {
        inactive_deactivated: true,
        deactivated_at: new Date().toISOString(),
        available: false,
        online: false,
      });
      deactivated.push({ id: l.id, name: l.name, last_activity: lastActivity });
    }

    return Response.json({ checked: locksmiths.length, deactivated });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}