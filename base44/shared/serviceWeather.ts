const cache = new Map();
async function weatherJson(url, headers = {}) {
  let timer;
  try {
    const response = await Promise.race([fetch(url, { headers }), new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Tempo limite do clima')), 5000); })]);
    if (!response.ok) throw new Error(`Consulta climática HTTP ${response.status}`);
    return await response.json();
  } finally { clearTimeout(timer); }
}
async function weatherReading(lat, lng) {
  try {
    const body = await weatherJson(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=precipitation,weather_code`);
    const rain = body.current?.precipitation, code = body.current?.weather_code;
    if (typeof rain !== 'number' || typeof code !== 'number') throw new Error('Leitura climática ausente');
    return { rain, storm: [95, 96, 99].includes(code), source: 'Dados de Open-Meteo' };
  } catch {
    // A fonte principal pode limitar o IP compartilhado; usa previsão horária verificada no servidor.
    const body = await weatherJson(`https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${lat}&lon=${lng}`, { 'User-Agent': 'ChaveiroJa/1.0 https://woodoo-quick-lock-link.base44.app' });
    const now = Date.now();
    const slot = (body.properties?.timeseries || []).filter(item => Math.abs(Date.parse(item.time) - now) < 3600000).sort((a, b) => Math.abs(Date.parse(a.time) - now) - Math.abs(Date.parse(b.time) - now))[0];
    const hour = slot?.data?.next_1_hours, rain = hour?.details?.precipitation_amount;
    if (typeof rain !== 'number') throw new Error('Previsão horária indisponível');
    return { rain, storm: String(hour.summary?.symbol_code || '').includes('thunder'), source: 'Dados de MET Norway — previsão da próxima hora' };
  }
}
export async function pricingWeather(lat, lng) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return { key: null, label: 'Clima não consultado: localização indisponível' };
  const latitude = lat.toFixed(2), longitude = lng.toFixed(2), key = `${latitude},${longitude}`, cached = cache.get(key);
  if (cached && cached.until > Date.now()) return cached.value;
  let value;
  try {
    const { rain, storm, source } = await weatherReading(latitude, longitude);
    const level = storm ? 'storm' : rain >= 7.6 ? 'heavy' : rain >= 2.5 ? 'moderate' : rain >= 0.5 ? 'light' : rain > 0 ? 'drizzle' : null;
    const label = ({ storm: 'Tempestade', heavy: 'Chuva forte', moderate: 'Chuva moderada', light: 'Chuva leve', drizzle: 'Garoa' })[level] || 'Sem chuva';
    value = { key: level ? `rain_${level}` : null, label: `${label} · ${source}` };
  } catch (error) {
    console.warn('Consulta climática indisponível:', error.message);
    value = { key: null, label: 'Clima temporariamente indisponível: sem adicional de chuva' };
  }
  if (cache.size >= 200) cache.clear();
  cache.set(key, { value, until: Date.now() + 300000 });
  return value;
}