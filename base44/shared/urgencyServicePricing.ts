import { loadServicePricing } from './servicePricingSettings.ts';
const round = value => Math.round(value * 100) / 100;
export async function urgencyServicePrice(base44, request) {
  const config = await loadServicePricing(base44, request.service_type);
  const percent = Number(config.values.urgent || 0);
  const current = Number(request.price || 0);
  const lines = request.pricing_calculation?.lines || [];
  const fixed = request.service_type === 'Confecção de Chave de Carro'
    ? lines.filter(line => /complexidade|adicional ford|land rover.*alarme/i.test(line.label)).reduce((sum, line) => sum + Number(line.value || 0), 0)
    : 0;
  const price = round(Math.max(0, current - fixed) * (1 + percent / 100) + fixed);
  return { price, difference: round(price - current), percent, version: config.version };
}