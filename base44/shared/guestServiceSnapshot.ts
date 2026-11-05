const fields = ['id','created_date','updated_date','service_type','status','address','description','customer_name','price','discount_amount','discount_applied','locomotion_cost','extra_cost','customer_lat','customer_lng','locksmith_lat','locksmith_lng','locksmith_name','locksmith_id','accepted_at','accepted_distance_km','arrival_extra_minutes','urgency','end_photos','start_photos','client_arrived_confirmed','locksmith_arrived','client_confirmed','cancelled_by','cancellation_reason','cancellation_fee','search_radius_km','payment_status'];
const pick = (row, keys) => Object.fromEntries(keys.filter(key => row[key] !== undefined).map(key => [key, row[key]]));
export async function guestServiceSnapshot(client, state) {
  if (!state.requestId) return { request: null, messages: [], case: null };
  const entities = client.asServiceRole.entities;
  const request = await entities.ServiceRequest.get(state.requestId);
  if (request.client_id !== state.clientId) throw new Error('Este atendimento já foi vinculado. Entre na sua conta para continuar.');
  const [messages, cases] = await Promise.all([
    request.locksmith_id ? entities.ChatMessage.filter({ client_id: state.clientId, locksmith_id: request.locksmith_id }, '-created_date', 30) : [],
    entities.ServiceCancellationCase.filter({ request_id: request.id, client_id: state.clientId }, '-created_date', 1),
  ]);
  return { request: pick(request, fields), messages: messages.reverse().map(row => pick(row, ['id','created_date','sender_type','sender_name','message','photo_url'])), case: cases[0] ? pick(cases[0], ['id','reason','status','deadline','client_response']) : null };
}