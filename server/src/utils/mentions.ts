/**
 * Resolve @mentions in free text to a set of member ids. Pure (no I/O) so it's
 * unit-testable. Supports mentioning by email (`@jo@acme.com`) or by name with
 * whitespace removed (`@JoBloggs`), matched case-insensitively.
 */
export interface MentionMember {
  id: string;
  name: string;
  email: string;
}

export const parseMentions = (
  content: string,
  members: MentionMember[]
): string[] => {
  const tokens = [...content.matchAll(/@([^\s@]+(?:@[^\s]+)?)/g)].map((m) =>
    m[1].toLowerCase()
  );
  if (tokens.length === 0) return [];

  const matched = new Set<string>();
  for (const member of members) {
    const email = member.email.toLowerCase();
    const nameKey = member.name.toLowerCase().replace(/\s+/g, "");
    if (tokens.some((t) => t === email || t === nameKey)) {
      matched.add(member.id);
    }
  }
  return [...matched];
};
