import { createContext, useContext } from 'react';
import { base44 } from '@/api/base44Client';
const defaultInvoke = (name, body) => base44.functions.invoke(name, body);
const ServiceAccessContext = createContext(defaultInvoke);
export const useServiceAccess = () => useContext(ServiceAccessContext);
export default ServiceAccessContext.Provider;