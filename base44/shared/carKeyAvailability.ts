export function carKeyUnavailableReason(make, model, year) {
  const vehicle = `${String(make || '')} ${String(model || '')}`.toLowerCase();
  if (/\bmercedes(?:[\s-]*benz)?\b/.test(vehicle) && Number(year) >= 2015) {
    return 'Mercedes-Benz a partir de 2015: confecção de chave somente na concessionária autorizada. Serviço indisponível pelo aplicativo, sem orçamento ou abertura de chamado.';
  }
  return null;
}