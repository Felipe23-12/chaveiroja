import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Busca o email de um usuário a partir do telefone (para permitir login por telefone).
// O telefone é normalizado removendo não-dígitos para a comparação.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { phone } = body;
    if (!phone) {
      return Response.json({ error: 'phone é obrigatório' }, { status: 400 });
    }

    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10) {
      return Response.json({ email: null });
    }

    const users = await base44.asServiceRole.entities.User.list('-created_date', 500);
    const found = users.find((u) => {
      if (!u.phone) return false;
      return u.phone.replace(/\D/g, '') === digits;
    });

    if (!found) {
      return Response.json({ email: null });
    }
    return Response.json({ email: found.email });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}