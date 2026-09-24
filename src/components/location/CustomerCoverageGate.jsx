import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import AddressAutocomplete from '@/components/locksmith/AddressAutocomplete';
import CoverageNotice from '@/components/location/CoverageNotice';
import ServiceQuoteScope from '@/components/location/ServiceQuoteScope';
import usePreciseLocation from '@/hooks/usePreciseLocation';
import useServiceCoverage from '@/hooks/useServiceCoverage';

export default function CustomerCoverageGate() {
  const route = useLocation();
  const gps = usePreciseLocation();
  const [selection, setSelection] = useState(() => route.state?.serviceLocation || null);
  const [address, setAddress] = useState('');
  const location = selection || gps.location;
  const confirmed = selection ? Number.isFinite(selection.lat) && Number.isFinite(selection.lng) : gps.status === 'ready' && gps.hasFix;
  const coverage = useServiceCoverage(location, confirmed);
  return <ServiceQuoteScope location={location} confirmed={confirmed}>
    {coverage.allowed ? <Outlet /> : <div className="mx-auto max-w-2xl space-y-4 px-4 py-6">
      <CoverageNotice location={location} known={confirmed} />
      <label className="block text-sm font-medium">Endereço do atendimento</label>
      <AddressAutocomplete value={address} onChange={value => { setAddress(value); setSelection({ lat: null, lng: null }); }} onSelect={({ lat, lng }) => setSelection({ lat, lng })} allowCurrentLocation />
    </div>}
  </ServiceQuoteScope>;
}