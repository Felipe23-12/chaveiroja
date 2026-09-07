import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreditCard, CheckCircle2, AlertCircle } from "lucide-react";
import { cpfError, formatCpf, onlyDigits } from "@/lib/cpf";
import TestCpfGeneratorButton from "@/components/auth/TestCpfGeneratorButton";

// Campo de CPF com validação real dos dígitos verificadores em tempo real.
export default function CpfInput({ value, onChange, email }) {
  const digits = onlyDigits(value);
  const touched = digits.length === 11;
  const error = touched ? cpfError(value) : null;
  const valid = touched && !error;

  return (
    <div className="space-y-2">
      <Label htmlFor="cpf">CPF</Label>
      <div className="relative">
        <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
        <Input
          id="cpf"
          type="text"
          inputMode="numeric"
          placeholder="000.000.000-00"
          value={value}
          onChange={(e) => onChange(formatCpf(e.target.value))}
          className={`pl-10 pr-10 h-12 ${error ? "border-destructive" : valid ? "border-emerald-500" : ""}`}
          required
        />
        {valid && (
          <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
        )}
        {error && (
          <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-destructive" />
        )}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      {valid && <p className="text-xs text-emerald-600">CPF válido</p>}
      <TestCpfGeneratorButton email={email} onGenerate={onChange} />
    </div>
  );
}