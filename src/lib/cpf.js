// Validação de CPF pelos dígitos verificadores — bloqueia CPFs falsos
// (quantidade errada de dígitos, sequências repetidas e dígitos inválidos).
export function onlyDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

export function isValidCpf(value) {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  const check = (len) => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(cpf[i]) * (len + 1 - i);
    const rest = (sum * 10) % 11;
    return (rest === 10 ? 0 : rest) === Number(cpf[len]);
  };

  return check(9) && check(10);
}

// Mensagem de erro pronta para os formulários (null quando o CPF é válido)
export function cpfError(value) {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11) return "Informe um CPF válido (11 dígitos)";
  if (!isValidCpf(cpf)) return "CPF inválido — confira os números digitados";
  return null;
}

export function formatCpf(value) {
  const cpf = onlyDigits(value).slice(0, 11);
  return cpf
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4");
}