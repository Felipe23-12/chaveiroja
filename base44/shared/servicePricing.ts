import { verifyVehiclePricingQuote } from './vehiclePricingQuote.ts';
import { carKeyUnavailableReason } from './carKeyAvailability.ts';
import { loadServicePricing } from './servicePricingSettings.ts';
import { pricingCalendar, pricingFactors, adjustedCharge } from './servicePricingConditions.ts';
import { pricingWeather } from './serviceWeather.ts';
import { regionalPriceForLocation } from './regionalServicePricing.ts';
import { currentVehicleCatalog, catalogKeyPrice } from './catalogServicePricing.ts';
import { vehicleFipeRate, matchingVehicleRule, vehicleManualKeyPrice, vehicleKeyUnavailable } from './vehicleFipeRates.ts';
import { isAreaAvailable } from './serviceAreas.ts';
import { requireServiceCoverage } from './serviceCoverage.ts';

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



function distanceKm(a, b) {
  const rad = (value) => value * Math.PI / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function lockExtras(locks, settings) {
  if (!Array.isArray(locks)) return 0;
  return round(locks.slice(0, 20).reduce((total, lock, index) => {
    const type = Object.hasOwn(LOCKS, String(lock?.model || '')) ? lock.model : 'outro';
    return total + (index > 0 ? settings[`lock_${type}`] : 0) + (lock?.miolo === true ? settings[`core_${type}`] : 0);
  }, 0));
}

function vehicleComplexity(make, model, year, settings) {
  if (/^ford(?:\s|$)/i.test(make) && year >= 2020) return settings.ford_fee;
  if (/^renault(?:\s|$)/i.test(make) && (year >= 2015 || (/\bsandero\b/i.test(model) && [2012, 2013].includes(year)))) return settings.renault_fee;
  if (!/^toyota(?:\s|$)/i.test(make)) return 0;
  return /\b(?:corolla|rav\s*4|sw\s*4)\b/i.test(model) ? settings.toyota_high : settings.toyota_medium;
}

function normalizeVehicleText(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function serverProgrammingFee(make, model, year, settings) {
  const text = normalizeVehicleText(`${make} ${model}`);
  const vw = /\b(vw|volkswagen)\b/.test(text);
  const gm = /\b(gm|chevrolet)\b/.test(text);
  const dealerOnly = ['amarok', 'touareg', 'tiguan', 'taos', 'jetta gli', 'golf gti'];
  if (vw && dealerOnly.some((item) => text.includes(item))) throw new Error('Este veículo só pode ser programado na concessionária');
  const vwOnline = ['polo', 'virtus', 't cross', 'tcross', 'nivus', 'jetta', 'golf', 'saveiro', 'gol', 'voyage'];
  const gmOnline = ['onix', 'onix plus', 'tracker', 'spin', 's10', 'cruze', 'montana', 'trailblazer', 'equinox'];
  if ((gm && year >= 2020 && gmOnline.some((item) => text.includes(item))) || (vw && year >= 2018 && vwOnline.some((item) => text.includes(item)))) return settings.online_fee;
  return 0;
}



async function carKeyPrice(base44, userId, data, inputs, factors, distanceFee, settings, vehicleFipeRates) {
  const vehicle = inputs.vehicle || {};
  const year = bounded(vehicle.year, 1900, 2200);
  const make = String(vehicle.make || '').trim();
  const model = String(vehicle.model || '').trim();
  if (!make || !model || year < 1900) throw new Error('Dados do veículo inválidos para precificação');
  const quote = await verifyVehiclePricingQuote(inputs.vehicle_pricing_quote, userId, vehicle);
  const catalog = await currentVehicleCatalog(base44, vehicle, 'carro');
  const fipe = quote.fipeValue;
  const keyType = ['simples', 'canivete', 'telecomando', 'presenca'].includes(data.key_type) ? data.key_type : 'simples';
  const keyOrigin = inputs.key_origin === 'paralela' ? 'paralela' : 'original';
  if (keyOrigin === 'paralela' && !catalog) throw new Error('Catálogo da chave paralela é obrigatório');
  const vehicleRule = matchingVehicleRule(make, model, year, vehicleFipeRates);
  if (vehicleKeyUnavailable(vehicleRule, keyType, keyOrigin)) throw new Error('Esta opção de chave está indisponível para o veículo e ano selecionados. Escolha outra opção.');
  const manualKey = vehicleManualKeyPrice(vehicleRule, keyType, keyOrigin);
  const keyValue = manualKey ?? await catalogKeyPrice(base44, catalog, quote.keyValue, keyType, keyOrigin, settings, year);
  const coded = catalog?.transponder_status === 'presente' || (catalog?.transponder_status !== 'ausente' && quote.hasCodedKey);
  if (keyOrigin === 'paralela' && keyValue <= 0 && manualKey === null) throw new Error('Preço da chave paralela não confirmado no catálogo');
  const fipeRate = vehicleFipeRate(make, model, year, coded, settings, vehicleFipeRates);
  const labor = round(fipe * fipeRate.percent / 100 + (keyType === 'simples' ? settings.simple_fixed : 0));
  const adjusted = adjustedCharge(labor, factors, `Mão de obra: ${fipeRate.percent}% da FIPE${fipeRate.label ? ` (${fipeRate.label})` : ''}${keyType === 'simples' ? ` + R$ ${settings.simple_fixed.toFixed(2)} (chave simples)` : ''}`);
  const manualSimple = manualKey !== null || (keyOrigin === 'paralela' ? Number(catalog?.parallel_simple_price) > 0 : !!catalog?.manual_price_updated_at && Number(catalog?.original_price) > 0);
  const chargedKey = keyType === 'simples' && !manualSimple ? 0 : keyValue;
  const onlineFee = serverProgrammingFee(make, model, year, settings);
  const complexityFee = vehicleComplexity(make, model, year, settings);
  const alarmFee = /^land\s*rover(?:\s|$)/i.test(make) && year >= 2020 && vehicle.alarm_locked === true ? settings.alarm_fee : 0;
  const raw = round(chargedKey + adjusted.total + onlineFee + distanceFee);
  const base = Math.max(settings.minimum, raw);
  return {
    total: round(base + complexityFee + alarmFee),
    protectedFees: complexityFee + alarmFee,
    fields: { key_value: chargedKey, fipe_value: fipe, labor_cost: adjusted.total, locomotion_cost: distanceFee, extra_cost: onlineFee + complexityFee + alarmFee },
    lines: [
      { label: 'Valor da chave', value: chargedKey },
      ...adjusted.lines,
      ...(base > raw ? [{ label: 'Ajuste ao piso mínimo', value: round(base - raw) }] : []),
      ...(onlineFee ? [{ label: 'Programação online', value: onlineFee }] : []),
      ...(distanceFee ? [{ label: 'Locomoção', value: distanceFee }] : []),
      ...(complexityFee ? [{ label: /^ford(?:\s|$)/i.test(make) && year >= 2020 ? 'Adicional Ford a partir de 2020' : 'Complexidade do veículo', value: complexityFee }] : []),
      ...(alarmFee ? [{ label: 'Land Rover trancada no alarme', value: alarmFee }] : []),
    ],
  };
}

async function loyaltyAvailable(base44, userId) {
  const [completed, used] = await Promise.all([
    base44.asServiceRole.entities.ServiceRequest.filter({ created_by_id: userId, status: 'completed' }),
    base44.asServiceRole.entities.ServiceRequest.filter({ created_by_id: userId, discount_applied: true }),
  ]);
  const paidRequestIds = completed.length
    ? new Set((await base44.asServiceRole.entities.Payment.filter({
        service_request_id: { $in: completed.map((r) => r.id) },
        status: { $in: ['paid', 'captured'] },
      })).map((p) => p.service_request_id))
    : new Set();
  const verifiedCompleted = completed.filter((r) => paidRequestIds.has(r.id));
  return Math.max(0, Math.floor(verifiedCompleted.length / 5) - used.length) > 0;
}

export async function calculateServerServicePrice(base44, userId, data) {
  const permittedAreas = await requireServiceCoverage(base44, data.customer_lat, data.customer_lng);
  const rule = RULES[data.service_type];
  if (!rule) throw new Error('Serviço inválido');
  const inputs = data.pricing_inputs && typeof data.pricing_inputs === 'object' ? data.pricing_inputs : {};
  if (rule.carKey) {
    const vehicle = inputs.vehicle || {};
    const unavailable = carKeyUnavailableReason(vehicle.make, vehicle.model, vehicle.year);
    if (unavailable) throw new Error(unavailable);
  }
  const [profiles, searching, ringing, config, weather, regional, areas] = await Promise.all([
    base44.asServiceRole.entities.Locksmith.filter({ online: true }, '-updated_date', 500),
    base44.asServiceRole.entities.ServiceRequest.filter({ status: 'searching' }, '-created_date', 500),
    base44.asServiceRole.entities.ServiceRequest.filter({ status: 'ringing' }, '-created_date', 500),
    loadServicePricing(base44, data.service_type),

    rule.fixed ? Promise.resolve({ key: null, label: 'Preço fixo: sem ajuste climático' }) : pricingWeather(data.customer_lat == null ? NaN : Number(data.customer_lat), data.customer_lng == null ? NaN : Number(data.customer_lng)),
    regionalPriceForLocation(base44, data.service_type, data.customer_lat, data.customer_lng),
    Promise.resolve(permittedAreas),
  ]);
  const online = profiles.filter(l => isAreaAvailable(areas, l.lat, l.lng));
  const settings = config.values;
  const urgency = data.urgency === 'urgent' ? 'urgent' : 'normal';
  const calendar = pricingCalendar(settings);
  const tierFactor = urgency === 'urgent' ? Math.max(calendar.tier, settings.tier_urgent_floor / 100) : Math.min(calendar.tier, settings.tier_normal_cap / 100);
  const factors = rule.fixed ? [] : pricingFactors(settings, online.length, searching.length + ringing.length, urgency === 'urgent', calendar, weather);
  const customer = { lat: Number(data.customer_lat), lng: Number(data.customer_lng) };
  const distances = Number.isFinite(customer.lat) && Number.isFinite(customer.lng)
    ? online.filter((item) => Number.isFinite(Number(item.lat)) && Number.isFinite(Number(item.lng))).map((item) => distanceKm(customer, { lat: Number(item.lat), lng: Number(item.lng) }))
    : [];
  const nearest = distances.length ? Math.min(...distances) : 0;
  const distanceFee = !rule.fixed && nearest > settings.distance_threshold ? round(nearest * settings.distance_rate) : 0;

  let calculation;
  if (rule.fixed) {
    calculation = { total: settings.fixed, protectedFees: 0, fields: { extra_cost: 0, locomotion_cost: 0 }, lines: [{ label: `${data.service_type} (preço fixo)`, value: settings.fixed }] };
  } else if (rule.carKey) {
    calculation = await carKeyPrice(base44, userId, data, inputs, factors, distanceFee, settings, config.vehicle_fipe_rates);
  } else {
    const [baseMin, baseMax] = regional?.range || [settings.base_min, settings.base_max];
    const base = Math.round(baseMin + (baseMax - baseMin) * tierFactor);
    const vehicle = inputs.vehicle || {};
    const openingFactors = rule.id === 'abertura_automotiva' && Number(vehicle.year) >= 2020 ? [...factors, { label: 'Veículo de 2020 em diante', percent: settings.opening_2020 }] : factors;
    const adjusted = adjustedCharge(base, openingFactors, `${data.service_type} (base)`);
    const automotiveFee = rule.id === 'abertura_automotiva' ? ({ media: settings.opening_medium, alta: settings.opening_high }[vehicle.complexity] || 0) : 0;
    const locks = rule.id === 'abertura_residencial' || rule.id === 'abertura_tetra' || rule.id === 'abertura_eletronica' ? lockExtras(inputs.locks, settings) : 0;
    const brokenFee = rule.id.startsWith('abertura_') && inputs.broken_key_in_lock === true ? settings.condition_fee : 0;
    const motoCatalog = rule.id === 'confeccao_chave_moto' ? await currentVehicleCatalog(base44, vehicle, 'moto') : null;
    const motoKey = rule.id === 'confeccao_chave_moto' ? await catalogKeyPrice(base44, motoCatalog, 0, data.key_type || 'simples', inputs.key_origin, settings, vehicle.year) : 0;
    const raw = round(adjusted.total + locks + distanceFee + motoKey);
    const floorAdjustment = round(Math.max(0, settings.minimum - raw));
    const total = round(raw + floorAdjustment + automotiveFee + brokenFee);
    calculation = {
      total,
      protectedFees: brokenFee,
      fields: { labor_cost: adjusted.total, extra_cost: locks + automotiveFee + brokenFee, locomotion_cost: distanceFee, ...(rule.id === 'confeccao_chave_moto' ? { key_value: motoKey } : {}) },
      lines: [
        ...adjusted.lines,
        ...(motoKey ? [{ label: 'Valor da chave (catálogo administrativo)', value: motoKey }] : []),
        ...(floorAdjustment ? [{ label: 'Ajuste ao piso mínimo', value: floorAdjustment }] : []),
        ...(locks ? [{ label: 'Fechaduras e miolos adicionais', value: locks }] : []),
        ...(distanceFee ? [{ label: 'Locomoção', value: distanceFee }] : []),
        ...(automotiveFee ? [{ label: 'Complexidade automotiva', value: automotiveFee }] : []),
        ...(rule.id.startsWith('abertura_') && inputs.broken_key_in_lock === true ? [{ label: 'Adicional de condição da abertura', value: brokenFee }] : []),
      ],
    };
  }

  const useDiscount = data.discount_applied === true && await loyaltyAvailable(base44, userId);
  const discountBase = Math.max(0, calculation.total - calculation.protectedFees);
  const discount = useDiscount ? round(discountBase * settings.loyalty / 100) : 0;
  const minimum = rule.carKey ? settings.minimum + calculation.protectedFees : 0;
  const price = Math.max(minimum, round(calculation.total - discount));
  return {
    price,
    discount: round(calculation.total - price),
    minimum,
    fields: calculation.fields,
    calculation: { total: calculation.total, lines: calculation.lines, notes: [
      'Preço recalculado e validado pelo servidor.',
      config.version ? `Tabela de cobranças: ${config.version}` : 'Tabela de cobranças inicial.',
      ...(regional?.note ? [regional.note] : []),
      ...(!rule.fixed ? [weather.label, 'Calendário de Brasília: nacionais e São Paulo. Feriado substitui sábado/domingo.'] : []),
    ] },
  };
}