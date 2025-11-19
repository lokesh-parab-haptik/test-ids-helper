export function toSnakeCase(str: string) {
  return str
    .replace(/\.[jt]sx?$/, "")
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[-\s]+/g, "_")
    .toLowerCase();
}

export function toKebabCase(str: string) {
  return str.replace(/_/g, "-").toLowerCase();
}
