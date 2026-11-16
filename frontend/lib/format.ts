export function formatDate(value?: string) {
  if (!value) return "-";
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatLongDate(value?: string) {
  if (!value) return "-";
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function formatMonth(value?: string) {
  if (!value) return "-";
  const [year, month] = value.split("-");
  const monthNames = [
    "Januari", "Februari", "Maret", "April",
    "Mei", "Juni", "Juli", "Agustus",
    "September", "Oktober", "November", "Desember"
  ];
  return `${monthNames[Number(month) - 1]} ${year}`;
}

export function formatNumber(value: number | null) {
  if (value === null || value === undefined) {
    return "-";
  }

  return new Intl.NumberFormat("id-ID").format(value);
}

export function formatDateTime(value: string | null) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));
}