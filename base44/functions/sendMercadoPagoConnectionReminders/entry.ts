// Desativado a pedido do usuário: aceitar chamados sem conta Mercado Pago conectada agora é
// bloqueado no próprio app (src/lib/ringBroadcast.js, acceptRing), então o lembrete automático
// semanal perdeu a função. O equivalente manual é o botão "Enviar notificação..." no Painel
// Financeiro Admin (function notifyMissingMercadoPagoAccounts). Esta function é mantida como
// no-op só porque o workflow agendado "Lembrete de Conexão Mercado Pago" continua chamando-a
// a cada 7 dias; remover o arquivo exigiria também apagar/pausar o workflow pelo dashboard.
export default async function() {
  return Response.json({ disabled: true, eligible: 0, push_sent: 0, email_sent: 0, skipped: 0, failed: 0 });
}
