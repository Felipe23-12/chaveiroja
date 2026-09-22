export function onlyDigits(value) { return String(value || '').replace(/\D/g, ''); }
export function isValidCpf(value) {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const check = length => {
    let sum = 0;
    for (let index = 0; index < length; index += 1) sum += Number(cpf[index]) * (length + 1 - index);
    const remainder = (sum * 10) % 11;
    return (remainder === 10 ? 0 : remainder) === Number(cpf[length]);
  };
  return check(9) && check(10);
}
export function clientRegistrationComplete(user, trustedCpf) {
  return user?.role === 'admin' || Boolean(user && isValidCpf(trustedCpf) && onlyDigits(user.cpf) === trustedCpf && /^\d{10,11}$/.test(onlyDigits(user.phone)) && String(user.legal_name || user.full_name || '').trim().split(/\s+/).filter(part => part.length >= 2).length >= 2 && user.is_verified === true && user.password_created === true && user.terms_accepted_at);
}