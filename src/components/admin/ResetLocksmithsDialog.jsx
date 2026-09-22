import React, { useState } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function ResetLocksmithsDialog({ onReset }) {
  const [open, setOpen] = useState(false), [step, setStep] = useState("password");
  const [password, setPassword] = useState(""), [code, setCode] = useState("");
  const [challenge, setChallenge] = useState(null), [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const run = async (action) => {
    setLoading(true); setError("");
    try {
      const payload = action === "request_confirmation" ? { action, password } : { action, code, challengeId: challenge?.challengeId };
      const response = await base44.functions.invoke("resetLocksmiths", payload);
      if (action === "request_confirmation") { setChallenge(response.data); setStep("code"); }
      else { await onReset?.(); setOpen(false); setStep("password"); setPassword(""); setCode(""); }
    } catch (e) { setError(e?.response?.data?.error || e?.message || "Não foi possível concluir o reset."); }
    finally { setLoading(false); }
  };
  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild><Button variant="destructive" className="gap-2"><Trash2 className="w-4 h-4" />Apagar todos os chaveiros</Button></DialogTrigger>
    <DialogContent>
      <DialogHeader><DialogTitle>Apagar todos os chaveiros?</DialogTitle><DialogDescription>Esta ação é permanente e remove somente os perfis de chaveiros.</DialogDescription></DialogHeader>
      {step === "password" ? <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Senha de reset" /> : <>
        <p className="text-sm text-muted-foreground">Digite o código enviado para felipemotacs1@gmail.com.</p>
        <Input inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} placeholder="Código de 6 dígitos" />
      </>}
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button variant="destructive" disabled={loading || (step === "password" ? !password : code.length !== 6)} onClick={() => run(step === "password" ? "request_confirmation" : "confirm_reset")}>
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}{step === "password" ? "Enviar confirmação por e-mail" : "Confirmar e apagar todos"}
      </Button>
    </DialogContent>
  </Dialog>;
}