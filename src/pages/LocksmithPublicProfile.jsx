import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, Star, MessageCircle, MapPin, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { haversineKm, DEFAULT_CENTER, getCustomerLocation } from "@/lib/geo";
import ReviewsList from "@/components/locksmith/ReviewsList";

export default function LocksmithPublicProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [locksmith, setLocksmith] = useState(null);
  const [center, setCenter] = useState(DEFAULT_CENTER);

  useEffect(() => {
    base44.entities.Locksmith.get(id).then(setLocksmith);
    getCustomerLocation().then(setCenter);
  }, [id]);

  if (!locksmith) {
    return <div className="p-10 text-center text-muted-foreground">Carregando...</div>;
  }

  const dist = haversineKm(center, { lat: locksmith.lat, lng: locksmith.lng });
  const isLivre = locksmith.work_mode === "livre";

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 md:py-10">
      <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="mb-3">
        <ArrowLeft className="w-5 h-5" />
      </Button>

      <div className="flex items-center gap-4 mb-5">
        <div className="w-16 h-16 rounded-full bg-emerald-500 text-white flex items-center justify-center text-2xl font-semibold">
          {locksmith.name.charAt(0)}
        </div>
        <div className="flex-1">
          <h1 className="font-heading font-bold text-xl text-foreground">{locksmith.name}</h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" /> {locksmith.rating?.toFixed(1)} ({locksmith.reviews_count || 0})
            </span>
            <span>· {locksmith.specialty}</span>
          </div>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
            <MapPin className="w-3 h-3" /> {dist} km de você
          </p>
        </div>
      </div>

      {locksmith.bio && <p className="text-sm text-muted-foreground mb-5">{locksmith.bio}</p>}

      <div className="flex items-center gap-2 mb-6">
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${isLivre ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700"}`}>
          {isLivre ? "Modo Livre" : "Modo Aplicativo"}
        </span>
        {locksmith.online && isLivre && (
          <span className="text-xs text-emerald-600 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> online
          </span>
        )}
      </div>

      {isLivre ? (
        <Button onClick={() => navigate(`/chat/${locksmith.id}`)} className="w-full mb-6">
          <MessageCircle className="w-4 h-4 mr-2" /> Conversar no chat
        </Button>
      ) : (
        <Button onClick={() => navigate("/")} className="w-full mb-6">
          <Wrench className="w-4 h-4 mr-2" /> Solicitar serviço
        </Button>
      )}

      <h2 className="font-heading font-semibold text-lg text-foreground mb-3">Avaliações dos clientes</h2>
      <ReviewsList locksmithId={locksmith.id} />
    </div>
  );
}