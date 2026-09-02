const LOGIN_ID_PATTERN = /^[a-z0-9][a-z0-9._-]{2,31}$/

export function normalizeLoginId(value: unknown) {
  if (typeof value !== 'string') {
    throw new Error('Invalid login identifier')
  }

  const normalized = value.trim().normalize('NFKC').toLowerCase()

  if (!LOGIN_ID_PATTERN.test(normalized)) {
    throw new Error('Invalid login identifier')
  }

  return normalized
}
