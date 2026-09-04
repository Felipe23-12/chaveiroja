// Valida chamadas internas de workflows.
//
// Funções disparadas apenas por fluxos automatizados (entity/app_user_auth
// triggers) rodam como service role, sem usuário autenticado. Para impedir que
// um atacante externo acione esses endpoints HTTP públicos diretamente, exigimos
// um token de chamada interna que somente os workflows conhecem. O token é
// passado em args (_internal_token) e verificado aqui — externos não o têm.
export const INTERNAL_CALL_TOKEN = "cj_wf_int_7d2e5a1f9b8c4e30";

export function verifyInternalCall(body) {
  return !!body && body._internal_token === INTERNAL_CALL_TOKEN;
}