/** Converts "" to null and numeric strings to numbers for the API. */
export function toApi<T extends Record<string, unknown>>(values: T, numeric: (keyof T)[] = []) {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(values)) {
    if (v === '' || v === undefined) out[k] = null
    else if (numeric.includes(k as keyof T)) out[k] = Number(v)
    else out[k] = v
  }
  return out
}
