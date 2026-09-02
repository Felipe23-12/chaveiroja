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