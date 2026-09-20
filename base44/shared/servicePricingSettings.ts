export const serviceTypes = ['Abertura Residencial', 'Abertura Automotiva', 'Abertura Fechadura Tetra', 'Abertura Fechadura Eletrônica', 'Confecção de Chave de Carro', 'Confecção de Chave de Moto', 'Cópia de Chave'];
const ranges = [[80, 250], [120, 350], [100, 300], [350, 450], [0, 0], [200, 500], [4, 4]];
const field = (key, label, value, unit = '%', min = 0, max = 500) => ({ key, label, default: value, unit, min, max });
const cash = (key, label, value) => field(key, label, value, 'R$', 0, 100000);
const group = (title, fields) => ({ title, fields });
export function pricingFields(service) {
  const index = serviceTypes.indexOf(service);
  if (index < 0) throw new Error('Serviço inválido');
  const car = index === 4, opening = index < 4;
  if (index === 6) return [group('Preço fixo (sem fatores dinâmicos)', [cash('fixed', 'Valor da cópia', 4), field('loyalty', 'Desconto de fidelidade', 10, '%', 0, 100)])];
  const groups = [];
  if (!car) groups.push(group('Base do serviço', [cash('base_min', 'Início da faixa base', ranges[index][0]), cash('base_max', 'Fim da faixa base', ranges[index][1]), field('tier_day', 'Posição na faixa: horário comercial (08h–17h)', 20, '% da faixa', 0, 100), field('tier_night', 'Posição na faixa: fora do horário comercial', 60, '% da faixa', 0, 100), field('tier_weekend', 'Posição na faixa: fim de semana / feriado', 90, '% da faixa', 0, 100), field('tier_normal_cap', 'Posição máxima na faixa: normal', 60, '% da faixa', 0, 100), field('tier_urgent_floor', 'Posição mínima na faixa: urgente', 60, '% da faixa', 0, 100)]));
  groups.push(group('Piso e desconto', [cash('minimum', 'Piso do serviço antes dos adicionais protegidos', car ? 380 : index < 2 ? 50 : 0), field('loyalty', 'Desconto de fidelidade', 10, '%', 0, 100)]));
  if (car) {
    groups.push(group('Mão de obra sobre a FIPE', [
      field('fipe_jetta_2015', 'Jetta 2015–2019', 1.3, '% da FIPE', 0, 10), field('fipe_jetta_2020', 'Jetta 2020–2022', 1.5, '% da FIPE', 0, 10), field('fipe_chevrolet_2020', 'Chevrolet / GM a partir de 2020', 1.3, '% da FIPE', 0, 10),
      field('fipe_2020', 'Demais veículos: 2020 em diante', 0.8, '% da FIPE', 0, 10), field('fipe_2010', 'Demais veículos: 2010–2019', 0.9, '% da FIPE', 0, 10), field('fipe_2000', 'Demais veículos: 2000–2009', 1.1, '% da FIPE', 0, 10), field('fipe_old_coded', 'Antes de 2000: chave codificada', 1.3, '% da FIPE', 0, 10), field('fipe_old_plain', 'Antes de 2000: sem codificação', 1.1, '% da FIPE', 0, 10),
    ]));
    groups.push(group('Adicionais da confecção', [cash('simple_fixed', 'Mão de obra adicional: chave simples', 120), cash('online_fee', 'Programação online (veículos elegíveis)', 250), cash('ford_fee', 'Ford a partir de 2020', 300), cash('renault_fee', 'Renault de alta complexidade', 450), cash('toyota_high', 'Toyota Corolla / RAV4 / SW4', 700), cash('toyota_medium', 'Demais Toyota', 300), cash('alarm_fee', 'Land Rover 2020+: trancada no alarme', 8000), field('parallel_discount', 'Redução da chave paralela sem preço manual', 35, '%', 0, 100)]));
  }
  groups.push(group('Oferta e demanda — pedidos / chaveiros online', [field('supply_none', 'Sem chaveiros online', 25, '%', -90), field('supply_very_high', 'Demanda muito alta (≥ 2)', 25, '%', -90), field('supply_high', 'Demanda alta (≥ 1,5 e < 2)', 15, '%', -90), field('supply_moderate', 'Demanda moderada (≥ 1 e < 1,5)', 5, '%', -90), field('supply_balanced', 'Equilibrado (≥ 0,5 e < 1)', -5, '%', -90), field('supply_low', 'Baixa demanda (≥ 0,25 e < 0,5)', -12, '%', -90), field('supply_abundant', 'Muita oferta (< 0,25)', -18, '%', -90), field('urgent', 'Urgência', 30), field('combined_min', 'Limite inferior: oferta/demanda × urgência', -30, '%', -90), field('combined_max', 'Limite superior: oferta/demanda × urgência', 60, '%', -90)]));
  groups.push(group('Calendário — horário de Brasília', [field('saturday', 'Sábado', 0), field('sunday', 'Domingo', 30), field('holiday', 'Feriado (substitui sábado/domingo)', 30), field('night', 'Fora do horário comercial (antes de 08h / após 17h)', 0)]));
  groups.push(group('Chuva no endereço do atendimento', [field('rain_drizzle', 'Garoa (> 0 e < 0,5 mm/h)', 15), field('rain_light', 'Chuva leve (≥ 0,5 e < 2,5 mm/h)', 25), field('rain_moderate', 'Chuva moderada (≥ 2,5 e < 7,6 mm/h)', 40), field('rain_heavy', 'Chuva forte (≥ 7,6 mm/h)', 55), field('rain_storm', 'Tempestade', 70)]));
  groups.push(group('Deslocamento', [field('distance_threshold', 'Cobrar quando a distância ultrapassar', 20, 'km', 0, 1000), field('distance_rate', 'Valor por km (distância total, como na regra atual)', 0.9, 'R$/km', 0, 100)]));
  if (opening) groups.push(group('Condição da abertura', [cash('condition_fee', 'Fechadura com problema / chave quebrada (cobrança única)', 25)]));
  if (index === 1) groups.push(group('Abertura automotiva', [field('opening_2020', 'Veículo de 2020 em diante', 25), cash('opening_medium', 'Média complexidade', 25), cash('opening_high', 'Alta complexidade', 50)]));
  if ([0, 2, 3].includes(index)) groups.push(group('Fechaduras e miolos (por unidade)', ['simples', 'tetra', 'eletronica', 'auxiliar', 'outro'].flatMap((type, i) => [cash(`lock_${type}`, `Abertura adicional: ${type}`, [70, 120, 250, 60, 0][i]), cash(`core_${type}`, `Miolo: ${type}`, [90, 180, 300, 80, 0][i])])));
  return groups;
}
export function defaultPricing(service) {
  return Object.fromEntries(pricingFields(service).flatMap(g => g.fields).map(f => [f.key, f.default]));
}
export function validatePricing(service, values) {
  const fields = pricingFields(service).flatMap(g => g.fields);
  if (!values || typeof values !== 'object' || Array.isArray(values) || Object.keys(values).some(k => !fields.some(f => f.key === k))) throw new Error('Configuração inválida');
  for (const f of fields) if (typeof values[f.key] !== 'number' || !Number.isFinite(values[f.key]) || values[f.key] < f.min || values[f.key] > f.max) throw new Error(`Valor inválido: ${f.label} (${f.min} a ${f.max} ${f.unit})`);
  if (values.base_min > values.base_max || values.combined_min > values.combined_max) throw new Error('O valor mínimo não pode superar o máximo');
  return Object.fromEntries(fields.map(f => [f.key, Math.round(values[f.key] * 100) / 100]));
}
export async function loadServicePricing(base44, service) {
  const defaults = defaultPricing(service);
  const rows = await base44.asServiceRole.entities.ServicePricingConfig.filter({ service_type: service }, '-created_date', 1);
  const record = rows[0];
  return { values: record ? validatePricing(service, { ...defaults, ...record.values }) : defaults, version: record?.id || null, saved_at: record?.created_date || null };
}