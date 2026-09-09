import { base44 } from "@/api/base44Client";
import { validateVehicleQuery, validateFipeResult } from "@/lib/fipeValidation";

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
    keyValueTrusted: res.key_value_trusted === true,
    keyValueFallback: res.key_value_fallback === true,
    keyValueSource: res.key_value_source || "",
    originalKeyOffers: res.original_key_offers || [],
    hasCodedKey: res.has_coded_key === true,
  };
}