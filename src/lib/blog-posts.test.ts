import { describe, expect, it } from "vitest";
import blogDates from "~/data/seo/blog-dates.json";
import { blogPosts } from "./blog-posts";

describe("blogPosts", () => {
  it("a une date source pour chaque article, et inversement", () => {
    expect(blogPosts.map((p) => p.slug).sort()).toEqual(Object.keys(blogDates).sort());
  });

  it("n'a aucune date de publication dans le futur", () => {
    const today = new Date().toISOString().slice(0, 10);
    for (const post of blogPosts) {
      expect(post.publishedAtIso <= today).toBe(true);
    }
  });

  it("formate la date d'affichage à partir de la date ISO", () => {
    const post = blogPosts.find((p) => p.slug === "taxi-conventionne-grossesse");
    expect(post?.publishedAtIso).toBe("2026-09-01");
    expect(post?.publishedAt).toBe("1er septembre 2026");
    const older = blogPosts.find((p) => p.slug === "vsl-ou-taxi-conventionne");
    expect(older?.publishedAt).toBe("21 juillet 2026");
  });
});
