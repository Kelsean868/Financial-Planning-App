/**
 * The checksum of the harvested life rate book, one implementation for the import script
 * (tools/import-life-rate-book.mjs) and the guard test (core/test/life-rate-import.test.ts).
 * Pure: no I/O, no clock. Real-life-rates spec §5.2.
 */

/** One rate cell as a checksum line: `<product>|<slug>|<series>|<band>|<anb>|<String(rate)>`. */
export function rateLine(
  product: string,
  slug: string,
  series: string,
  band: string,
  anb: string,
  rate: number,
): string {
  return `${product}|${slug}|${series}|${band}|${anb}|${String(rate)}`;
}

/** FNV-1a 32-bit, as 8 lowercase hex digits. */
export function fnv1a32(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

/** FNV-1a 32-bit over the sorted, newline-joined lines. */
export function rateChecksum(lines: readonly string[]): string {
  return fnv1a32([...lines].sort().join("\n"));
}
