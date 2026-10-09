import React from "react";
import { Dices } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateValidCpf } from "@/lib/cpf";
import { useAuth } from '@/lib/AuthContext';

export default function TestCpfGeneratorButton({ email, onGenerate }) {
  const { appleReview } = useAuth();
  if (!appleReview?.enabled) return null;

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