export const normalizeCatalogText = (value) => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const modelName = (value) => normalizeCatalogText(value).replace(/^novo\s+/, "").replace(/\beco sport\b/g, "ecosport").replace(/\bs 10\b/g, "s10");

export function catalogModelMatches(catalogModel, model) {
  const wanted = modelName(model);
  if (!wanted) return false;
  return String(catalogModel || "").split(/[,/]/).some((part) => {
    const name = modelName(part);
    if (!name) return false;
    if (name === wanted) return true;
    // A geração pode estar no catálogo e não no seletor, mas nunca confundir Onix com Onix Plus.
    const base = name.replace(/\s+(?:g\d+|mk\d+)$/, "");
    return base === wanted && base !== name;
  });
}

export function catalogMatchesVehicle(row, model, year) {
  return catalogModelMatches(row.model, model) &&
    (!row.year_start || Number(year) >= Number(row.year_start)) &&
    (!row.year_end || Number(year) <= Number(row.year_end));
}

export function sortCatalogCandidates(rows) {
  const datedPrice = (row) => Boolean(row.catalog_code && row.year_start && Number(row.original_price) > 0);
  const score = (row) => Number(row.verified) * 100 + Number(row.vvdi_supported || row.kd_supported || row.km100_supported) * 10;
  return [...rows].sort((a, b) => Number(datedPrice(b)) - Number(datedPrice(a)) ||
    (datedPrice(a) && datedPrice(b) ? Number(b.original_price) - Number(a.original_price) : score(b) - score(a)) ||
    String(a.catalog_code || a.id).localeCompare(String(b.catalog_code || b.id)));
}