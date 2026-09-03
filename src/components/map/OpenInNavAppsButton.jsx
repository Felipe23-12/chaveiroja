import React from "react";
import { Navigation, MapPin } from "lucide-react";

/**
 * Botão para abrir a rota (do prestador até o cliente) em aplicativos
 * de navegação externos: Waze e Google Maps. Em mobile, os deep links
 * abrem o app correspondente; em desktop, abrem a versão web.
 *
 * Props: { from: {lat,lng}, to: {lat,lng}, className? }
 */
export default function OpenInNavAppsButton({ from, to, className = "" }) {
  if (!from?.lat || !to?.lat) return null;

  const wazeUrl = `https://waze.com/ul?ll=${to.lat}%2C${to.lng}&navigate=yes`;
  const gmapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${from.lat},${from.lng}&destination=${to.lat},${to.lng}&travelmode=driving`;

  return (
    <div className={`flex gap-2 ${className}`}>
      <a
        href={wazeUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-1 flex items-center justify-center gap-1.5 h-11 rounded-xl bg-[#33a6db] text-white text-sm font-bold shadow hover:opacity-90 active:scale-95 transition-all"
      >
        <Navigation className="w-4 h-4" /> Waze
      </a>
      <a
        href={gmapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-1 flex items-center justify-center gap-1.5 h-11 rounded-xl bg-[#1a73e8] text-white text-sm font-bold shadow hover:opacity-90 active:scale-95 transition-all"
      >
        <MapPin className="w-4 h-4" /> Google Maps
      </a>
    </div>
  );
}