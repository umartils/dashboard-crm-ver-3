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