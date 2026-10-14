export function connectionStatus(error) {
  return Number(error?.response?.status || error?.status || 0);
}

export function isTemporaryConnectionError(error) {
  const status = connectionStatus(error);
  if (status) return status === 408 || status === 429 || status >= 500;
  return ["ERR_NETWORK", "ECONNABORTED", "ETIMEDOUT"].includes(error?.code) ||
    /failed to fetch|network|conex[aã]o|timeout|timed out|load failed|internet|socket|connection/i.test(String(error?.message || error || ""));
}

/** Só repetir consultas. Gravações precisam de confirmação do resultado antes de repetir. */
export async function retryConnectionRead(read, { attempts = 2, wait = ms => new Promise(resolve => setTimeout(resolve, ms)) } = {}) {
  for (let attempt = 0; ; attempt++) {
    try { return await read(); }
    catch (error) {
      if (!isTemporaryConnectionError(error) || attempt + 1 >= attempts) throw error;
      await wait(400 * (attempt + 1));
    }
  }
}
