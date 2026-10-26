"use client";

import { useCallback, useEffect, useState } from "react";

import { fetchCatalogSetsList } from "@/lib/catalog/fetch-catalog-sets";

/**
 * Loads playable FAB set names from the neutral catalog API (`GET /api/catalog/sets`).
 */
export function useCatalogFabSets() {
  const [sets, setSets] = useState<string[]>([]);
  const [setsLoading, setSetsLoading] = useState(true);

  const loadSets = useCallback(async () => {
    setSetsLoading(true);
    try {
      const r = await fetchCatalogSetsList();
      setSets(r.ok ? r.sets : []);
    } finally {
      setSetsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSets();
  }, [loadSets]);

  return { sets, setsLoading, reloadFabSets: loadSets };
}
