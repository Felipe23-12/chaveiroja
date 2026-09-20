const fixedHolidays = new Set(['01-01', '04-21', '05-01', '09-07', '10-12', '11-02', '11-15', '11-20', '12-25']);
function easterDate(year) {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31), day = (h + l - 7 * m + 114) % 31 + 1;
  return new Date(Date.UTC(year, month - 1, day));
}
export function pricingCalendar(settings, now = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short', hour: '2-digit', hourCycle: 'h23' }).formatToParts(now).map(v => [v.type, v.value]));
  const date = `${p.year}-${p.month}-${p.day}`;
  const holiday = fixedHolidays.has(`${p.month}-${p.day}`) || ['01-25', '07-09'].includes(`${p.month}-${p.day}`) || [-47, -2, 60].some(offset => { const d = easterDate(Number(p.year)); d.setUTCDate(d.getUTCDate() + offset); return d.toISOString().slice(0, 10) === date; });
  const weekend = ['Sat', 'Sun'].includes(p.weekday), night = Number(p.hour) < 8 || Number(p.hour) >= 17;
  return { tier: (holiday || weekend ? settings.tier_weekend : night ? settings.tier_night : settings.tier_day) / 100,
    factors: [{ label: holiday ? 'Feriado' : p.weekday === 'Sun' ? 'Domingo' : p.weekday === 'Sat' ? 'Sábado' : 'Dia útil', percent: holiday ? settings.holiday : p.weekday === 'Sun' ? settings.sunday : p.weekday === 'Sat' ? settings.saturday : 0 }, { label: 'Fora do horário comercial', percent: night ? settings.night : 0 }] };
}

export function pricingFactors(settings, supply, demand, urgent, calendar, weather) {
  const ratio = supply ? demand / supply : Infinity;
  const key = !supply ? 'supply_none' : ratio >= 2 ? 'supply_very_high' : ratio >= 1.5 ? 'supply_high' : ratio >= 1 ? 'supply_moderate' : ratio >= 0.5 ? 'supply_balanced' : ratio >= 0.25 ? 'supply_low' : 'supply_abundant';
  const factors = [{ label: `Oferta/demanda (${demand} pedidos / ${supply} chaveiros)`, percent: settings[key] }, { label: 'Urgência', percent: urgent ? settings.urgent : 0 }];
  const raw = factors.reduce((n, f) => n * (1 + f.percent / 100), 1);
  const capped = Math.min(1 + settings.combined_max / 100, Math.max(1 + settings.combined_min / 100, raw));
  if (raw !== capped) factors.push({ label: 'Limite de oferta/demanda e urgência', percent: (capped / raw - 1) * 100 });
  return [...factors, ...calendar.factors, { label: weather.label, percent: weather.key ? settings[weather.key] : 0 }];
}
export function adjustedCharge(base, factors, label) {
  const round = n => Math.round(n * 100) / 100;
  let total = round(base);
  const lines = [{ label, value: total }];
  for (const factor of factors) {
    if (!factor.percent) continue;
    const next = round(total * (1 + factor.percent / 100));
    lines.push({ label: `${factor.label} (${factor.percent >= 0 ? '+' : ''}${Number(factor.percent.toFixed(2))}%)`, value: round(next - total) });
    total = next;
  }
  return { total, lines };
}