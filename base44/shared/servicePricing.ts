import { verifyVehiclePricingQuote } from './vehiclePricingQuote.ts';

const RULES = {
  'Abertura Residencial': { range: [80, 250], id: 'abertura_residencial' },
  'Abertura Automotiva': { range: [120, 350], id: 'abertura_automotiva' },
  'Abertura Fechadura Tetra': { range: [100, 300], id: 'abertura_tetra' },
  'Abertura Fechadura Eletrônica': { range: [350, 450], id: 'abertura_eletronica' },
  'Confecção de Chave de Carro': { carKey: true, id: 'confeccao_chave_carro' },
  'Confecção de Chave de Moto': { range: [200, 500], id: 'confeccao_chave_moto' },
  'Cópia de Chave': { fixed: 4, id: 'copia_chave' },
};

const LOCKS = {
  simples: { open: 70, core: 90 },
  tetra: { open: 120, core: 180 },
  eletronica: { open: 250, core: 300 },
  auxiliar: { open: 60, core: 80 },
  outro: { open: 0, core: 0 },
};

const round = (value) => Math.round(Number(value || 0) * 100) / 100;
const bounded = (value, min, max) => Math.min(max, Math.max(min, Number(value) || 0));

function saoPauloTimeFactor(now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo', weekday: 'short', hour: '2-digit', hourCycle: 'h23',
  }).formatToParts(now).map((part) => [part.type, part.value]));
  if (parts.weekday === 'Sat' || parts.weekday === 'Sun') return 0.9;
  const hour = Number(parts.hour);
  return hour >= 8 && hour < 17 ? 0.2 : 0.6;
}

function supplyMultiplier(supply, demand) {
  if (!supply) return 1.25;
  const ratio = demand / supply;
  if (ratio >= 2) return 1.25;
  if (ratio >= 1.5) return 1.15;
  if (ratio >= 1) return 1.05;
  if (ratio >= 0.5) return 0.95;
  if (ratio >= 0.25) return 0.88;
  return 0.82;
}

