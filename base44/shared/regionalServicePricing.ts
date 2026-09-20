// Mesmas capitais e regra de proximidade usadas na referência regional do aplicativo.
export const regionalCapitals = [
  ['aracaju', 'Aracaju', 'SE', -10.9472, -37.0731], ['belem', 'Belém', 'PA', -1.4558, -48.5039],
  ['belo_horizonte', 'Belo Horizonte', 'MG', -19.9167, -43.9345], ['boa_vista', 'Boa Vista', 'RR', 2.8235, -60.6758],
  ['brasilia', 'Brasília', 'DF', -15.7939, -47.8828], ['campo_grande', 'Campo Grande', 'MS', -20.4697, -54.6201],
  ['cuiaba', 'Cuiabá', 'MT', -15.6014, -56.0979], ['curitiba', 'Curitiba', 'PR', -25.4284, -49.2733],
  ['florianopolis', 'Florianópolis', 'SC', -27.5954, -48.548], ['fortaleza', 'Fortaleza', 'CE', -3.7319, -38.5267],
  ['goiania', 'Goiânia', 'GO', -16.6869, -49.2648], ['joao_pessoa', 'João Pessoa', 'PB', -7.1195, -34.845],
  ['macapa', 'Macapá', 'AP', 0.0349, -51.0694], ['maceio', 'Maceió', 'AL', -9.6498, -35.7089],
  ['manaus', 'Manaus', 'AM', -3.119, -60.0217], ['natal', 'Natal', 'RN', -5.7945, -35.211],
  ['palmas', 'Palmas', 'TO', -10.1849, -48.3336], ['porto_alegre', 'Porto Alegre', 'RS', -30.0346, -51.2177],
  ['porto_velho', 'Porto Velho', 'RO', -8.7612, -63.9004], ['recife', 'Recife', 'PE', -8.0476, -34.877],
  ['rio_branco', 'Rio Branco', 'AC', -9.9754, -67.8249], ['rio_de_janeiro', 'Rio de Janeiro', 'RJ', -22.9068, -43.1729],
  ['salvador', 'Salvador', 'BA', -12.9777, -38.5016], ['sao_luis', 'São Luís', 'MA', -2.5307, -44.3068],
  ['sao_paulo', 'São Paulo', 'SP', -23.5505, -46.6333], ['teresina', 'Teresina', 'PI', -5.0892, -42.8016],
  ['vitoria', 'Vitória', 'ES', -20.3155, -40.3128],
].map(([slug, name, uf, lat, lng]) => ({ slug, name, uf, lat, lng }));
export const regionalServices = {
  'Abertura Residencial': 'residencial_comum', 'Abertura Automotiva': 'abertura_automotiva',
  'Abertura Fechadura Tetra': 'trava_tetra', 'Abertura Fechadura Eletrônica': 'fechadura_eletronica',
};
const money = value => Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export function regionalRange(reference, distance) {
  const floor = ['residencial_comum', 'abertura_automotiva'].includes(reference.servico_codigo) ? 50 : 0;
  const min = Math.max(Number(reference.preco_minimo_brl), floor), avg = Number(reference.preco_medio_brl), max = Number(reference.preco_maximo_brl);
  if (![min, avg, max].every(Number.isFinite) || avg <= 0 || max < avg) return null;
  const proximity = Math.max(0, Math.min(1, (200 - distance) / 180));
  const low = Math.max(Math.round(min + (avg - min) * proximity * 0.5), floor);
  return [low, Math.max(Math.round(avg + (max - avg) * proximity), low + 1)];
}
export async function regionalReference(base44, capitalSlug, service) {
  const records = await base44.entities.PrecoReferencia.filter({ capital_slug: capitalSlug, servico_codigo: regionalServices[service] }, '-updated_date', 1);
  return records[0] || null;
}
export async function regionalPriceForLocation(base44, service, latValue, lngValue) {
  if (!regionalServices[service]) return null;
  const lat = latValue == null || latValue === '' ? NaN : Number(latValue), lng = lngValue == null || lngValue === '' ? NaN : Number(lngValue);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return { note: 'Localização indisponível: aplicada a faixa geral do serviço.' };
  const rad = n => n * Math.PI / 180;
  const candidates = regionalCapitals.map(capital => {
    const h = Math.sin(rad(capital.lat - lat) / 2) ** 2 + Math.cos(rad(lat)) * Math.cos(rad(capital.lat)) * Math.sin(rad(capital.lng - lng) / 2) ** 2;
    return { capital, distance: Math.round(6371 * 2 * Math.asin(Math.sqrt(Math.min(1, h))) * 10) / 10 };
  }).sort((a, b) => a.distance - b.distance);
  const { capital, distance } = candidates[0];
  const reference = await regionalReference(base44, capital.slug, service);
  const range = reference?.ativo === true ? regionalRange(reference, distance) : null;
  if (!range) return { note: `Referência de ${capital.name} (${capital.uf}) ausente, inativa ou inválida: aplicada a faixa geral do serviço.` };
  return { range, note: `Referência regional: ${capital.name} (${capital.uf}), capital mais próxima, a ${distance.toFixed(1)} km. Mínimo ${money(reference.preco_minimo_brl)}, média ${money(reference.preco_medio_brl)}, máximo ${money(reference.preco_maximo_brl)}. Faixa base aplicada pela proximidade: ${money(range[0])} a ${money(range[1])}. Versão: ${reference.updated_date || reference.created_date}.` };
}
export async function manageRegionalPricing(base44, body) {
  const capital = regionalCapitals.find(item => item.slug === body.capital_slug);
  if (!capital || !regionalServices[body.service_type]) return Response.json({ error: 'Capital ou serviço regional inválido' }, { status: 400 });
  const reference = await regionalReference(base44, capital.slug, body.service_type);
  if (body.action === 'regional_get') return Response.json({ reference });
  const keys = ['preco_minimo_brl', 'preco_medio_brl', 'preco_maximo_brl'];
  const values = body.values;
  if (!values || keys.some(k => typeof values[k] !== 'number' || !Number.isFinite(values[k]) || values[k] < 0.01 || values[k] > 100000) || typeof values.ativo !== 'boolean') return Response.json({ error: 'Informe valores maiores que zero e até R$ 100.000,00.' }, { status: 400 });
  if (values.preco_minimo_brl > values.preco_medio_brl || values.preco_medio_brl > values.preco_maximo_brl) return Response.json({ error: 'O início da faixa deve ser menor ou igual à média, e a média menor ou igual ao final.' }, { status: 400 });
  if ((body.version || null) !== (reference?.updated_date || reference?.created_date || null)) return Response.json({ error: 'Esta faixa foi alterada. Recarregue antes de salvar.' }, { status: 409 });
  const data = { ...Object.fromEntries(keys.map(k => [k, Math.round(values[k] * 100) / 100])), ativo: values.ativo, origem_codigo: 'ajuste_administrativo', origem_texto: 'Valores definidos manualmente pela administração', data_referencia: new Date().toISOString().slice(0, 10) };
  const saved = reference ? await base44.entities.PrecoReferencia.update(reference.id, data) : await base44.entities.PrecoReferencia.create({ ...data, capital: capital.name, uf: capital.uf, capital_slug: capital.slug, servico_codigo: regionalServices[body.service_type], servico_nome: body.service_type, exibir_no_app: true });
  return Response.json({ reference: saved });
}