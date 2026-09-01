import React from "react";
import { Star, MapPin, Clock, Check } from "lucide-react";
import { Image } from "@/components/ui/image";

export default function LocksmithCard({ locksmith, selected, onSelect }) {
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left p-4 rounded-2xl border-2 transition-all flex gap-3 ${
        selected ? "border-primary bg-primary/5" : "border-border bg-white hover:border-primary/40"
      }`}
    >
      <div className="w-14 h-14 rounded-full overflow-hidden bg-muted flex-shrink-0">
        {locksmith.avatar_url ? (
          <Image src={locksmith.avatar_url} alt={locksmith.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground font-semibold">
            {locksmith.name?.charAt(0)}
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="font-heading font-semibold text-foreground truncate">{locksmith.name}</p>
          {selected && <Check className="w-4 h-4 text-primary flex-shrink-0" />}
        </div>
        <div className="flex items-center gap-1 mt-0.5">
          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
          <span className="text-xs font-medium text-foreground">{locksmith.rating?.toFixed(1)}</span>
          <span className="text-xs text-muted-foreground">({locksmith.reviews_count})</span>
          <span className="text-xs text-muted-foreground mx-1">·</span>
          <span className="text-xs text-muted-foreground">{locksmith.specialty}</span>
        </div>
        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3" /> {locksmith.distance_km?.toFixed(1)} km
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" /> ~{locksmith.eta_minutes} min
          </span>
        </div>
      </div>

      <div className="text-right flex-shrink-0">
        <p className="text-xs text-muted-foreground">a partir de</p>
        <p className="font-heading font-bold text-foreground">R$ {locksmith.price_per_call?.toFixed(0)}</p>
      </div>
    </button>
  );
}