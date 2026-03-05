/**
 * @param {string | Date | null | undefined} date
 * @returns {boolean}
 */
export function isAliveSentinel(date) {
  if (date == null) return false;
  const d = typeof date === "string" ? new Date(date) : date;
  return d.getUTCFullYear() === 9999 && d.getUTCMonth() === 11 && d.getUTCDate() === 31;
}

/**
 * Format death date for display: "Present" if alive (sentinel), otherwise localized date string.
 * @param {string | Date | null | undefined} date
 * @returns {string}
 */
export function formatDeathDate(date) {
  if (date == null) return "Present";
  return isAliveSentinel(date) ? "Present" : new Date(date).toLocaleDateString();
}

/**
 * Format death year for display: "Present" if alive, otherwise year number.
 * @param {string | Date | null | undefined} date
 * @returns {string | number}
 */
export function formatDeathYear(date) {
  if (date == null) return "Present";
  return isAliveSentinel(date) ? "Present" : new Date(date).getFullYear();
}
