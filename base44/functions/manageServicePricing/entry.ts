import { createClientFromRequest } from 'npm:@base44/sdk@0.8.46';
import { serviceTypes, pricingFields, loadServicePricing, validatePricing } from '../../shared/servicePricingSettings.ts';
import { manageRegionalPricing } from '../../shared/regionalServicePricing.ts';
import { validateVehicleFipeRates } from '../../shared/vehicleFipeRates.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Não autenticado' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Somente administradores podem acessar a tabela de cobranças' }, { status: 403 });
    const body = await req.json();
    if (['regional_get', 'regional_save'].includes(body.action)) return await manageRegionalPricing(base44, body);
    const service = body.service_type || 'Confecção de Chave de Carro';
    if (!serviceTypes.includes(service)) return Response.json({ error: 'Serviço inválido' }, { status: 400 });
    const current = await loadServicePricing(base44, service);
    if (body.action === 'get') return Response.json({ services: serviceTypes, groups: pricingFields(service), ...current });
    if (body.action !== 'save') return Response.json({ error: 'Ação inválida' }, { status: 400 });
    if ((body.version || null) !== current.version) return Response.json({ error: 'A tabela foi alterada por outro administrador. Recarregue antes de salvar.' }, { status: 409 });
    let values, vehicleFipeRates;
    try {
      values = validatePricing(service, body.values);
      vehicleFipeRates = service === 'Confecção de Chave de Carro' ? validateVehicleFipeRates(body.vehicle_fipe_rates ?? current.vehicle_fipe_rates) : [];
    } catch (error) { return Response.json({ error: error.message }, { status: 400 }); }
    const record = await base44.entities.ServicePricingConfig.create({ service_type: service, values, vehicle_fipe_rates: vehicleFipeRates, edited_by: user.id });
    return Response.json({ services: serviceTypes, groups: pricingFields(service), values, vehicle_fipe_rates: vehicleFipeRates, version: record.id, saved_at: record.created_date });
  } catch (error) { return Response.json({ error: error.message || 'Não foi possível salvar a tabela' }, { status: 500 }); }
}