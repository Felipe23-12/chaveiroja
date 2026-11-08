import { useState } from 'react';
import { SERVICE_CATALOG } from '@/lib/pricing';
import { createLock } from '@/lib/locks';
import { validateOpeningVehicle } from '../../../base44/shared/automotiveOpening';
export default function useGuestOpeningForm(contact) {
  const [address, setAddressValue] = useState(''), [location, setLocation] = useState(null), [description, setDescription] = useState('');
  const [context, setContext] = useState({ place_type: '', building: '', unit: '' });
  const [locks, setLocks] = useState([createLock()]), [reason, setReason] = useState(null), [broken, setBroken] = useState(null);
  const [vehicle, setVehicle] = useState({ make: '', model: '', year: '', version: '', opening_method: 'simples', opening_target: 'car' });
  const service = SERVICE_CATALOG.find(s => s.id === contact.service);
  const data = { customer_name: contact.name, phone: contact.phone, terms_accepted: contact.terms, service_type: service?.label, urgency: contact.urgency, address, customer_lat: location?.lat, customer_lng: location?.lng, description, location_context: { ...context, coordinates_confirmed: Boolean(location) }, pricing_inputs: { locks, vehicle, opening_reason: reason, broken_key: broken } };
  const quoteReady = Boolean(location && address.trim() && reason && (service.needsVehicleInfo
    ? validateOpeningVehicle(vehicle).valid
    : typeof broken === 'boolean'));
  const quoteData = {
    service_type: data.service_type,
    urgency: data.urgency,
    address,
    customer_lat: data.customer_lat,
    customer_lng: data.customer_lng,
    location_context: { coordinates_confirmed: Boolean(location) },
    pricing_inputs: data.pricing_inputs,
  };
  const locationIncomplete = !service.needsVehicleInfo && context.place_type === 'condominium'
    && (!context.building.trim() || !context.unit.trim());
  return { service, data, quoteReady, quoteData, locationIncomplete, location, context, setContext, config: { service, address, setAddress: value => { setAddressValue(value); setLocation(null); }, onAddressSelect: place => { setAddressValue(place.address); setLocation({ lat: place.lat, lng: place.lng }); }, description, setDescription, locks, setLocks, openingReason: reason, setOpeningReason: setReason, brokenKeyInLock: broken, setBrokenKeyInLock: setBroken, vehicleInfo: vehicle, setVehicleInfo: setVehicle, selectedOptions: [], toggleOption: () => {}, customAddons: {}, setCustomAddon: () => {}, price: null } };
}