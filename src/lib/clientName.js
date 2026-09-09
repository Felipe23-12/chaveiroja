export function clientNameFromRequest(request) {
  if (request?.customer_name) return request.customer_name;
  const match = String(request?.description || "").match(/Cliente:\s*([^—\n]+)/i);
  return match?.[1]?.trim() || "Cliente";
}