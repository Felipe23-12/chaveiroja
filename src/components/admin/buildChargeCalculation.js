import { getCarKeyFipeLaborRate, CAR_KEY_SIMPLE_FIXED } from "@/lib/pricing";
// Registra o cálculo realmente utilizado, sem mudar os preços do motor existente.
export default function buildChargeCalculation(price, service, vehicle = {}) {
  if (!price) return undefined;
  const lines = (price.breakdown || []).filter((line) => service.isCarKey || line.label !== "Complexidade / ano do veículo").map(({ label, value }) => ({ label, value: Number(value) || 0 }));
  if (!service.isCarKey && lines.length) {
    const combined = Number(price.factors?.combinedMultiplier || 1);
    const base = lines[0].value;
    lines.splice(1, 0, { label: `Ajuste combinado inicial (×${combined})`, value: Math.round((Math.round(base * combined * 100) / 100 - base) * 100) / 100 });
  }
  const remainder = Math.round((price.total - lines.reduce((sum, line) => sum + line.value, 0)) * 100) / 100;
  if (remainder !== 0) lines.push({ label: "Piso mínimo / arredondamento do cálculo", value: remainder });
  const factors = price.factors || {};
  const notes = [price.timeTier?.label, service.baseRange ? `Faixa base utilizada: R$ ${service.baseRange[0]} a R$ ${service.baseRange[1]}` : null, ...[factors.supplyDemand, factors.urgency, factors.region, factors.neighborhood, factors.weather].filter(Boolean).map((factor) => `${factor.label}: ×${factor.multiplier}`)].filter(Boolean);
  if (service.isCarKey) {
    const rate = getCarKeyFipeLaborRate(vehicle.year, vehicle.hasCodedKey);
    notes.push(`Mão de obra antes do ajuste dinâmico: FIPE R$ ${Number(vehicle.fipeValue || 0).toFixed(2)} × ${(rate * 100).toFixed(2)}%${vehicle.keyType === "simples" ? ` + R$ ${CAR_KEY_SIMPLE_FIXED} (chave simples)` : ""}.`);
  }
  return { lines, total: price.total, notes };
}