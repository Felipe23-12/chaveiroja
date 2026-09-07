import React from "react";
import { Dices } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateValidCpf, isTestAccountEmail } from "@/lib/cpf";

export default function TestCpfGeneratorButton({ email, onGenerate }) {
  if (!isTestAccountEmail(email)) return null;

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="w-full"
      onClick={() => onGenerate(generateValidCpf())}
    >
      <Dices className="w-4 h-4" />
      Gerar CPF de teste
    </Button>
  );
}