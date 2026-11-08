/** Normalize Mongolian mobile numbers for deduplication. */
export function normalizeMongolianPhone(input: string): string | null {
  const digits = input.replace(/[^0-9]/g, "");
  const local = digits.startsWith("976") && digits.length === 11 ? digits.slice(3) : digits;
  if (!/^\d{8}$/.test(local)) return null;
  return `+976${local}`;
}
