const LINK_PATTERN = /\b(?:(?:https?|ftp):\/\/|www\.)\S+|\bmailto:\S+|\b(?:[a-z0-9-]+\.)+[a-z]{2,63}(?:[/?#]\S*)?/i;

export function containsLink(message = "") {
  return LINK_PATTERN.test(message);
}