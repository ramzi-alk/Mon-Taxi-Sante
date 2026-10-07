import { describe, expect, it } from "vitest";
import { isIndexableDepartment, robotsMetaFor } from "./indexation";

describe("isIndexableDepartment", () => {
  it.each(["oise", "somme", "paris", "val-d-oise", "seine-et-marne"])("indexe %s", (slug) => {
    expect(isIndexableDepartment(slug)).toBe(true);
  });

  it.each(["nord", "rhone", "bouches-du-rhone"])("n'indexe pas %s", (slug) => {
    expect(isIndexableDepartment(slug)).toBe(false);
  });

  it("n'indexe pas un département inconnu ou absent", () => {
    expect(isIndexableDepartment(null)).toBe(false);
    expect(isIndexableDepartment(undefined)).toBe(false);
  });
});

describe("robotsMetaFor", () => {
  it("n'ajoute rien pour une page indexable", () => {
    expect(robotsMetaFor("oise")).toEqual([]);
  });

  it("ajoute noindex, follow hors zone", () => {
    expect(robotsMetaFor("nord")).toEqual([{ name: "robots", content: "noindex, follow" }]);
  });
});
