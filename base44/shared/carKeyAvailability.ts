export function carKeyUnavailableReason(make, model, year) {
  const vehicle = `${String(make || '')} ${String(model || '')}`.toLowerCase();
  if (/\bmercedes(?:[\s-]*benz)?\b/.test(vehicle) && Number(year) >= 2015 && !/\bsprinter\b/.test(vehicle)) {
    return 'Mercedes-Benz a partir de 2015: cobertura de confecção de chave não habilitada para este modelo no aplicativo. Consulte a concessionária ou um especialista com cobertura confirmada.';
  }
  return null;
}