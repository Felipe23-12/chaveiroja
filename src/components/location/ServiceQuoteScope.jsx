import React, { createContext, useContext } from 'react';
import useServiceCoverage from '@/hooks/useServiceCoverage';

const CoverageContext = createContext({ allowed: false, location: null, confirmed: false });
export const useServiceQuoteScope = () => useContext(CoverageContext);

export default function ServiceQuoteScope({ location, confirmed = false, children }) {
  const { allowed } = useServiceCoverage(location, confirmed);
  return <CoverageContext.Provider value={{ allowed, location, confirmed }}>{children}</CoverageContext.Provider>;
}