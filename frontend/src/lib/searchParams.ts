export const parseStringArray = (value: unknown): string[] | undefined => {
  if (typeof value === "string") {
    const arr = value.split(",").filter(Boolean)
    return arr.length > 0 ? arr : undefined
  }
  if (Array.isArray(value)) {
    const arr = value.filter(Boolean).map(String)
    return arr.length > 0 ? arr : undefined
  }
  return undefined
}

export const parseBoolean = (value: unknown): boolean | undefined => {
  if (value === "true" || value === true) {
    return true
  }
  return undefined
}

export const parsePositiveNumber = (value: unknown): number | undefined => {
  if (typeof value === "string") {
    const parsed = parseInt(value, 10)
    return !Number.isNaN(parsed) && parsed > 0 ? parsed : undefined
  }
  if (typeof value === "number" && value > 0) {
    return value
  }
  return undefined
}
