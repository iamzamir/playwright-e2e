/** Matches an element whose whole text is `text` (surrounding whitespace allowed), for `filter({ hasText })`. */
export function exactText(text: string): RegExp {
  return new RegExp(`^\\s*${escapeRegExp(text)}\\s*$`);
}

/** Matches an element whose text starts with `text` (case-sensitive), for `filter({ hasText })`. */
export function textStartingWith(text: string): RegExp {
  return new RegExp(`^\\s*${escapeRegExp(text)}`);
}

/** Matches text that starts with `text` as a whole value, alone or followed by a separator (" - FG desc"), so `FG-01` doesn't match `FG-010`. */
export function textStartingWithValue(text: string): RegExp {
  return new RegExp(`^\\s*${escapeRegExp(text)}(?![\\w-])`);
}

/** Matches an element whose text contains `text` (case-sensitive, like XPath `contains()`), for `filter({ hasText })`. */
export function textContaining(text: string): RegExp {
  return new RegExp(escapeRegExp(text));
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
