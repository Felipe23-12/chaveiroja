import { base44 } from '@/api/base44Client';

// Sending a review request is not the same as administrative approval.
export default async function submitCpfForReview(cpf) {
  try {
    const { data } = await base44.functions.invoke('claimCpf', { cpf });
    if (!data?.received) throw new Error('Não foi possível enviar a solicitação de CPF.');
    const { data: status } = await base44.functions.invoke('claimCpf', { action: 'status' });
    return status;
  } catch (error) {
    throw new Error(error?.response?.data?.error || error?.message || 'Não foi possível enviar o CPF.');
  }
}