function distanceKm(a, b) {
  const rad = (value) => value * Math.PI / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function lockExtras(locks) {
  if (!Array.isArray(locks)) return 0;
  return round(locks.slice(0, 20).reduce((total, lock, index) => {
    const rule = LOCKS[String(lock?.model || '')] || LOCKS.outro;
    return total + (index > 0 ? rule.open : 0) + (lock?.miolo === true ? rule.core : 0);
  }, 0));
}

function vehicleComplexity(make, model, year) {
  if (/^renault(?:\s|$)/i.test(make) && (year >= 2015 || (/\bsandero\b/i.test(model) && [2012, 2013].includes(year)))) return 450;
  if (!/^toyota(?:\s|$)/i.test(make)) return 0;
  return /\b(?:corolla|rav\s*4|sw\s*4)\b/i.test(model) ? 700 : 300;
}

function normalizeVehicleText(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function serverProgrammingFee(make, model, year) {
  const text = normalizeVehicleText(`${make} ${model}`);
  const vw = /\b(vw|volkswagen)\b/.test(text);
  const gm = /\b(gm|chevrolet)\b/.test(text);
  const dealerOnly = ['amarok', 'touareg', 'tiguan', 'taos', 'jetta gli', 'golf gti'];
  if (vw && dealerOnly.some((item) => text.includes(item))) throw new Error('Este veículo só pode ser programado na concessionária');
  const vwOnline = ['polo', 'virtus', 't cross', 'tcross', 'nivus', 'jetta', 'golf', 'saveiro', 'gol', 'voyage'];
  const gmOnline = ['onix', 'onix plus', 'tracker', 'spin', 's10', 'cruze', 'montana', 'trailblazer', 'equinox'];
  if ((gm && year >= 2020 && gmOnline.some((item) => text.includes(item))) || (vw && year >= 2018 && vwOnline.some((item) => text.includes(item)))) return 250;
  return 0;
}

function catalogMatches(catalog, vehicle) {
  const make = normalizeVehicleText(vehicle.make);
  const model = normalizeVehicleText(vehicle.model);
  const catalogMake = normalizeVehicleText(catalog.make);
  const catalogModels = String(catalog.model || '').split(/[,/]/).map(normalizeVehicleText);
  const year = Number(vehicle.year);
  return catalog.vehicle_type === 'carro' && catalog.active === true && catalogMake === make &&
    catalogModels.some((item) => item === model || item.includes(model) || model.includes(item)) &&
    (!catalog.year_start || year >= catalog.year_start) && (!catalog.year_end || year <= catalog.year_end);
}

function catalogKeyValue(catalog, quoteKeyValue, keyType, keyOrigin) {
  const original = Number(catalog?.original_price) > 0 ? Number(catalog.original_price) : quoteKeyValue;
  if (keyOrigin !== 'paralela') return original;
  const manualField = keyType === 'simples' ? 'parallel_simple_price' : keyType === 'presenca' ? 'parallel_proximity_price' : 'parallel_flip_price';
  const manual = Number(catalog?.[manualField]) || 0;
  if (manual > 0) return manual;
  const generated = Math.max(Number(catalog?.vvdi_price) || 0, Number(catalog?.kd_price) || 0, Number(catalog?.km100_price) || 0);
  if (generated > 0) return generated;
  return catalog?.factory_alarm_status === 'ausente' ? 0 : round(original * 0.65);
}

async function carKeyPrice(base44, userId, data, inputs, multiplier, distanceFee) {
  const vehicle = inputs.vehicle || {};
  const year = bounded(vehicle.year, 1900, 2200);
  const make = String(vehicle.make || '').trim();
  const model = String(vehicle.model || '').trim();
  if (!make || !model || year < 1900) throw new Error('Dados do veículo inválidos para precificação');
  const quote = await verifyVehiclePricingQuote(inputs.vehicle_pricing_quote, userId, vehicle);
  const catalog = inputs.vehicle_catalog_id ? await base44.asServiceRole.entities.VehicleKeyCatalog.get(String(inputs.vehicle_catalog_id)).catch(() => null) : null;
  if (catalog && !catalogMatches(catalog, vehicle)) throw new Error('Catálogo do veículo não confere com a solicitação');
  const fipe = quote.fipeValue;
  const keyType = ['simples', 'canivete', 'telecomando', 'presenca'].includes(data.key_type) ? data.key_type : 'simples';
  const keyOrigin = inputs.key_origin === 'paralela' ? 'paralela' : 'original';
  if (keyOrigin === 'paralela' && !catalog) throw new Error('Catálogo da chave paralela é obrigatório');
  const keyValue = catalogKeyValue(catalog, quote.keyValue, keyType, keyOrigin);
  if (keyOrigin === 'paralela' && keyValue <= 0) throw new Error('Preço da chave paralela não confirmado no catálogo');
  const rate = year >= 2020 ? 0.008 : year >= 2010 ? 0.009 : year >= 2000 ? 0.011 : quote.hasCodedKey ? 0.013 : 0.011;
  const labor = round(fipe * rate + (keyType === 'simples' ? 120 : 0));
  const chargedKey = keyType === 'simples' && !(keyOrigin === 'paralela' && Number(catalog?.parallel_simple_price) > 0) ? 0 : keyValue;
  const onlineFee = serverProgrammingFee(make, model, year);
  const complexityFee = vehicleComplexity(make, model, year);
  const alarmFee = /^land\s*rover(?:\s|$)/i.test(make) && year >= 2020 && vehicle.alarm_locked === true ? 8000 : 0;
  const base = Math.max(380, round(chargedKey + round(labor * multiplier) + onlineFee + distanceFee));
  return {
    total: round(base + complexityFee + alarmFee),
    protectedFees: complexityFee + alarmFee,
    lines: [
      { label: 'Valor da chave', value: chargedKey },
      { label: 'Mão de obra calculada no servidor', value: round(labor * multiplier) },
      ...(onlineFee ? [{ label: 'Programação online', value: onlineFee }] : []),
      ...(distanceFee ? [{ label: 'Locomoção', value: distanceFee }] : []),
      ...(complexityFee ? [{ label: 'Complexidade do veículo', value: complexityFee }] : []),
      ...(alarmFee ? [{ label: 'Land Rover trancada no alarme', value: alarmFee }] : []),
    ],
  };
}

async function loyaltyAvailable(base44, userId) {
  const [completed, used] = await Promise.all([
    base44.asServiceRole.entities.ServiceRequest.filter({ created_by_id: userId, status: 'completed' }),
    base44.asServiceRole.entities.ServiceRequest.filter({ created_by_id: userId, discount_applied: true }),
  ]);
  return Math.max(0, Math.floor(completed.length / 5) - used.length) > 0;
}

export async function calculateServerServicePrice(base44, userId, data) {
  const rule = RULES[data.service_type];
  if (!rule) throw new Error('Serviço inválido');
  const inputs = data.pricing_inputs && typeof data.pricing_inputs === 'object' ? data.pricing_inputs : {};
  const [online, searching, ringing] = await Promise.all([
    base44.asServiceRole.entities.Locksmith.filter({ online: true }, '-updated_date', 500),
    base44.asServiceRole.entities.ServiceRequest.filter({ status: 'searching' }, '-created_date', 500),
    base44.asServiceRole.entities.ServiceRequest.filter({ status: 'ringing' }, '-created_date', 500),
  ]);
  const urgency = data.urgency === 'urgent' ? 'urgent' : 'normal';
  const timeFactor = saoPauloTimeFactor();
  const tierFactor = urgency === 'urgent' ? Math.max(timeFactor, 0.6) : Math.min(timeFactor, 0.6);
  const multiplier = round(Math.min(1.6, Math.max(0.7, supplyMultiplier(online.length, searching.length + ringing.length) * (urgency === 'urgent' ? 1.3 : 1))));
  const customer = { lat: Number(data.customer_lat), lng: Number(data.customer_lng) };
  const distances = Number.isFinite(customer.lat) && Number.isFinite(customer.lng)
    ? online.filter((item) => Number.isFinite(Number(item.lat)) && Number.isFinite(Number(item.lng))).map((item) => distanceKm(customer, { lat: Number(item.lat), lng: Number(item.lng) }))
    : [];
  const nearest = distances.length ? Math.min(...distances) : 0;
  const distanceFee = nearest > 20 ? round(nearest * 0.9) : 0;

  let calculation;
  if (rule.fixed) {
    calculation = { total: rule.fixed, protectedFees: 0, lines: [{ label: `${data.service_type} (preço fixo)`, value: rule.fixed }] };
  } else if (rule.carKey) {
    calculation = await carKeyPrice(base44, userId, data, inputs, multiplier, distanceFee);
  } else {
    const base = Math.round(rule.range[0] + (rule.range[1] - rule.range[0]) * tierFactor);
    let adjusted = round(base * multiplier);
    const vehicle = inputs.vehicle || {};
    if (rule.id === 'abertura_automotiva' && Number(vehicle.year) >= 2020) adjusted = round(adjusted * 1.25);
    const automotiveFee = rule.id === 'abertura_automotiva' ? ({ media: 25, alta: 50 }[vehicle.complexity] || 0) : 0;
    const locks = rule.id === 'abertura_residencial' || rule.id === 'abertura_tetra' || rule.id === 'abertura_eletronica' ? lockExtras(inputs.locks) : 0;
    const brokenFee = rule.id.startsWith('abertura_') && inputs.broken_key_in_lock === true ? 25 : 0;
    const total = round(Math.max(['abertura_residencial', 'abertura_automotiva'].includes(rule.id) ? 50 : 0, adjusted + locks + distanceFee) + automotiveFee + brokenFee);
    calculation = {
      total,
      protectedFees: brokenFee,
      lines: [
        { label: `${data.service_type} (calculado no servidor)`, value: adjusted },
        ...(locks ? [{ label: 'Fechaduras e miolos adicionais', value: locks }] : []),
        ...(distanceFee ? [{ label: 'Locomoção', value: distanceFee }] : []),
        ...(automotiveFee ? [{ label: 'Complexidade automotiva', value: automotiveFee }] : []),
        ...(brokenFee ? [{ label: 'Adicional de condição da abertura', value: brokenFee }] : []),
      ],
    };
  }

  const useDiscount = data.discount_applied === true && await loyaltyAvailable(base44, userId);
  const discountBase = Math.max(0, calculation.total - calculation.protectedFees);
  const discount = useDiscount ? round(discountBase * 0.1) : 0;
  const minimum = rule.carKey ? 380 + calculation.protectedFees : 0;
  const price = Math.max(minimum, round(calculation.total - discount));
  return {
    price,
    discount: round(calculation.total - price),
    calculation: { total: calculation.total, lines: calculation.lines, notes: ['Preço recalculado e validado pelo servidor.'] },
  };
}