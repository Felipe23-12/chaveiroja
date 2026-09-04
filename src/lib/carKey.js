import { base44 } from "@/api/base44Client";
import { validateVehicleQuery, validateFipeResult } from "@/lib/fipeValidation";

// Pesquisa online do valor médio de mercado da chave original/reserva do veículo.
// Usa o LLM com contexto da internet (Gemini) e devolve um valor numérico em reais.
export async function searchCarKeyValue(model, year) {
  const res = await base44.integrations.Core.InvokeLLM({
    prompt: `Pesquise o valor médio de mercado em reais (BRL) de uma chave original ou reserva (cópia codificada) para o veículo ${model} ano ${year}, considerando concessionárias e lojas no Brasil. Retorne o valor numérico em reais no campo key_value.`,
    add_context_from_internet: true,
    model: "gemini_3_flash",
    response_json_schema: {
      type: "object",
      properties: {
        key_value: { type: "number", description: "Valor médio da chave em reais (BRL)" },
        currency: { type: "string" },
        notes: { type: "string" },
      },
      required: ["key_value"],
    },
  });
  const val = res?.key_value;
  if (typeof val !== "number" || isNaN(val)) return null;
  return val;
}

// Pesquisa o valor da Tabela FIPE, o valor da chave original e identifica
// automaticamente se o veículo utiliza chave codificada.
export async function searchFipeAndKeyValue(model, year) {
  const input = validateVehicleQuery(model, year);
  if (!input.valid) throw new Error(input.error);

  const res = await base44.integrations.Core.InvokeLLM({
    prompt: `Pesquise na Tabela FIPE brasileira o valor médio atual em reais (BRL) do veículo ${input.model} ano ${input.year} (campo fipe_value), o valor médio de mercado de uma chave original desse veículo em concessionárias no Brasil (campo key_value) e identifique se esse modelo e ano utiliza transponder, chip ou imobilizador eletrônico na chave (campo has_coded_key, booleano). Considere chave codificada quando houver qualquer chip/transponder necessário para ligar o veículo. Retorne os valores em reais sem símbolos.`, 
    add_context_from_internet: true,
    model: "gemini_3_flash",
    response_json_schema: {
      type: "object",
      properties: {
        fipe_value: { type: "number", description: "Valor da tabela FIPE em reais (BRL)" },
        key_value: { type: "number", description: "Valor médio da chave original em reais (BRL)" },
        has_coded_key: { type: "boolean", description: "Se a chave usa chip, transponder ou imobilizador eletrônico" },
        notes: { type: "string" },
      },
      required: ["fipe_value", "has_coded_key"],
    },
  });
  const checked = validateFipeResult(res);
  if (!checked.valid) throw new Error(checked.error);
  return {
    fipeValue: checked.fipeValue,
    keyValue: checked.keyValue,
    keyValueTrusted: checked.keyValueTrusted,
    hasCodedKey: res.has_coded_key === true,
  };
}