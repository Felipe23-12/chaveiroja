// Validação da integração com a Tabela FIPE.
//
// A consulta FIPE é feita por pesquisa online e pode devolver valores em
// formatos diferentes ("R$ 45.900,00", "45900", "45.900") ou fora da realidade.
// Este módulo normaliza e valida os dados antes de qualquer cálculo de preço,
// evitando erros de leitura que distorceriam a mão de obra (0,8% da FIPE) e as
// regras específicas de cada modelo de carro/moto.

// Faixas plausíveis
export const FIPE_MIN = 1000; // veículos muito antigos
export const FIPE_MAX = 3000000; // superesportivos
export const KEY_VALUE_MAX = 20000; // chave original mais caras do mercado
export const YEAR_MIN = 1960;

/** Converte "R$ 45.900,00" / "45.900" / 45900 em número (reais). */
export function parseCurrencyNumber(value) {
  if (typeof value === "number") return isFinite(value) ? value : null;
  if (typeof value !== "string") return null;
  let s = value.replace(/[^\d.,-]/g, "").trim();
  if (!s) return null;
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  if (lastComma > lastDot) {
    // formato brasileiro: 45.900,00
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (lastComma !== -1 && lastDot === -1) {
    s = s.replace(",", ".");
  } else {
    // 45.900 (milhar) vs 45900.50 (decimal)
    const decimals = lastDot !== -1 ? s.length - lastDot - 1 : 0;
    if (decimals === 3) s = s.replace(/\./g, "");
  }
  const n = Number(s);
  return isFinite(n) ? n : null;
}

/** Valida os dados do veículo informados pelo cliente antes da consulta. */
export function validateVehicleQuery(model, year) {
  const m = (model || "").trim();
  if (m.length < 2) return { valid: false, error: "Informe o modelo do veículo (ex.: Onix 1.0 LT)." };
  const y = Number(String(year).trim());
  const maxYear = new Date().getFullYear() + 1;
  if (!Number.isInteger(y) || y < YEAR_MIN || y > maxYear) {
    return { valid: false, error: `Informe um ano válido entre ${YEAR_MIN} e ${maxYear}.` };
  }
  return { valid: true, model: m, year: y };
}

/**
 * Normaliza e valida a resposta da consulta FIPE.
 * @returns {{ valid: boolean, error?: string, fipeValue?: number, keyValue?: number, keyValueTrusted?: boolean }}
 */
export function validateFipeResult(raw) {
  const fipeValue = parseCurrencyNumber(raw?.fipe_value);
  if (fipeValue == null || fipeValue <= 0) {
    return { valid: false, error: "Não foi possível ler o valor da Tabela FIPE deste veículo. Revise o modelo e o ano." };
  }
  if (fipeValue < FIPE_MIN || fipeValue > FIPE_MAX) {
    return {
      valid: false,
      error: "O valor FIPE retornado está fora da faixa esperada. Informe o modelo com mais detalhes (versão e motor).",
    };
  }

  // Valor da chave: opcional. Descarta leituras implausíveis em vez de
  // propagar um número errado para o preço final.
  let keyValue = parseCurrencyNumber(raw?.key_value);
  let keyValueTrusted = true;
  if (keyValue == null || keyValue < 0 || keyValue > KEY_VALUE_MAX || keyValue > fipeValue * 0.5) {
    keyValue = 0;
    keyValueTrusted = false;
  }

  return {
    valid: true,
    fipeValue: Math.round(fipeValue * 100) / 100,
    keyValue: Math.round(keyValue * 100) / 100,
    keyValueTrusted,
  };
}

/** Valida o ano informado para motos (regras por faixa de ano). */
export function validateMotoYear(year) {
  const y = Number(String(year ?? "").trim());
  const maxYear = new Date().getFullYear() + 1;
  if (!Number.isInteger(y) || y < 1980 || y > maxYear) {
    return { valid: false, error: `Informe um ano válido entre 1980 e ${maxYear}.`, year: null };
  }
  return { valid: true, year: y };
}