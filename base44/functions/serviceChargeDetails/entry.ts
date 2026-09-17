import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Não autenticado' }, { status: 401 });
    // Consulta financeira restrita ao papel administrativo da plataforma.
    if (user.role !== 'admin') return Response.json({ error: 'Acesso não autorizado' }, { status: 403 });
    const body = await req.json();
    const page = Number(body.page ?? 0);
    if (!Number.isSafeInteger(page) || page < 0) return Response.json({ error: 'Página inválida' }, { status: 400 });
    const serviceTypes = ['Abertura Residencial', 'Abertura Automotiva', 'Abertura Fechadura Tetra', 'Abertura Fechadura Eletrônica', 'Confecção de Chave de Carro', 'Confecção de Chave de Moto'];
    if (body.service_type && !serviceTypes.includes(body.service_type)) return Response.json({ error: 'Serviço inválido' }, { status: 400 });
    const query = { service_type: body.service_type || { $in: serviceTypes } };
    const fields = ['id', 'created_date', 'service_type', 'status', 'price', 'key_value', 'fipe_value', 'labor_cost', 'locomotion_cost', 'distance_km', 'extra_cost', 'discount_amount', 'cancellation_fee', 'cancellation_app_fee', 'cancellation_locksmith_amount', 'pricing_calculation'];
    const records = await base44.asServiceRole.entities.ServiceRequest.filter(query, '-created_date', 21, page * 20, fields);
    const items = records.slice(0, 20).map((record) => Object.fromEntries(fields.filter((field) => record[field] !== undefined).map((field) => [field, record[field]])));
    return Response.json({ items, has_more: records.length > 20 });
  } catch (error) {
    return Response.json({ error: error.message || 'Falha ao consultar os cálculos' }, { status: 500 });
  }
}