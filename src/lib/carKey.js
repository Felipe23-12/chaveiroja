import { base44 } from "@/api/base44Client";
import { validateVehicleQuery, validateFipeResult } from "@/lib/fipeValidation";

// Pesquisa online do valor médio de mercado da chave original/reserva do veículo.
// Usa o LLM com contexto da internet (Gemini) e devolve um valor numérico em reais.
export async function searchCarKeyValue(model, year) {
  const response = await base44.functions.invoke("lookupVehiclePricing", { model, year, mode: "key_only" });
  const val = response.data?.key_value;
  if (typeof val !== "number" || isNaN(val)) return null;
  return val;
}

// Pesquisa o valor da Tabela FIPE, o valor da chave original e identifica
// automaticamente se o veículo utiliza chave codificada.
export async function searchFipeAndKeyValue(model, year) {
  const input = validateVehicleQuery(model, year);
  if (!input.valid) throw new Error(input.error);

  const response = await base44.functions.invoke("lookupVehiclePricing", { model: input.model, year: input.year, mode: "full" });
  const res = response.data;
  const checked = validateFipeResult(res);
  if (!checked.valid) throw new Error(checked.error);
  return {
    fipeValue: checked.fipeValue,
    keyValue: checked.keyValue,
    keyValueTrusted: checked.keyValueTrusted,
    hasCodedKey: res.has_coded_key === true,
  };
}