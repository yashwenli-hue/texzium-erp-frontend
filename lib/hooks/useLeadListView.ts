"use client";

import { useEffect, useMemo, useState } from "react";
import { useSessionState } from "../ui/sessionState";
import { useLeadSearch } from "./useLeads";
import {
  DEFAULT_LEAD_LIST_VIEW,
  LeadListView,
  sanitizeLeadListView,
  toSearchQuery,
} from "../repository/shared/leadList";

const SEARCH_DEBOUNCE_MS = 300;

/**
 * One lead list's state: what the person chose (kept for the browser tab), the text search
 * sent once typing pauses, and the server's page, total and facets for it.
 */
export function useLeadListView(storageKey: string, pageSize: number, initial: LeadListView = DEFAULT_LEAD_LIST_VIEW) {
  const [view, setView] = useSessionState<LeadListView>(storageKey, initial, sanitizeLeadListView);
  const [debounced, setDebounced] = useState(view.search);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(view.search), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [view.search]);

  const query = useMemo(() => toSearchQuery(view, debounced, pageSize), [view, debounced, pageSize]);
  const search = useLeadSearch(query);

  // A remembered page past the end of a list that got shorter goes back to the last page.
  const { total } = search.result;
  useEffect(() => {
    if (!search.loaded || search.loading) return;
    const last = Math.max(1, Math.ceil(total / pageSize));
    if (view.page > last) setView((v) => ({ ...v, page: last }));
  }, [search.loaded, search.loading, total, pageSize, view.page, setView]);

  // Every change to what is shown goes back to the first page.
  const change = (patch: Partial<Omit<LeadListView, "page">>) => setView((v) => ({ ...v, ...patch, page: 1 }));

  return { view, setView, change, query, ...search, searching: view.search !== debounced };
}
