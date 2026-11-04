"use client";

import { Card } from "@/types";
import { useEffect, useState } from "react";

export function useCardPerformanceMarkers(cards: Card[], deckId?: string) {
  const [enabled, setEnabled] = useState(false);
  const [summaries, setSummaries] = useState<Record<string, { good: number; poor: number; score: number }>>({});
  const cardListKey = cards.map(card => `${card.set}|${card.cn}`).sort().join(",");

  useEffect(() => {
    setEnabled(window.localStorage.getItem("show-card-performance") === "true");
    const onStorage = () => setEnabled(window.localStorage.getItem("show-card-performance") === "true");
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    const uniqueCards = Array.from(new Map(cards.map(card => [`${card.set}|${card.cn}`, { set: card.set, cn: card.cn }])).values());
    if (uniqueCards.length === 0 || !deckId) {
      setSummaries({});
      return;
    }

    const loadSummaries = () => {
      fetch(`/api/card-performance?deckId=${encodeURIComponent(deckId)}&cards=${encodeURIComponent(JSON.stringify(uniqueCards))}`)
        .then(response => response.json())
        .then(data => setSummaries(data.summaries ?? {}))
        .catch(() => setSummaries({}));
    };

    loadSummaries();
    window.addEventListener("card-performance-updated", loadSummaries);
    return () => window.removeEventListener("card-performance-updated", loadSummaries);
  }, [cardListKey, deckId]);

  const toggle = () => {
    const next = !enabled;
    window.localStorage.setItem("show-card-performance", String(next));
    setEnabled(next);
    window.dispatchEvent(new StorageEvent("storage", { key: "show-card-performance", newValue: String(next) }));
  };

  return { enabled, summaries, toggle };
}
