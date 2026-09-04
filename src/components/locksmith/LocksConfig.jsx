import React from "react";
import { Plus, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import LockRow from "./LockRow";
import { calculateLocksExtra, createLock } from "@/lib/locks";

/**
 * Permite ao cliente informar quantas portas precisa abrir, o modelo de cada
 * fechadura e em quais delas quer trocar o miolo.
 */
export default function LocksConfig({ locks, setLocks }) {
  const extra = calculateLocksExtra(locks);

  const update = (uid, next) =>
    setLocks((prev) => prev.map((l) => (l.uid === uid ? next : l)));
  const remove = (uid) => setLocks((prev) => prev.filter((l) => l.uid !== uid));
  const add = () => setLocks((prev) => [...prev, createLock()]);

  const mioloCount = locks.filter((l) => l.miolo).length;

  return (
    <div>
      <label className="text-sm font-medium text-foreground mb-1.5 block">
        Fechaduras do atendimento
      </label>
      <p className="text-xs text-muted-foreground mb-2">
        Adicione cada fechadura que precisa ser aberta e escolha o modelo — você pode
        combinar modelos diferentes (ex.: uma tetra e uma simples).
      </p>

      <div className="space-y-2">
        {locks.map((lock, i) => (
          <LockRow
            key={lock.uid}
            lock={lock}
            index={i}
            onChange={(next) => update(lock.uid, next)}
            onRemove={() => remove(lock.uid)}
            canRemove={locks.length > 1}
          />
        ))}
      </div>

      <Button variant="outline" onClick={add} className="w-full mt-2">
        <Plus className="w-4 h-4 mr-1.5" /> Adicionar outra fechadura
      </Button>

      <div className="mt-2.5 flex items-center gap-2 rounded-xl bg-muted p-3 text-xs text-muted-foreground">
        <KeyRound className="w-4 h-4 text-primary shrink-0" />
        <span>
          {locks.length} fechadura{locks.length > 1 ? "s" : ""} para abrir
          {mioloCount > 0 ? ` · ${mioloCount} troca${mioloCount > 1 ? "s" : ""} de miolo` : ""}
          {extra.total > 0 ? ` · adicionais de R$ ${extra.total.toFixed(2)}` : ""}
        </span>
      </div>
    </div>
  );
}