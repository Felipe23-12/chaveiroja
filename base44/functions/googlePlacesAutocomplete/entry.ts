import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { placeLookup } from '../../shared/placeLookup.ts';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    return await placeLookup(await req.json());
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}