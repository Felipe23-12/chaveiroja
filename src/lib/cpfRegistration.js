import { base44 } from "@/api/base44Client";

export async function claimCpf(cpf) {
  try {
    const response = await base44.functions.invoke("claimCpf", { cpf });
    if (!response.data?.received) throw new Error("Não foi possível enviar a solicitação de CPF.");
    const { data: status } = await base44.functions.invoke("claimCpf", { action: "status" });
    if (!status?.linked) throw new Error("Solicitação recebida. A confirmação do CPF depende de análise administrativa com comprovação de titularidade.");
    // Apenas aprovação administrativa permite avançar, nunca o recebimento.
    const user = await base44.auth.me();
    const digits = (value) => String(value || "").replace(/\D/g, "");
    if (!digits(user.cpf) || digits(user.cpf) !== digits(cpf)) {
      throw new Error("Não foi possível concluir o vínculo do CPF. Confira seus dados ou procure o suporte.");
    }
  } catch (error) {
    throw new Error(
      error?.response?.data?.error || error?.message || "Não foi possível validar o CPF"
    );
  }
}