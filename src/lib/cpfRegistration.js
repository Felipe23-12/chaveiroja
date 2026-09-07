import { base44 } from "@/api/base44Client";

export async function claimCpf(cpf) {
  try {
    await base44.functions.invoke("claimCpf", { cpf });
  } catch (error) {
    throw new Error(
      error?.response?.data?.error || error?.message || "Não foi possível validar o CPF"
    );
  }
}