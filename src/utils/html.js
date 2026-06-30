export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function optionList(items, selected, labeler = (item) => item.name) {
  return items.map((item) => `
    <option value="${escapeHtml(item.id)}" ${item.id === selected ? "selected" : ""}>
      ${escapeHtml(labeler(item))}
    </option>
  `).join("");
}
