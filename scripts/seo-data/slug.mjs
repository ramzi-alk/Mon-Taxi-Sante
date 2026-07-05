// Mirrors src/lib/utils.ts `slugify` — kept in sync manually since this script
// runs standalone with plain Node (no TS/bundler step). If you change one,
// change the other.
export function slugify(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
