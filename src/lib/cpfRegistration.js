import { base44 } from "@/api/base44Client";

export async function claimCpf(cpf) {
  try {
    const response = await base44.functions.invoke("claimCpf", { cpf });
    if (!response.data?.linked) throw new Error("Não foi possível vincular o CPF. Se você já tem uma conta, entre nela e exclua-a antes de se cadastrar com outro tipo de perfil.");
    // Recebimento não significa vínculo: não avance o cadastro sem persistência.
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