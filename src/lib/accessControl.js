// Fonte única de verdade para o papel efetivo do usuário e checagem de acesso
// por papel. Usada tanto pelo menu (Layout.jsx) quanto pelo guard de rota
// (RoleGuard.jsx), para evitar lógicas duplicadas e divergentes.
//
// Papel efetivo: "admin" (admin da plataforma ou account_type admin),
// "chaveiro" ou "cliente". Admin acessa/enxerga tudo.

export function getEffectiveRole(user) {
  if (!user) return "cliente";
  if (user.role === "admin") return "admin";
  const accountType = user.account_type;
  if (accountType === "admin" || accountType === "chaveiro" || accountType === "cliente") {
    return accountType;
  }
  return "cliente";
}

// Admin da plataforma (user.role === "admin") sempre tem acesso.
// Demais contas precisam ter o papel efetivo dentro de allowedRoles.
export function canAccess(user, allowedRoles) {
  const role = getEffectiveRole(user);
  if (role === "admin") return true;
  return Array.isArray(allowedRoles) && allowedRoles.includes(role);
}