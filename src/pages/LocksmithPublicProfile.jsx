import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, Star, MessageCircle, MapPin, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { haversineKm, DEFAULT_CENTER, getCustomerLocation } from "@/lib/geo";
import LocksmithCredentialsTabs from "@/components/locksmith/LocksmithCredentialsTabs";
import ReviewsList from "@/components/locksmith/ReviewsList";
import RatingSummary from "@/components/locksmith/RatingSummary";
import { saveLocksmithProfile, getLocksmithProfile } from "@/lib/offlineCache";
import { WifiOff } from "lucide-react";
import useBlockedUsers from "@/hooks/useBlockedUsers";
import ModerationActions from "@/components/moderation/ModerationActions";

export default function LocksmithPublicProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [locksmith, setLocksmith] = useState(null);
  const [center, setCenter] = useState(DEFAULT_CENTER);
  const [offline, setOffline] = useState(false);
  const { blockedIds, loading: blocksLoading } = useBlockedUsers();

  useEffect(() => {
    base44.entities.Locksmith.get(id)
      .then((data) => {
        setLocksmith(data);
        saveLocksmithProfile(data);
      })
      .catch(() => {
        // Sem conexão — usa o perfil armazenado em cache
        const cached = getLocksmithProfile(id);
        if (cached) {
          setLocksmith(cached);
          setOffline(true);
        }
      });
    getCustomerLocation().then(setCenter);
  }, [id]);

  if (!locksmith || blocksLoading) {
    return <div className="p-10 text-center text-muted-foreground">Carregando...</div>;
  }

  if (blockedIds.has(locksmith.created_by_id)) return (
    <div className="max-w-md mx-auto px-4 py-10 space-y-4 text-center">
      <h1 className="font-heading font-bold text-xl">Perfil indisponível</h1>
      <p className="text-sm text-muted-foreground">Este usuário não pode visualizar os dados deste profissional.</p>
      <ModerationActions targetUserId={locksmith.created_by_id} targetType="chaveiro" targetName={locksmith.name} allowReport={false} />
      <Button variant="outline" onClick={() => navigate("/mapa")}>Voltar ao mapa</Button>
    </div>
  );

  const dist = haversineKm(center, { lat: locksmith.lat, lng: locksmith.lng });
  const isLivre = locksmith.work_mode === "livre";

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 md:py-10">
      <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="mb-3">
        <ArrowLeft className="w-5 h-5" />
      </Button>

      {offline && (
        <div className="mb-4 p-3 rounded-lg bg-amber-50 text-amber-700 text-sm flex items-center gap-2">
          <WifiOff className="w-4 h-4 shrink-0" />
          <span>Você está offline. Exibindo o perfil armazenado em cache.</span>
        </div>
      )}

      <div className="flex items-center gap-4 mb-4">
        <div className="w-16 h-16 rounded-full bg-emerald-500 text-white flex items-center justify-center text-2xl font-semibold">
          {locksmith.name.charAt(0)}
        </div>
        <div className="flex-1">
          <h1 className="font-heading font-bold text-xl text-foreground">{locksmith.name}</h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>· {locksmith.specialty}</span>
          </div>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
            <MapPin className="w-3 h-3" /> {dist} km de você
          </p>
        </div>
      </div>

      <div className="mb-5">
        <RatingSummary rating={locksmith.rating} reviewsCount={locksmith.reviews_count} />
      </div>

      {locksmith.bio && <p className="text-sm text-muted-foreground mb-5">{locksmith.bio}</p>}

      <div className="flex items-center gap-2 mb-4">
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${isLivre ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700"}`}>
          {isLivre ? "Modo Livre" : "Modo Aplicativo"}
        </span>
        {locksmith.online && isLivre && (
          <span className="text-xs text-emerald-600 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> online
          </span>
        )}
      </div>

      <div className="mb-4">
        <ModerationActions targetUserId={locksmith.created_by_id} targetType="chaveiro" targetName={locksmith.name} contextType="chat" locksmithId={locksmith.id} allowReport={false} />
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

      <LocksmithCredentialsTabs locksmith={locksmith} />

      <div className="mt-6">
        <div className="flex items-center gap-2 mb-3">
          <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
          <h2 className="font-heading font-semibold text-foreground">Avaliações de clientes</h2>
          <span className="text-xs text-muted-foreground">({locksmith.reviews_count || 0})</span>
        </div>
        <ReviewsList locksmithId={locksmith.id} />
      </div>
    </div>
  );
}