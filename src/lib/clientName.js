export function requestCustomerName(value) {
  const name = String(value || '').trim().replace(/\s+/g, ' ');
  return name.length >= 2 && name.length <= 100 && /\p{L}/u.test(name) && !/[\u0000-\u001f\u007f]/.test(name) ? name : '';
}

export function clientNameFromRequest(request) {
  if (request?.customer_name) return request.customer_name;
  const match = String(request?.description || "").match(/Cliente:\s*([^—\n]+)/i);
  return match?.[1]?.trim() || "Cliente";
}