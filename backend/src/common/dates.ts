/**
 * Today's date (YYYY-MM-DD) in the server's local timezone, matching
 * Postgres CURRENT_DATE. toISOString() would give the UTC date, which is
 * a day off for IST users between midnight and 05:30.
 */
export function localToday(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}
