import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  nearestCapital,
  buildRegionalRange,
  SERVICE_REFERENCE_CODE,
} from "@/lib/regionalPricing";

/**
 * Retorna a faixa de valores de referência do serviço para o estado/capital
 * mais próximo do cliente, já ajustada pela distância até a capital.
 * Retorna null quando o serviço não tem tabela de referência (chaves, etc.).
 */
export function useRegionalPriceRange(serviceId, lat, lng) {
  const [regional, setRegional] = useState(null);

  useEffect(() => {
    const code = SERVICE_REFERENCE_CODE[serviceId];
    const near = nearestCapital(lat, lng);
    if (!code || !near) {
      setRegional(null);
      return;
    }
    let active = true;
    base44.entities.PrecoReferencia
      .filter({ capital_slug: near.capital.slug, servico_codigo: code, ativo: true })
      .then((list) => {
        if (!active) return;
        setRegional(buildRegionalRange(list?.[0], near.distanceKm));
      })
      .catch(() => active && setRegional(null));
    return () => { active = false; };
  }, [serviceId, lat, lng]);

  return regional;
}