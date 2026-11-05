import { useCallback, useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { normalizeServiceError } from '@/lib/serviceErrors';
async function invokeGuestFunction(name, body) {
  try { return await base44.functions.invoke(name, body); }
  catch (error) { throw normalizeServiceError(error); }
}
const KEY = 'chaveiroja_guest_token_v1';
export default function useGuestService(userId) {
  const token = useRef(null);
  const [snapshot, setSnapshot] = useState(null), [error, setError] = useState(''), [connected, setConnected] = useState(false), [revision, setRevision] = useState(0);
  const send = useCallback(async (action, body = {}) => {
    if (!token.current) throw new Error('Conecte-se à internet e tente novamente.');
    const response = await invokeGuestFunction('guestServiceGateway', { ...body, action, token: token.current });
    if (response.data.error) throw Object.assign(new Error(response.data.error), { code: response.data.code });
    return response.data;
  }, []);
  const call = useCallback(async (action, body = {}) => {
    if (action !== 'claim') return send(action, body);
    const proof = await send('claim_proof');
    const response = await invokeGuestFunction('claimGuestService', proof);
    if (response.data.error) throw new Error(response.data.error);
    return response.data;
  }, [send]);
  const refresh = useCallback(async () => { const result = await call('snapshot'); setSnapshot(result); setError(''); return result; }, [call]);
  useEffect(() => {
    let active = true;
    setConnected(false);
    (async () => {
      let saved;
      try { saved = localStorage.getItem(KEY); }
      catch { throw new Error('Permita o armazenamento neste navegador para manter acesso privado ao atendimento.'); }
      if (!saved) {
        const response = await invokeGuestFunction('guestServiceGateway', { action: 'session' });
        saved = response.data.token;
        if (typeof saved !== 'string') throw new Error('Não foi possível iniciar o atendimento. Tente novamente.');
        if (!active) return;
        try { localStorage.setItem(KEY, saved); }
        catch { throw new Error('Permita o armazenamento neste navegador para continuar.'); }
      }
      if (!active) return;
      token.current = saved;
      const result = await send('snapshot');
      if (active) { setSnapshot(result); setError(''); setConnected(true); }
    })().catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [userId, revision, send]);
  useEffect(() => {
    if (!snapshot?.request || snapshot.claimed) return;
    let running = false;
    const update = async () => { if (document.hidden || running || !navigator.onLine) return; running = true; try { await refresh(); } catch (e) { setError(e.message); } finally { running = false; } };
    const timer = setInterval(update, 20000); window.addEventListener('online', update); document.addEventListener('visibilitychange', update);
    return () => { clearInterval(timer); window.removeEventListener('online', update); document.removeEventListener('visibilitychange', update); };
  }, [snapshot?.request?.id, snapshot?.claimed, refresh]);
  const invoke = useCallback(async (name, body) => {
    if (name === 'googlePlacesAutocomplete') return { data: await call('places', { body }) };
    if (name === 'serviceTrust' && body.action === 'opening_options') return { data: await call('opening_options', { vehicle: body.vehicle }) };
    throw new Error('Esta ação exige sua conta de cliente.');
  }, [call]);
  return { snapshot, setSnapshot, error, connected, call, refresh, invoke, retry: () => { setError(''); setRevision(v => v + 1); } };
}
