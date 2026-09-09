export function isFullName(value) {
  return String(value || "").trim().split(/\s+/).filter((part) => part.length >= 2).length >= 2;
}