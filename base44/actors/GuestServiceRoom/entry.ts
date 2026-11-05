import { Actor } from 'base44:runtime/actors';
export default class GuestServiceRoom extends Actor {
  handleConnect(conn) { conn.reject(4001, 'Atualize a página para continuar no atendimento.'); }
  handleMessage() {}
  handleClose() {}
  handleTick() {}
}
