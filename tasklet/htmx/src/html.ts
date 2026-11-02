// Escaping, and an `html` tagged template that escapes every value it is
// given unless the value is already markup (the result of another html``).

const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (char) => ESCAPES[char])
}

export class Html {
  readonly value: string
  constructor(value: string) {
    this.value = value
  }
}

type Value = Html | string | number | boolean | null | undefined | Value[]

function render(value: Value): string {
  if (value instanceof Html) return value.value
  if (Array.isArray(value)) return value.map(render).join('')
  if (value === null || value === undefined) return ''
  return escapeHtml(String(value))
}

export function html(strings: TemplateStringsArray, ...values: Value[]): Html {
  let result = strings[0]
  values.forEach((value, index) => {
    result += render(value) + strings[index + 1]
  })
  return new Html(result)
}
