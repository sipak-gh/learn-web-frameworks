export function formatPrice(cents: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)
}

// Exported but never imported: tree shaking should leave it out of every bundle.
export function formatReport(rows: readonly string[]): string {
  return `UNUSED REPORT\n${rows.join('\n')}`
}
