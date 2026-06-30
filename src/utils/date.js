export function toISODate(date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

export function offsetDate(offset) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return toISODate(date);
}

export function inCurrentMonth(dateString) {
  return dateString.slice(0, 7) === toISODate(new Date()).slice(0, 7);
}

export function formatDate(dateString) {
  return new Date(`${dateString}T00:00:00`).toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "2-digit"
  });
}
