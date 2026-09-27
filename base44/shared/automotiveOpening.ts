import { validateVehicleModelYear } from './vehicleModelYears.ts';

export const isMotoSeatOpening = (vehicle) => vehicle?.opening_target === 'moto_seat';

// Seat opening is available to all makes, not limited to the key-making catalog.
export function validateOpeningVehicle(vehicle) {
  if (vehicle?.opening_target && !['car', 'moto_seat'].includes(vehicle.opening_target)) return { valid: false, error: 'Tipo de abertura inválido.' };
  if (!isMotoSeatOpening(vehicle)) return validateVehicleModelYear(vehicle?.make, vehicle?.model, vehicle?.year);
  if (!String(vehicle.make || '').trim() || !String(vehicle.model || '').trim()) return { valid: false, error: 'Informe montadora e modelo da moto.' };
  const year = Number(vehicle.year);
  if (!Number.isInteger(year) || year < 1900 || year > new Date().getFullYear() + 1) return { valid: false, error: 'Informe um ano-modelo válido da moto.' };
  if (vehicle.factory_seat_opening !== true) return { valid: false, error: 'Confirme que a moto possui banco com abertura original de fábrica.' };
  return { valid: true };
}

export function motoSeatRange(settings) {
  return [settings.seat_base_min ?? 150, settings.seat_base_max ?? 300];
}
