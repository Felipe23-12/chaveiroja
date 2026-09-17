import { base44 } from "@/api/base44Client";
import { validateVehicleQuery, validateFipeResult } from "@/lib/fipeValidation";

const KEY_FALLBACK_BY_MAKE = {
  fiat: 400,
  chevrolet: 350,
  volkswagen: 550,
  vw: 550,
  ford: 300,
  hyundai: 300,
  jeep: 400,
};

const normalizeMake = (value) => String(value || "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, " ")
  .trim();

export function resolveCarKeyValue({ make, year, keyType, keyValue, fallbackUsed }) {
  const current = Number(keyValue) || 250;
  if (!fallbackUsed || Number(year) <= 2020 || !["canivete", "telecomando"].includes(keyType)) return current;
  const normalized = normalizeMake(make);
  const makeKey = Object.keys(KEY_FALLBACK_BY_MAKE).find((name) => normalized === name || normalized.includes(name));
  return makeKey ? KEY_FALLBACK_BY_MAKE[makeKey] : current;
}

// Consulta as novas fontes e usa o maior preço comprovado de chave original.
// Sem oferta original confirmada, a função retorna o valor padrão de R$ 250.
export async function searchCarKeyValue(make, model, year) {
  const response = await base44.functions.invoke("lookupVehiclePricing", { make, model, year, mode: "key_only" });
  const val = response.data?.key_value;
  if (typeof val !== "number" || isNaN(val)) return 250;
  return val;
}

// Pesquisa a FIPE, verifica chave codificada e consolida preços originais
// de lojas especializadas, marketplaces verificados e arquivo importado.
export async function searchFipeAndKeyValue(make, model, year) {
  const input = validateVehicleQuery(model, year);
  if (!input.valid) throw new Error(input.error);

  const response = await base44.functions.invoke("lookupVehiclePricing", { make, model: input.model, year: input.year, mode: "full" });
  const res = response.data;
  const checked = validateFipeResult(res);
  if (!checked.valid) throw new Error(checked.error);
  return {
    fipeValue: checked.fipeValue,
    keyValue: checked.keyValue,
    pricingQuote: res.pricing_quote || null,
    keyValueTrusted: res.key_value_trusted === true,
    keyValueFallback: res.key_value_fallback === true,
    keyValueSource: res.key_value_source || "",
    originalKeyOffers: res.original_key_offers || [],
    hasCodedKey: res.has_coded_key === true,
  };
}