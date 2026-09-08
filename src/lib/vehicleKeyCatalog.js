import { base44 } from "@/api/base44Client";

const normalizeVehicleText = (value) => String(value || "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, " ")
  .trim();

export async function findVehicleKeyCatalog(make, model, year, vehicleType = "carro") {
  if (!make || !model || !year) return null;
  const rows = await base44.entities.VehicleKeyCatalog.filter({ vehicle_type: vehicleType, make, active: true });
  const y = Number(year);
  const wanted = normalizeVehicleText(model);
  const candidates = rows.filter((item) =>
    (!item.year_start || y >= item.year_start) &&
    (!item.year_end || y <= item.year_end) &&
    (normalizeVehicleText(item.model).includes(wanted) || wanted.includes(normalizeVehicleText(item.model)))
  );
  const row = candidates.sort((a, b) => Number(b.verified) - Number(a.verified))[0] || null;
  if (!row) return null;
  const links = await base44.entities.VehicleRemoteCompatibility.filter({ vehicle_catalog_id: row.id, active: true, verified: true });
  const ids = [...new Set(links.map((item) => item.universal_remote_id))];
  const remotes = ids.length ? await base44.entities.UniversalRemote.filter({ id: { $in: ids }, available: true, verified: true }) : [];
  const byId = new Map(remotes.map((item) => [item.id, item]));
  row._remote_options = links.map((link) => ({ ...link, remote: byId.get(link.universal_remote_id) })).filter((item) => item.remote);
  return row;
}

export function parallelOptions(row) {
  if (!row) return [];
  if (row._remote_options?.length) return row._remote_options.map((item) => ({ brand: item.platform, model: item.remote_model, file: item.file_name, price: item.remote.list_price, pairingMethod: item.pairing_method, procedure: item.procedure, frequency: item.frequency_mhz, buttons: item.button_count }));
  return [
    { brand: "VVDI", supported: row.vvdi_supported, file: row.vvdi_file, price: row.vvdi_price },
    { brand: "KD", supported: row.kd_supported, file: row.kd_file, price: row.kd_price },
    { brand: "KM100", supported: row.km100_supported, file: row.km100_file, price: row.km100_price },
  ].filter((item) => item.supported && item.file);
}

export function parallelKeyPrice(row) {
  return Math.max(0, ...parallelOptions(row).map((item) => Number(item.price) || 0));
}

export function chipProgrammingDetails(row) {
  if (row?.transponder_status === "ausente") {
    return { coding: "sem cod — veículo sem transponder", machine: "não se aplica", transponder: "sem transponder" };
  }
  if (row?.transponder_status === "presente") {
    return { coding: "com transponder — requer codificação", machine: row.programming_machine?.trim() || "não confirmada no catálogo", transponder: row.transponder || "modelo do chip não informado" };
  }
  return { coding: "não confirmada — verificar presença de transponder", machine: "não confirmada no catálogo", transponder: row?.transponder || "não informado" };
}

export function technicalKeyDescription({ origin, row }) {
  const originLabel = origin === "paralela" ? "Chave paralela" : "Chave original";
  const files = origin === "paralela"
    ? parallelOptions(row).map((item) => `${item.brand}${item.model ? ` ${item.model}` : ""}: ${item.file}${item.pairingMethod ? ` — apresentação ${({ manual: "por procedimento manual", diagnostic: "via diagnóstico", both: "manual ou diagnóstico", not_confirmed: "não confirmada" })[item.pairingMethod]}` : ""}`).join("; ")
    : "não se aplica";
  const style = {
    lamina_sem_pcf: "lâmina/chip separados, sem PCF",
    canivete_sem_pcf: "canivete sem PCF integrado",
    pcf_integrado: "telecomando com PCF/transponder integrado",
    presenca: "chave presença",
  }[row?.key_style] || "arquitetura não confirmada";
  const chip = chipProgrammingDetails(row);
  return `${originLabel} — Arquitetura: ${style} — Arquivos: ${files || "nenhum arquivo confirmado"} — Transponder: ${chip.transponder} — Lâmina: ${row?.blade || "não informada"}\nCodificação: ${chip.coding}\nMáquina de codificação: ${chip.machine}`;
}