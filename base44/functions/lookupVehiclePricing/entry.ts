import { createClientFromRequest } from 'npm:@base44/sdk@0.8.46';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const model = String(body.model || '').trim().slice(0, 100);
    const year = String(body.year || '').trim();
    const mode = body.mode === 'key_only' ? 'key_only' : 'full';
    if (!model || !/^\d{4}$/.test(year)) {
      return Response.json({ error: 'Modelo e ano válido são obrigatórios' }, { status: 400 });
    }

    const prompt = mode === 'key_only'
      ? `Pesquise o valor médio de mercado em reais (BRL) de uma chave original ou reserva (cópia codificada) para o veículo ${model} ano ${year}, considerando concessionárias e lojas no Brasil. Retorne o valor numérico em reais no campo key_value.`
      : `Pesquise na Tabela FIPE brasileira o valor médio atual em reais (BRL) do veículo ${model} ano ${year} (campo fipe_value), o valor médio de mercado de uma chave original desse veículo em concessionárias no Brasil (campo key_value) e identifique se esse modelo e ano utiliza transponder, chip ou imobilizador eletrônico na chave (campo has_coded_key, booleano). Considere chave codificada quando houver qualquer chip/transponder necessário para ligar o veículo. Retorne os valores em reais sem símbolos.`;
    const schema = mode === 'key_only'
      ? { type: 'object', properties: { key_value: { type: 'number' }, currency: { type: 'string' }, notes: { type: 'string' } }, required: ['key_value'] }
      : { type: 'object', properties: { fipe_value: { type: 'number' }, key_value: { type: 'number' }, has_coded_key: { type: 'boolean' }, notes: { type: 'string' } }, required: ['fipe_value', 'has_coded_key'] };

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: true,
      model: 'gemini_3_flash',
      response_json_schema: schema,
    });
    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}