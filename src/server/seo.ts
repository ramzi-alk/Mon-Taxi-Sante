import { createServerFn } from "@tanstack/react-start";
import {
  getCommune,
  getNearbyHospitals,
  getCommunesForDepartment,
  searchCommunes,
  type Commune,
  type Hospital,
} from "~/lib/seoData";
import departments from "~/data/seo/departments.json";

const departmentBySlug = new Map(departments.map((d) => [d.slug, d]));

// Ces fonctions serveur gardent communes.json (5509 entrées) et
// hospitals.json (7474 entrées) strictement côté serveur : sans elles, tout
// composant appelant directement ~/lib/seoData embarquerait ces deux gros
// fichiers dans le bundle JS client de sa route (voir ROADMAP-SEO.md).

export const getCityPageDataServerFn = createServerFn({ method: "GET" })
  .validator((input: { department: string; city: string }) => input)
  .handler(
    async ({
      data,
    }): Promise<{ commune: Commune; hospitals: Hospital[] } | null> => {
      const commune = getCommune(data.department, data.city);
      if (!commune) return null;
      return { commune, hospitals: getNearbyHospitals(commune) };
    }
  );

export const getDepartmentPageDataServerFn = createServerFn({ method: "GET" })
  .validator((input: { department: string }) => input)
  .handler(
    async ({
      data,
    }): Promise<{ department: (typeof departments)[number]; communes: Commune[] } | null> => {
      const department = departmentBySlug.get(data.department);
      if (!department) return null;
      return { department, communes: getCommunesForDepartment(data.department) };
    }
  );

export const searchCommunesServerFn = createServerFn({ method: "GET" })
  .validator((input: { query: string; limit?: number }) => input)
  .handler(async ({ data }): Promise<Commune[]> => searchCommunes(data.query, data.limit));
