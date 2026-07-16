export async function hashPin(pin) {
  if (!pin) return ''
  const bytes = new TextEncoder().encode(pin)
  const hash = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(hash)].map(x => x.toString(16).padStart(2,'0')).join('')
}
