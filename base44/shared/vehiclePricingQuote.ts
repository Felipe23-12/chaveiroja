import { secrets } from 'base44:runtime';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function encodeBase64Url(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

function decodeBase64Url(value) {
  const normalized = value.replaceAll('-', '+').replaceAll('_', '/');
  const binary = atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '='));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function normalize(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function safeEqual(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  let result = 0;
  for (let index = 0; index < a.length; index += 1) result |= a.charCodeAt(index) ^ b.charCodeAt(index);
  return result === 0;
}

async function signature(payload) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secrets.get('INTERNAL_CALL_TOKEN')), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const bytes = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  return encodeBase64Url(new Uint8Array(bytes));
}

export async function createVehiclePricingQuote(userId, values) {
  const payload = encodeBase64Url(encoder.encode(JSON.stringify({
    userId,
    make: normalize(values.make),
    model: normalize(values.model),
    year: Number(values.year),
    fipeValue: Number(values.fipeValue),
    keyValue: Number(values.keyValue),
    hasCodedKey: values.hasCodedKey === true,
    expiresAt: Date.now() + 60 * 60 * 1000,
  })));
  return `${payload}.${await signature(payload)}`;
}

export async function verifyVehiclePricingQuote(token, userId, vehicle) {
  const [payload, providedSignature] = String(token || '').split('.');
  if (!payload || !safeEqual(providedSignature, await signature(payload))) throw new Error('Consulta de preço do veículo inválida ou expirada');
  const data = JSON.parse(decoder.decode(decodeBase64Url(payload)));
  if (data.userId !== userId || data.expiresAt < Date.now() || data.make !== normalize(vehicle.make) || data.model !== normalize(vehicle.model) || data.year !== Number(vehicle.year)) {
    throw new Error('Consulta de preço do veículo inválida ou expirada');
  }
  if (!Number.isFinite(data.fipeValue) || data.fipeValue < 1000 || data.fipeValue > 3000000 || !Number.isFinite(data.keyValue) || data.keyValue < 0 || data.keyValue > 20000) {
    throw new Error('Dados de preço do veículo inválidos');
  }
  return data;
}