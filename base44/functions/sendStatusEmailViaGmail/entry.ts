import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { createMimeMessage } from 'npm:mimetext@3.0.24';

const CONNECTOR_ID = "6a9a70c3031fa6c6d0a7570c";

function buildContent(status, request) {
  if (status === "on_the_way") {
    return {
      subject: `Seu chaveiro está a caminho — ${request.service_type}`,
      body:
        `Olá!\n\nO chaveiro ${request.locksmith_name || ""} está a caminho do endereço: ${request.address}.\n\n` +
        `Serviço: ${request.service_type}\nValor: R$ ${(request.price || 0).toFixed(2)}\n\n` +
        `Acompanhe a rota em tempo real pelo aplicativo Chaveiro Já.`,
    };
  }
  return {
    subject: `Solicitação cancelada — ${request.service_type}`,
    body:
      `Olá!\n\nSua solicitação de ${request.service_type} no endereço ${request.address} foi cancelada.\n\n` +
      (request.cancelled_by === "chaveiro"
        ? "O cancelamento foi feito pelo chaveiro. Você já pode solicitar um novo atendimento pelo aplicativo.\n"
        : "Você já pode solicitar um novo atendimento pelo aplicativo.\n") +
      `\nChaveiro Já`,
  };
}

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { service_request_id, status } = await req.json();
    if (!service_request_id || !["on_the_way", "cancelled"].includes(status)) {
      return Response.json({ error: 'service_request_id e status (on_the_way|cancelled) são obrigatórios' }, { status: 400 });
    }

    const request = await base44.entities.ServiceRequest.get(service_request_id);
    if (!request) return Response.json({ error: 'Solicitação não encontrada' }, { status: 404 });

    const clients = await base44.asServiceRole.entities.User.filter({ id: request.created_by_id });
    const to = clients?.[0]?.email;
    if (!to) return Response.json({ error: 'E-mail do cliente não encontrado' }, { status: 404 });

    const { accessToken } = await base44.asServiceRole.connectors.getCurrentAppUserConnection(CONNECTOR_ID);

    const { subject, body } = buildContent(status, request);
    const msg = createMimeMessage();
    msg.setSender({ addr: user.email, name: user.full_name || "Chaveiro Já" });
    msg.setRecipient(to);
    msg.setSubject(subject);
    msg.addMessage({ contentType: 'text/plain', data: body });

    const raw = btoa(unescape(encodeURIComponent(msg.asRaw())))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw }),
    });

    if (!res.ok) {
      const detail = await res.text();
      return Response.json({ error: 'Falha ao enviar e-mail pelo Gmail', detail }, { status: 502 });
    }

    return Response.json({ sent: true, to, status });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}