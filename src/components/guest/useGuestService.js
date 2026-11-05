import { useCallback, useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
const KEY = 'chaveiroja_guest_room';
export default function useGuestService(userId) {
  const room = useRef(null), waiting = useRef(new Map());
  const [snapshot, setSnapshot] = useState(null), [error, setError] = useState(''), [connected, setConnected] = useState(false), [revision, setRevision] = useState(0);
  const send = useCallback((action, body = {}) => new Promise((resolve, reject) => {
    if (!room.current) return reject(new Error('Conecte-se à internet e tente novamente.'));
    const id = crypto.randomUUID();
    const timeout = setTimeout(() => { waiting.current.delete(id); reject(new Error('A resposta demorou. Confira a conexão e tente novamente; seu chamado não será duplicado.')); }, 60000);
    waiting.current.set(id, { resolve, reject, timeout });
    room.current.send({ ...body, id, action });
  }), []);
  const call = useCallback(async (action, body = {}) => {
    if (action !== 'claim') return send(action, body);
    const proof = await send('claim_proof');
    const result = await base44.functions.invoke('claimGuestService', proof);
    if (result.data.error) throw new Error(result.data.error);
    return result.data;
  }, [send]);
  const refresh = useCallback(async () => {
    const result = await call('snapshot'); setSnapshot(result); setError(''); return result;
  }, [call]);
  useEffect(() => {
    let id;
    try { id = localStorage.getItem(KEY); if (!/^[a-f0-9-]{36}$/.test(id || '')) { id = crypto.randomUUID(); localStorage.setItem(KEY, id); } }
    catch { setError('Permita o armazenamento neste navegador para manter acesso privado ao atendimento.'); return; }
    const connection = base44.actors.GuestServiceRoom(id).connect(); room.current = connection;
    const connectTimer = setTimeout(() => setError('Não foi possível conectar ao atendimento. Tente novamente ou entre na sua conta.'), 12000);
    const subscription = connection.subscribe(message => {
      if (!message || typeof message !== 'object') return;
      const msg = /** @type {{type?: string, id?: string, error?: string, code?: string, data?: any}} */ (message);
      if (msg.type === 'ready') { clearTimeout(connectTimer); setConnected(true); refresh().catch(e => setError(e.message)); }
      if (msg.type !== 'result') return;
      const pending = waiting.current.get(msg.id); if (!pending) return;
      clearTimeout(pending.timeout); waiting.current.delete(msg.id);
      if (msg.error) { const err = Object.assign(new Error(msg.error), { code: msg.code }); pending.reject(err); } else pending.resolve(msg.data);
    });
    return () => { clearTimeout(connectTimer); subscription.unsubscribe(); connection.close(); room.current = null; setConnected(false); for (const p of waiting.current.values()) { clearTimeout(p.timeout); p.reject(new Error('Conexão reiniciada. Tente novamente.')); } waiting.current.clear(); };
  }, [userId, revision, refresh]);
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