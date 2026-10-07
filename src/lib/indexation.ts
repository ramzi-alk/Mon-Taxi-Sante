import zones from "~/data/seo/indexable-zones.json";

const indexableDepartments = new Set<string>(zones.departmentSlugs);

// Les pages ville / hôpital / département générées en masse ne sont proposées
// à l'indexation que dans les départements réellement desservis (voir
// src/data/seo/indexable-zones.json) : ailleurs, elles restent accessibles
// mais on ne demande pas à Google de les indexer.
export function isIndexableDepartment(departmentSlug: string | null | undefined): boolean {
  return departmentSlug != null && indexableDepartments.has(departmentSlug);
}

// À étaler dans `meta` d'une route : renvoie [] quand la page est indexable.
export function robotsMetaFor(departmentSlug: string | null | undefined) {
  return isIndexableDepartment(departmentSlug)
    ? []
    : [{ name: "robots", content: "noindex, follow" }];
}
