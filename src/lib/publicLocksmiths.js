import { base44 } from '@/api/base44Client';

export async function loadPublicLocksmiths(options = {}) {
  try {
    const { data } = await base44.functions.invoke('serviceTrust', { action: 'public_locksmiths', ...options });
    const items = Array.isArray(data) ? data : data?.items;
    if (!Array.isArray(items)) throw new Error('Resposta de disponibilidade inválida.');
    return items;
  } catch {
    throw new Error('Não foi possível consultar os chaveiros agora. Verifique a conexão e tente novamente.');
  }
}
