import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Entre na sua conta para excluí-la.' }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    if (body.action !== 'confirm_delete') return Response.json({ error: 'Confirmação necessária.' }, { status: 400 });

    // O vínculo só é liberado após a exclusão da conta ter sido confirmada pelo banco.
    await base44.asServiceRole.entities.User.delete(user.id);
    await base44.asServiceRole.entities.VerifiedCpf.deleteMany({ user_id: user.id });
    return Response.json({ deleted: true });
  } catch (error) {
    const status = (error as any)?.status ?? (error as any)?.response?.status;
    if (status === 401) return Response.json({ error: 'Sua sessão expirou. Entre novamente para excluir a conta.' }, { status: 401 });
    return Response.json({ error: 'Não foi possível excluir a conta. Tente novamente.' }, { status: 500 });
  }
}