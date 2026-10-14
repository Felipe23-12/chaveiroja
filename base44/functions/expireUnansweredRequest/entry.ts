import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { verifyInternalCall } from '../../shared/internalCall.ts';
import { expireUnansweredRequest } from '../../shared/unansweredRequest.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    if (!verifyInternalCall(req, body)) {
      const user = await base44.auth.me();
      if (user?.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (typeof body.request_id !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(body.request_id)) {
      return Response.json({ error: 'Informe um chamado válido.' }, { status: 400 });
    }
    const result = await expireUnansweredRequest(base44, body.request_id, body.dry_run === true);
    return Response.json(result);
  } catch (error) {
    console.error('expireUnansweredRequest:', error.message);
    return Response.json({ error: 'Não foi possível encerrar o chamado.' }, { status: 500 });
  }
}