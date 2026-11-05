import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { createServiceRequest } from './createServiceRequest.ts';
import { placeLookup } from './placeLookup.ts';
import { reserveGuestContact } from './guestServiceIdentity.ts';
import { signGuestClaimProof } from './guestClaimProof.ts';
import { guestServiceSnapshot } from './guestServiceSnapshot.ts';
import { guestOpeningData, guestServiceAction } from './guestServiceOperations.ts';
import { calculateServerServicePrice } from './servicePricing.ts';
import { loadServicePricing } from './servicePricingSettings.ts';
import { matchingOpeningRule, openingAvailability } from './vehicleOpeningRules.ts';
import { validateOpeningVehicle, isMotoSeatOpening } from './automotiveOpening.ts';
async function readResponse(response) { const data = await response.json(); if (!response.ok || data.error) { const error = new Error(data.error || 'Não foi possível continuar.'); error.code = data.code; throw error; } return data; }

export async function handleGuestCommand(client, state, msg) {
    const entity = client.asServiceRole.entities.GuestServiceSession;
    const row = state.sessionId ? await entity.get(state.sessionId) : (await entity.filter({ guest_client_id: state.clientId }, 'created_date', 1))[0];
    if (row) {
      state.sessionId = row.id;
      if (row.request_id) state.requestId = row.request_id;
      if (!state.requestId) {
        const requests = await client.asServiceRole.entities.ServiceRequest.filter({ client_id: state.clientId }, '-created_date', 1);
        if (requests[0]) { state.requestId = requests[0].id; await entity.update(row.id, { request_id: state.requestId }); }
      }
    }
    if (row?.blocked) throw new Error('Atendimento bloqueado. Entre na sua conta para obter ajuda.');
    let data;
    if (msg.action === 'claim_proof') {
      if (!state.requestId || !row || row.guest_client_id !== state.clientId || row.request_id !== state.requestId) throw new Error('Inicie um atendimento neste navegador antes de vincular.');
      data = await signGuestClaimProof(state);
    } else if (row?.claimed_user_id) {
      // The bearer already knows this request, but receives no account or service data.
      data = { claimed: true, request_id: state.requestId };
    } else if (msg.action === 'snapshot') data = await guestServiceSnapshot(client, state);
    else if (msg.action === 'places') data = await readResponse(await placeLookup(msg.body || {}));
    else if (msg.action === 'opening_options') {
      const vehicle = msg.vehicle || {};
      if (!validateOpeningVehicle(vehicle).valid || isMotoSeatOpening(vehicle)) throw new Error('Selecione um carro válido.');
      const config = await loadServicePricing(client, 'Abertura Automotiva'); const rule = matchingOpeningRule(vehicle, config.vehicle_opening_rules);
      data = { availability: openingAvailability(rule), lishi_percent: rule?.lishi_percent ?? config.values.lishi_percent };
    } else if (['quote','create'].includes(msg.action)) {
      if (state.requestId) data = await guestServiceSnapshot(client, state);
      else {
        const input = guestOpeningData(msg.data);
        if (msg.action === 'quote') data = { pricing: await calculateServerServicePrice(client, state.clientId, input) };
        else {
          if (!Number.isFinite(input.expected_price) || input.expected_price <= 0) throw new Error('Consulte e confirme o valor do serviço.');
          const contact = await reserveGuestContact(client, state, msg.data);
          state.sessionId = contact.id;
          const result = await readResponse(await createServiceRequest(client, { id: state.clientId, full_name: contact.customer_name, role: 'user' }, { ...input, customer_name: contact.customer_name, description: `${input.description} — Contato do cliente: ${contact.phone}` }, true));
          state.requestId = result.request.id;
          await client.asServiceRole.entities.GuestServiceSession.update(contact.id, { request_id: result.request.id });
          data = await guestServiceSnapshot(client, state);
        }
      }
    } else {
      if (!state.requestId) throw new Error('Inicie um atendimento primeiro.');
      data = await guestServiceAction(client, state, msg);
    }

    return { state, data };
}
