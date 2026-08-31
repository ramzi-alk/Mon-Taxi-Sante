import { createServerFn } from "@tanstack/react-start";
import {
  getCommune,
  getCommuneByCodeInsee,
  getNearbyHospitals,
  getNearestHospitalsByDistance,
  getCommunesForDepartment,
  getPopulationRank,
  getNeighboringCommunes,
  searchCommunes,
  searchHospitals,
  getHospital,
  getOtherHospitalsInCommune,
  type Commune,
  type Hospital,
  type NearestHospital,
} from "~/lib/seoData";
import departments from "~/data/seo/departments.json";

const departmentBySlug = new Map(departments.map((d) => [d.slug, d]));

// Ces fonctions serveur gardent communes.json (5509 entrées) et
// hospitals.json (7474 entrées) strictement côté serveur : sans elles, tout
// composant appelant directement ~/lib/seoData embarquerait ces deux gros
// fichiers dans le bundle JS client de sa route (voir ROADMAP-SEO.md).

export const getCityPageDataServerFn = createServerFn({ method: "GET" })
  .inputValidator((input: { department: string; city: string }) => input)
  .handler(
    async ({
      data,
    }): Promise<{
      commune: Commune;
      hospitals: Hospital[];
      populationRank: { rank: number; total: number } | null;
      neighboringCommunes: Commune[];
      nearestHospitals: NearestHospital[];
    } | null> => {
      const commune = getCommune(data.department, data.city);
      if (!commune) return null;
      return {
        commune,
        hospitals: getNearbyHospitals(commune),
        populationRank: getPopulationRank(commune),
        neighboringCommunes: getNeighboringCommunes(commune),
        nearestHospitals: getNearestHospitalsByDistance(commune),
      };
    }
  );

export const getDepartmentPageDataServerFn = createServerFn({ method: "GET" })
  .inputValidator((input: { department: string }) => input)
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
  .inputValidator((input: { query: string; limit?: number }) => input)
  .handler(async ({ data }): Promise<Commune[]> => searchCommunes(data.query, data.limit));

export const getHospitalPageDataServerFn = createServerFn({ method: "GET" })
  .inputValidator((input: { slug: string }) => input)
  .handler(
    async ({
      data,
    }): Promise<{ hospital: Hospital; commune: Commune | null; otherHospitals: Hospital[] } | null> => {
      const hospital = getHospital(data.slug);
      if (!hospital) return null;
      const commune = hospital.codeInseeCommune
        ? getCommuneByCodeInsee(hospital.codeInseeCommune)
        : null;
      return { hospital, commune, otherHospitals: getOtherHospitalsInCommune(hospital) };
    }
  );

export const searchHospitalsServerFn = createServerFn({ method: "GET" })
  .inputValidator((input: { query: string; departmentSlug?: string; limit?: number }) => input)
  .handler(
    async ({ data }): Promise<Hospital[]> =>
      searchHospitals(data.query, { departmentSlug: data.departmentSlug, limit: data.limit })
  );
