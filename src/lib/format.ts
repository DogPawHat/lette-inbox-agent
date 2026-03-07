export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-IE", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatLongDateTime(value: string) {
  return new Intl.DateTimeFormat("en-IE", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatCostRange(min?: number | null, max?: number | null) {
  if (min == null && max == null) {
    return "No estimate";
  }

  if (min != null && max != null) {
    return `EUR ${min} - ${max}`;
  }

  return `EUR ${min ?? max}`;
}
