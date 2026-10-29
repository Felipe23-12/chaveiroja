export function missingLocksmithInformation(user) {
  const missing = [];
  if (user.is_verified !== true) missing.push('Confirmação do e-mail');
  if (String(user.legal_name || user.full_name || '').trim().split(/\s+/).length < 2) missing.push('Nome completo');
  // Aceita DDD + número nacional e o mesmo telefone com o código do Brasil (+55).
  if (!/^(?:55)?\d{10,11}$/.test(String(user.phone || '').replace(/\D/g, ''))) missing.push('Telefone com DDD');
  return missing;
}

export async function notifyMissingLocksmithInformation(base44, row, target) {
  if (row.ownership_verified === true || row.review_status === 'approved') return Response.json({ error: 'Este cadastro já foi aprovado.' }, { status: 409 });
  const missing = missingLocksmithInformation(target);
  if (!missing.length) return Response.json({ error: 'As informações já foram preenchidas. Tente aprovar o cadastro novamente.' }, { status: 409 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(target.email || '')) return Response.json({ error: 'O cadastro não possui um e-mail válido para envio.' }, { status: 409 });
  await base44.asServiceRole.integrations.Core.SendEmail({
    to: target.email,
    template_name: 'MissingLocksmithInformation',
    variables: { missing_information: missing.join('; ') },
  });
  return Response.json({ sent: true });
}