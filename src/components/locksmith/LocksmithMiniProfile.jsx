import React from "react";
import { useNavigate } from "react-router-dom";
import { Star, User } from "lucide-react";
import { Image } from "@/components/ui/image";

export default function LocksmithMiniProfile({ locksmith }) {
  const navigate = useNavigate();
  if (!locksmith) return null;
  return (
    <div className="flex items-center gap-3 p-4 rounded-2xl bg-white border border-border text-left">
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
        <p className="font-heading font-semibold text-foreground">{locksmith.name}</p>
        <div className="flex items-center gap-1">
          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
          <span className="text-xs font-medium">{locksmith.rating?.toFixed(1)}</span>
          <span className="text-xs text-muted-foreground">· {locksmith.specialty}</span>
        </div>
        <button
          onClick={() => navigate(`/chaveiro/${locksmith.id}`)}
          className="text-xs text-primary font-medium mt-1 inline-flex items-center gap-1"
        >
          <User className="w-3 h-3" /> Ver perfil completo
        </button>
      </div>
    </div>
  );
}