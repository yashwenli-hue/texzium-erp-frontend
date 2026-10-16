import type { FilterGroupConfig } from "../ui/FilterButton";
import type { LeadSearchFacets, FacetCount } from "../../lib/repository/shared/leadSearch";
import { countsOf } from "../../lib/repository/shared/leadSearch";
import { FilterMap } from "../../lib/types/common";
import {
  FOLLOWUP_OPTIONS,
  LEAD_STATUS_ORDER,
  LeadFilterKey,
  filterValueLabel,
} from "../../lib/repository/shared/leadList";

const TITLE: Record<LeadFilterKey, string> = {
  status: "Status",
  assignment: "Assignment",
  presales: "Pre-sales by",
  sales: "Sales owner",
  followup: "Follow-up",
  lastCall: "Last call",
  source: "Source",
  country: "Country",
  state: "State",
  city: "City",
};

/**
 * Filter dropdowns for a lead list from the server's facets: the values that exist among
 * the leads the person may see, each with how many leads choosing it gives, in a useful
 * order. A value already chosen stays offered even when it now counts 0.
 */
export function leadFilterGroups(facets: LeadSearchFacets, filters: FilterMap, keys: readonly LeadFilterKey[]): FilterGroupConfig[] {
  const names: Record<string, string> = {};
  for (const p of [...facets.presales, ...facets.sales]) names[p.value] = p.name;
  const facetOf: Record<LeadFilterKey, FacetCount[]> = {
    status: facets.status,
    assignment: facets.assignment,
    presales: facets.presales,
    sales: facets.sales,
    followup: facets.followup,
    lastCall: facets.lastCall,
    source: facets.source,
    country: facets.country,
    state: facets.state,
    city: facets.city,
  };
  return keys
    .map((key) => {
      const facet = facetOf[key];
      const chosen = ([] as string[]).concat(filters[key] ?? []);
      let options = [...new Set([...facet.map((f) => f.value), ...chosen])];
      if (key === "status") options.sort((a, b) => LEAD_STATUS_ORDER.indexOf(a as never) - LEAD_STATUS_ORDER.indexOf(b as never));
      else if (key === "followup") options = FOLLOWUP_OPTIONS.filter((o) => options.includes(o));
      else if (key === "assignment") options = ["assigned", "unassigned"].filter((o) => options.includes(o));
      else if (key === "lastCall") options = ["CNC", "CONNECTED", "NONE"].filter((o) => options.includes(o));
      else options.sort((a, b) => filterValueLabel(key, a, names).localeCompare(filterValueLabel(key, b, names)));
      return {
        key,
        label: TITLE[key],
        options,
        labels: Object.fromEntries(options.map((o) => [o, filterValueLabel(key, o, names)])),
        counts: countsOf(facet),
      };
    })
    .filter((g) => g.options.length > 0);
}
