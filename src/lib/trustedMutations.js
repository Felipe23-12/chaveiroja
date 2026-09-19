import { base44 } from '@/api/base44Client';

export async function updateServiceRequest(requestId, data) {
  const response = await base44.functions.invoke('updateServiceRequest', { request_id: requestId, data });
  return response.data.request;
}

export async function sendChatMessage({ locksmith_id, client_id, message, photo_url }) {
  const response = await base44.functions.invoke('chatOperations', { action: 'send', locksmith_id, client_id, message, photo_url });
  return response.data.message;
}

export async function servicePaymentConfirmed(requestId) {
  const response = await base44.functions.invoke('serviceTrust', { action: 'payment_status', request_id: requestId });
  return response.data.paid === true;
}