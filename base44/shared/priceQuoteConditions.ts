import { loadServicePricing, serviceTypes } from './servicePricingSettings.ts';
import { pricingCalendar } from './servicePricingConditions.ts';
import { pricingWeather } from './serviceWeather.ts';
import { requireServiceCoverage } from './serviceCoverage.ts';

export async function quoteConditionsFingerprint(config, weather, calendar = pricingCalendar(config.values)) {
  const input = JSON.stringify({
    version: config.version, updated_at: config.updated_at,
    settings: config.values,
    calendar: { businessHours: calendar.businessHours, tier: calendar.tier, factors: calendar.factors },
    weather: weather.key,
  });
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function currentQuoteConditions(base44, data) {
  if (!serviceTypes.includes(data.service_type)) throw new Error('Serviço inválido');
  // The check validates coverage but does not fetch requests, locksmiths, FIPE or recalculate prices.
  await requireServiceCoverage(base44, data.customer_lat, data.customer_lng);
  const [config, weather] = await Promise.all([
    loadServicePricing(base44, data.service_type),
    pricingWeather(data.customer_lat, data.customer_lng),
  ]);
  return quoteConditionsFingerprint(config, weather);
}