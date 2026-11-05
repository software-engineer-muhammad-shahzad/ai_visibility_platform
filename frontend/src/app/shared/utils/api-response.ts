/**
 * Defensive response-parsing primitives shared by every feature's mapper. The Flask API may wrap
 * payloads in an envelope (`{ data: ... }`, `{ profile: ... }`) or return them bare; these helpers
 * accept both and let mappers produce strictly typed models.
 */

export type Rec = Record<string, unknown>;

export const isRec = (v: unknown): v is Rec => typeof v === 'object' && v !== null && !Array.isArray(v);

export const str = (v: unknown): string | null => (typeof v === 'string' && v !== '' ? v : null);

export const num = (v: unknown): number | null => {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) return Number(v);
  return null;
};

export const strArr = (v: unknown): string[] => {
  if (Array.isArray(v)) return v.filter((x): x is string => typeof x === 'string' && x.trim() !== '');
  if (typeof v === 'string') return v.split(',').map((s) => s.trim()).filter(Boolean);
  return [];
};

/** Finds the object payload, looking through common envelope keys. */
export function unwrapObject(res: unknown, keys: string[]): Rec {
  if (!isRec(res)) return {};
  for (const k of keys) {
    if (isRec(res[k])) return res[k] as Rec;
  }
  if (isRec(res['data'])) return unwrapObject(res['data'], keys);
  return res;
}

/** Finds the array payload, looking through common envelope keys. */
export function unwrapList(res: unknown, keys: string[]): unknown[] {
  if (Array.isArray(res)) return res;
  if (!isRec(res)) return [];
  for (const k of keys) {
    if (Array.isArray(res[k])) return res[k] as unknown[];
  }
  if (res['data'] !== undefined) return unwrapList(res['data'], keys);
  return [];
}
