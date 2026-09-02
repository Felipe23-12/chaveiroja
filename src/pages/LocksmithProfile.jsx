import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Briefcase, Check, Loader2, Wallet, Percent, Power } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WORK_MODES, calculateCommission } from "@/lib/pricing";
import LocksmithHistorySummary from "@/components/locksmith/LocksmithHistorySummary";
import MonthlySubscriptionConfig from "@/components/locksmith/MonthlySubscriptionConfig";

export default function LocksmithProfile() {
  const [me, setMe] = useState(null);
  const [myLocksmith, setMyLocksmith] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newProfile, setNewProfile] = useState({ specialty: "Residencial", vehicle: "", bio: "" });

  const selected = myLocksmith;

  // Carrega o usuário atual e busca o perfil de chaveiro vinculado (por telefone ou nome)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const user = await base44.auth.me();
        if (cancelled) return;
        setMe(user);
        const list = await base44.entities.Locksmith.list();
        if (cancelled) return;
        const phoneDigits = (user.phone || "").replace(/\D/g, "");
        const mine = list.find((l) => {
          if (phoneDigits && l.phone && l.phone.replace(/\D/g, "") === phoneDigits) return true;
          if (user.full_name && l.name === user.full_name) return true;
          return false;
        });
        setMyLocksmith(mine || null);
      } catch (e) {
        /* ignora */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const reloadMyLocksmith = async () => {
    const list = await base44.entities.Locksmith.list();
    const phoneDigits = (me?.phone || "").replace(/\D/g, "");
    const mine = list.find((l) => {
      if (phoneDigits && l.phone && l.phone.replace(/\D/g, "") === phoneDigits) return true;
      if (me?.full_name && l.name === me.full_name) return true;
      return false;
    });
    setMyLocksmith(mine || null);
  };

  const handleCreateProfile = async () => {
    if (!me) return;
    setCreating(true);
    try {
      await base44.entities.Locksmith.create({
        name: me.full_name || "Chaveiro",
        phone: me.phone || "",
        specialty: newProfile.specialty,
        vehicle: newProfile.vehicle,
        bio: newProfile.bio,
        work_mode: "app",
        available: true,
        online: false,
      });
      await reloadMyLocksmith();
    } catch (e) {
      alert("Erro ao criar perfil: " + (e.message || e));
    } finally {
      setCreating(false);
    }
  };

  const setMode = (mode) => {
    if (!myLocksmith) return;
    setSaving(true);
    base44.entities.Locksmith.update(myLocksmith.id, { work_mode: mode })
      .then((updated) => setMyLocksmith(updated))
      .finally(() => setSaving(false));
  };

  const setCustomPrice = (value) => {
    if (!myLocksmith) return;
    setSaving(true);
    base44.entities.Locksmith.update(myLocksmith.id, { custom_price_base: Number(value) || 0 })
      .then((updated) => setMyLocksmith(updated))
      .finally(() => setSaving(false));
  };

  const updateLocksmith = (data) => {
    if (!myLocksmith) return;
    setSaving(true);
    base44.entities.Locksmith.update(myLocksmith.id, data)
      .then((updated) => setMyLocksmith(updated))
      .finally(() => setSaving(false));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 md:py-10">
      <div className="flex items-center gap-2 mb-6">
        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
          <Briefcase className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="font-heading font-bold text-2xl text-foreground">Modo de Trabalho</h1>
          <p className="text-sm text-muted-foreground">Defina como você atende pelo app</p>
        </div>
      </div>

      {/* Sem perfil de chaveiro vinculado — criação do perfil */}
      {!selected && !loading && (
        <div className="rounded-2xl border border-border bg-white p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-primary" />
            <h2 className="font-heading font-semibold text-lg text-foreground">Crie seu perfil de chaveiro</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Você ainda não tem um perfil de chaveiro vinculado à sua conta. Preencha os dados abaixo para começar a configurar seu modo de trabalho.
          </p>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Especialidade</label>
              <select
                value={newProfile.specialty}
                onChange={(e) => setNewProfile({ ...newProfile, specialty: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm"
              >
                <option value="Residencial">Residencial</option>
                <option value="Automotivo">Automotivo</option>
                <option value="Comercial">Comercial</option>
                <option value="Emergencial">Emergencial</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Veículo</label>
              <Input
                type="text"
                value={newProfile.vehicle}
                onChange={(e) => setNewProfile({ ...newProfile, vehicle: e.target.value })}
                placeholder="Ex: Moto Honda Pop 110i"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Apresentação (opcional)</label>
              <Input
                type="text"
                value={newProfile.bio}
                onChange={(e) => setNewProfile({ ...newProfile, bio: e.target.value })}
                placeholder="Conte um pouco sobre sua experiência..."
              />
            </div>
          </div>
          <Button onClick={handleCreateProfile} disabled={creating || !newProfile.vehicle.trim()} className="w-full">
            {creating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            {creating ? "Criando perfil..." : "Criar perfil e configurar"}
          </Button>
        </div>
      )}

      {selected && (
        <div className="space-y-4">
          {/* Modos */}
          <div className="grid grid-cols-1 gap-3">
            <ModeCard
              mode="livre"
              active={selected.work_mode === "livre"}
              onClick={() => setMode("livre")}
              saving={saving}
            />
            <ModeCard
              mode="app"
              active={selected.work_mode === "app"}
              onClick={() => setMode("app")}
              saving={saving}
            />
          </div>

          {/* Configuração modo livre */}
          {selected.work_mode === "livre" && (
            <div className="space-y-3">
              <div className="rounded-2xl border border-border bg-white p-4 space-y-3">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">
                    Valor base do seu serviço (R$)
                  </label>
                  <Input
                    type="number"
                    value={selected.custom_price_base || ""}
                    onChange={(e) => setCustomPrice(e.target.value)}
                    placeholder="Ex: 150"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Você define o valor. Adicionais (miolo, etc.) somam ao valor base.
                  </p>
                </div>
              </div>

              <MonthlySubscriptionConfig locksmith={selected} onUpdate={updateLocksmith} />
            </div>
          )}

          {/* Configuração modo app */}
          {selected.work_mode === "app" && (
            <div className="rounded-2xl border border-border bg-white p-4 space-y-3">
              <p className="text-sm text-muted-foreground">
                O app calcula o valor ofertado ao cliente conforme serviço, horário e disponibilidade.
                Você recebe o valor do serviço descontada a comissão.
              </p>
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted">
                <div className="flex items-center gap-2">
                  <Percent className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">Comissão do app</span>
                </div>
                <span className="font-semibold text-foreground">15% por serviço</span>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50">
                <p className="text-xs text-muted-foreground">Exemplo: serviço de R$ 150,00</p>
                <div className="flex justify-between text-sm mt-1">
                  <span>Comissão do app (15%)</span>
                  <span className="font-medium text-red-600">- R$ {calculateCommission(150, "app").toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="font-medium">Você recebe</span>
                  <span className="font-bold text-emerald-700">R$ {(150 - calculateCommission(150, "app")).toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Disponibilidade online/offline */}
          <div className="flex items-center justify-between p-4 rounded-2xl border border-border bg-white">
            <div className="flex items-center gap-2">
              <Power className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="font-medium text-foreground">Disponibilidade</p>
                <p className="text-xs text-muted-foreground">
                  {selected.online ? "Online — recebendo solicitações" : "Offline — não recebe solicitações"}
                </p>
              </div>
            </div>
            <Button
              onClick={() => updateLocksmith({ online: !selected.online })}
              variant={selected.online ? "destructive" : "default"}
              size="sm"
              disabled={saving}
            >
              <Power className="w-4 h-4 mr-1.5" /> {selected.online ? "Sair" : "Entrar"}
            </Button>
          </div>

          {/* Histórico e avaliações */}
          <LocksmithHistorySummary locksmithId={selected.id} />
        </div>
      )}
    </div>
  );
}

function ModeCard({ mode, active, onClick, saving }) {
  const config = WORK_MODES[mode];
  const Icon = mode === "livre" ? Wallet : Percent;
  return (
    <button
      onClick={onClick}
      disabled={saving}
      className={`text-left p-4 rounded-2xl border-2 transition-all flex gap-3 ${
        active ? "border-primary bg-primary/5" : "border-border bg-white hover:border-primary/40"
      }`}
    >
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${
        active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
      }`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <p className="font-heading font-semibold text-foreground">{config.label}</p>
          {active && <Check className="w-4 h-4 text-primary" />}
        </div>
        <p className="text-xs text-muted-foreground">{config.description}</p>
        <p className="text-xs font-medium text-foreground mt-1">{config.fee}</p>
      </div>
    </button>
  );
}