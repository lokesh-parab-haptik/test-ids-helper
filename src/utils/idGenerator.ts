export function toSnakeCase(str: string) {
  return str
    .replace(/\.jsx?$/, "")
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .toLowerCase();
}

export function toKebabCase(str: string) {
  return str.replace(/_/g, "-");
}
