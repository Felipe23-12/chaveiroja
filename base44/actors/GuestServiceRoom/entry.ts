import { Actor } from 'base44:runtime/actors';
import { secrets } from 'base44:runtime';
export default class GuestServiceRoom extends Actor {
  state = null;
  queue = Promise.resolve();
  async handleStart() { this.state = await this.storage.get('session') || null; }
  save() { return this.storage.put('session', this.state); }
  async handleConnect(conn) {
    if (this.getConnections().length > 4) { conn.reject(4001, 'Muitas abas abertas.'); return; }
    if (!this.state) { this.state = { clientId: 'guest:' + crypto.randomUUID(), expiresAt: new Date(Date.now() + 30*86400000).toISOString(), budgetStart: Date.now(), budgetUsed: 0 }; await this.save(); }
    conn.send({ type: 'ready' });
  }
  handleMessage(conn, message) {
    const task = this.queue.then(() => this.process(conn, message));
    this.queue = task.catch(() => {});
    return task;
  }
  async process(conn, msg) {
    if (!msg || typeof msg !== 'object' || typeof msg.id !== 'string' || msg.id.length > 64 || JSON.stringify(msg).length > 16000) return;
    try {
      if (!this.state || Date.parse(this.state.expiresAt) < Date.now()) throw new Error('O acesso visitante expirou. Entre na sua conta ou contate o atendimento.');
      if (Date.now() - this.state.budgetStart >= 60000) { this.state.budgetStart = Date.now(); this.state.budgetUsed = 0; }
      if (++this.state.budgetUsed > 60) throw new Error('Aguarde um minuto antes de tentar novamente.');
      await this.save();
      // Actors have an anonymous SDK client. The bridge authenticates this
      // server-to-server call with the app secret before using service role.
      const response = await this.client.functions.invoke('guestServiceBridge', {
        _internal_token: secrets.get('INTERNAL_CALL_TOKEN'), state: this.state, command: msg,
        authenticatedUserId: conn.identity?.type === 'authenticated' ? conn.identity.userId : null,
      });
      const result = response.data;
      if (result.error) throw new Error(result.error);
      this.state = result.state;
      await this.save();
      conn.send({ type: 'result', id: msg.id, data: result.data });
    } catch (error) {
      const detail = error?.response?.data || error?.data;
      conn.send({ type: 'result', id: msg.id, error: detail?.error || error.message || 'Não foi possível continuar.', code: detail?.code || error.code });
    }
  }

}