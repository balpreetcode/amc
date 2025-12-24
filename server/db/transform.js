function toSerializable(value) {
  if (value instanceof Date) {
    return value.toISOString()
  }
  if (Array.isArray(value)) {
    return value.map((item) => toSerializable(item))
  }
  if (value && typeof value === 'object') {
    const result = {}
    for (const [key, val] of Object.entries(value)) {
      result[key] = toSerializable(val)
    }
    return result
  }
  return value
}

export function serializeEntity(entity) {
  return JSON.stringify(toSerializable(entity))
}

export function parseRow(row) {
  if (!row) return null
  return JSON.parse(row.data)
}
