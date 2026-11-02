/**
 * @param {number} n
 * @param {string} word
 */
export function plural(n, word) {
  return n === 1 ? word : `${word}s`
}
