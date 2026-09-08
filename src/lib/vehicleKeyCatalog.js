import { base44 } from "@/api/base44Client";

export async function findVehicleKeyCatalog(make, model, year, vehicleType = "carro") {
  if (!make || !model || !year) return null;
  const rows = await base44.entities.VehicleKeyCatalog.filter({ vehicle_type: vehicleType, make, model, active: true, verified: true });
  const y = Number(year);
  return rows.find((row) => (!row.year_start || y >= row.year_start) && (!row.year_end || y <= row.year_end)) || null;
}

export function parallelOptions(row) {
  if (!row) return [];
  return [
    { brand: "VVDI", supported: row.vvdi_supported, file: row.vvdi_file, price: row.vvdi_price },
    { brand: "KD", supported: row.kd_supported, file: row.kd_file, price: row.kd_price },
    { brand: "KM100", supported: row.km100_supported, file: row.km100_file, price: row.km100_price },
  ].filter((item) => item.supported && item.file);
}

export function parallelKeyPrice(row) {
  return Math.max(0, ...parallelOptions(row).map((item) => Number(item.price) || 0));
}

export function technicalKeyDescription({ origin, row }) {
  const originLabel = origin === "paralela" ? "Chave paralela" : "Chave original";
  const files = origin === "paralela"
    ? parallelOptions(row).map((item) => `${item.brand}: ${item.file}`).join("; ")
    : "não se aplica";
  const style = {
    lamina_sem_pcf: "lâmina/chip separados, sem PCF",
    canivete_sem_pcf: "canivete sem PCF integrado",
    pcf_integrado: "telecomando com PCF/transponder integrado",
    presenca: "chave presença",
  }[row?.key_style] || "arquitetura não confirmada";
  return `${originLabel} — Arquitetura: ${style} — Arquivos: ${files || "nenhum arquivo confirmado"} — Transponder: ${row?.transponder || "não informado"} — Lâmina: ${row?.blade || "não informada"}`;
}