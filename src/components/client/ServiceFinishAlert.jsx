import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { CheckCircle2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { ensureNotificationPermission, notifyClient } from "@/lib/clientNotifications";

// Alerta sonoro curto via Web Audio (não depende de arquivos externos)
function playBeep() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  } catch (e) {
    /* silencioso */
  }
}

/**
 * Sistema de notificação global (cliente): avisa instantaneamente quando o
 * chaveiro registra o final do atendimento (end_photos) e direciona o cliente
 * para a tela de confirmação e pagamento. Funciona em qualquer página do app
 * — som, vibração, notificação nativa e botão flutuante que leva à Home
 * (que restaura a etapa de confirmação/pagamento).
 */
export default function ServiceFinishAlert() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [pendingFinish, setPendingFinish] = useState(null);
  const notifiedId = useRef(null);

  const accountType = user?.account_type || (user?.role === "admin" ? "admin" : "cliente");
  const isCliente = accountType === "cliente";

  // Encontra e assina a solicitação ativa do cliente que foi finalizada pelo chaveiro
  useEffect(() => {
    if (!isCliente || !user?.id) return;
    ensureNotificationPermission();
    let active = true;
    const load = () =>
      base44.entities.ServiceRequest
        .filter({ created_by_id: user.id }, "-created_date", 20)
        .then((list) => {
          if (!active) return;
          // Serviço finalizado pelo chaveiro (end_photos) e ainda não concluído
          const finished = list.find(
            (r) => r.end_photos?.length > 0 && r.status !== "completed"
          );
          setPendingFinish(finished || null);
        })
        .catch(() => {});
    load();
    const unsub = base44.entities.ServiceRequest.subscribe(() => load());
    return () => {
      active = false;
      unsub();
    };
  }, [isCliente, user?.id]);

  // Dispara a notificação instantânea no momento em que o chaveiro finaliza
  useEffect(() => {
    if (!pendingFinish) return;
    if (notifiedId.current === pendingFinish.id) return;
    notifiedId.current = pendingFinish.id;
    playBeep();
    setTimeout(playBeep, 500);
    if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 200]);
    notifyClient(
      "✅ Serviço concluído!",
      "O chaveiro finalizou o atendimento. Toque para confirmar e pagar."
    );
    // Toast apenas fora da Home — lá o próprio fluxo já redireciona e avisa
    if (location.pathname !== "/") {
      toast({
        title: "✅ Serviço concluído!",
        description: "O chaveiro finalizou o atendimento. Toque para confirmar e pagar.",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingFinish?.id]);

  if (!isCliente || !pendingFinish) return null;
  // Na Home o fluxo já leva à confirmação/pagamento — não mostra o botão flutuante
  if (location.pathname === "/") return null;

  return (
    <button
      onClick={() => navigate("/")}
      className="fixed bottom-20 right-4 left-4 md:left-auto md:right-6 md:bottom-6 z-[60] flex items-center gap-3 px-4 h-14 rounded-2xl bg-emerald-500 text-white font-bold shadow-2xl active:scale-[0.98] transition-all animate-alert-slide"
    >
      <CheckCircle2 className="w-6 h-6 shrink-0" />
      <div className="flex-1 text-left">
        <p className="text-sm leading-tight">Serviço concluído!</p>
        <p className="text-xs font-medium opacity-90">Toque para confirmar e pagar</p>
      </div>
    </button>
  );
}