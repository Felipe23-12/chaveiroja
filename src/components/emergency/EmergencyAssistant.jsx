import { useState } from "react";
import { MessageCircle, X } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import useEmergencyAgent from "@/hooks/useEmergencyAgent";
import EmergencyAssistantPanel from "@/components/emergency/EmergencyAssistantPanel";

export default function EmergencyAssistant() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const agent = useEmergencyAgent();
  const accountType = user?.account_type || (user?.role === "admin" ? "admin" : "cliente");
  if (accountType !== "cliente") return null;
  const toggle = () => {
    const next = !open;
    setOpen(next);
    // Inicia a conversa sem bloquear o toque — falhas aparecem no painel,
    // em vez de travar o app no WebView.
    if (next) Promise.resolve(agent.start()).catch(() => {});
  };
  return (
    <>
      {open && <EmergencyAssistantPanel {...agent} onSend={agent.send} onClose={() => setOpen(false)} />}
      <button onClick={toggle} aria-label={open ? "Fechar ajuda de emergência" : "Abrir ajuda de emergência"} className="fixed z-50 right-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] md:bottom-6 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-xl flex items-center justify-center">
        {open ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </button>
    </>
  );
}