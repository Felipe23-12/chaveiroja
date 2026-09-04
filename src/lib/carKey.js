import { base44 } from "@/api/base44Client";

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

// Pesquisa o valor da Tabela FIPE do veículo e o valor da chave original.
// A mão de obra da confecção é calculada a partir do valor FIPE (0,8%).
export async function searchFipeAndKeyValue(model, year) {
  const res = await base44.integrations.Core.InvokeLLM({
    prompt: `Pesquise na Tabela FIPE brasileira o valor médio atual em reais (BRL) do veículo ${model} ano ${year} (campo fipe_value) e também o valor médio de mercado de uma chave original/codificada desse veículo em concessionárias no Brasil (campo key_value). Retorne apenas números em reais.`,
    add_context_from_internet: true,
    model: "gemini_3_flash",
    response_json_schema: {
      type: "object",
      properties: {
        fipe_value: { type: "number", description: "Valor da tabela FIPE em reais (BRL)" },
        key_value: { type: "number", description: "Valor médio da chave original em reais (BRL)" },
        notes: { type: "string" },
      },
      required: ["fipe_value"],
    },
  });
  const fipe = res?.fipe_value;
  if (typeof fipe !== "number" || isNaN(fipe) || fipe <= 0) return null;
  const key = typeof res?.key_value === "number" && !isNaN(res.key_value) ? res.key_value : 0;
  return { fipeValue: fipe, keyValue: key };
}