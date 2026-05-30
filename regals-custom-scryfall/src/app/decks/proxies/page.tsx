"use client";

import RegalsMagicHeader from "@/components/RegalsMagicHeader";
import { Card } from "@/types";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type OwnedCollection = "bulk" | "cool-cards" | "trade-binder";

type ProxyReportCard = Omit<Card, "_id" | "updatedAt"> & {
  _id?: string;
  updatedAt: string | null;
  collection?: OwnedCollection;
  collectionLabel?: string;
};

type ProxyReportItem = {
  card: ProxyReportCard;
  decks: Array<{
    deckId: string;
    deckName: string;
    quantity: number;
  }>;
  ownedCopies: ProxyReportCard[];
  locations: string[];
  totalOwned: number;
  totalProxies: number;
};

type CardPrice = {
  usd?: string | null;
  usd_foil?: string | null;
  usd_etched?: string | null;
  eur?: string | null;
  tix?: string | null;
};

function displayPrice(cardPrice: CardPrice | null, loadingPrice: boolean, priceError: string) {
  if (loadingPrice) return "Loading price...";
  if (priceError) return priceError;
  if (!cardPrice) return "Price unavailable";
  if (cardPrice.usd) return `$${cardPrice.usd}`;
  if (cardPrice.usd_foil) return `$${cardPrice.usd_foil} foil`;
  if (cardPrice.usd_etched) return `$${cardPrice.usd_etched} etched`;
  if (cardPrice.eur) return `EUR ${cardPrice.eur}`;
  if (cardPrice.tix) return `${cardPrice.tix} tix`;

  return "Price unavailable";
}

export default function ProxyReportPage() {
  const [proxyReport, setProxyReport] = useState<ProxyReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState<ProxyReportItem | null>(null);
  const [cardPrice, setCardPrice] = useState<CardPrice | null>(null);
  const [loadingPrice, setLoadingPrice] = useState(false);
  const [priceError, setPriceError] = useState("");

  useEffect(() => {
    async function fetchProxyReport() {
      try {
        const res = await fetch("/api/decks/proxy_report");
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error ?? "Could not load proxy report");
        }

        setProxyReport(data.proxyReport ?? []);
      } catch (error) {
        setError(error instanceof Error ? error.message : "Could not load proxy report");
      } finally {
        setLoading(false);
      }
    }

    fetchProxyReport();
  }, []);

  useEffect(() => {
    if (!selectedItem) return;
    const itemToPrice = selectedItem;

    async function fetchPrice() {
      setLoadingPrice(true);
      setCardPrice(null);
      setPriceError("");

      try {
        const res = await fetch("/api/scryfall/card_lookup", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: itemToPrice.card.name,
            set: itemToPrice.card.set,
            cn: itemToPrice.card.cn,
          }),
        });
        const data = await res.json();

        if (!res.ok || !data.card) {
          throw new Error("Price unavailable");
        }

        setCardPrice(data.card.prices ?? null);
      } catch (error) {
        setPriceError(error instanceof Error ? error.message : "Price unavailable");
      } finally {
        setLoadingPrice(false);
      }
    }

    fetchPrice();
  }, [selectedItem]);

  const filteredProxyReport = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) return proxyReport;

    return proxyReport.filter(item => (
      item.card.name.toLowerCase().includes(normalizedSearch) ||
      item.decks.some(deck => deck.deckName.toLowerCase().includes(normalizedSearch)) ||
      item.locations.some(location => location.toLowerCase().includes(normalizedSearch))
    ));
  }, [proxyReport, search]);

  return (
    <div className="flex min-h-screen flex-col bg-teal-900 text-white">
      <RegalsMagicHeader
        showBack={true}
        backUrl="/decks"
        backText="Decks"
      />

      <main className="flex-1 px-4 text-center justify-items-center">
        <div>
          <div className="mb-4">
            <h1 className="text-2xl mb-4">Deck Proxy Report</h1>
            <p className="text-sm text-teal-100/80">
              {loading ? "Checking decks..." : `${proxyReport.length} proxied card${proxyReport.length === 1 ? "" : "s"} found across your decks`}
            </p>
          </div>

          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition mb-4 text-black"
          />

          {loading && <p>Loading...</p>}
          {error && (
            <p className="mx-auto max-w-xl rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
            </p>
          )}

          {!loading && !error && filteredProxyReport.length === 0 && (
            <p className="mx-auto max-w-xl rounded border border-teal-700/60 px-3 py-4 text-sm text-teal-100/80">
              No proxied cards found.
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 justify-items-center">
            {filteredProxyReport.map(item => (
              <button
                key={`${item.card.name}-${item.card.set}-${item.card.cn}`}
                onClick={() => setSelectedItem(item)}
                className="bg-teal-100 rounded-lg shadow-md p-4 w-58 flex flex-col text-left"
              >
                <img src={item.card.image} alt={item.card.name} className="w-full h-70 object-contain rounded-lg" />
                <div className="flex-1 flex items-center justify-center">
                  <div>
                    <h2 className="text-md font-semibold text-black break-words text-center mt-3">{item.card.name}</h2>
                    <p className="text-sm font-semibold text-black break-words text-center">{`${item.totalProxies} proxy${item.totalProxies === 1 ? "" : "ies"}`}</p>
                    {item.totalOwned > 0 ? (
                      <p className="text-sm font-semibold break-words text-center text-blue-800">
                        {`Owned: ${item.locations.join(" + ")}`}
                      </p>
                    ) : (
                      <p className="text-sm font-semibold break-words text-center text-red-800">Not found</p>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </main>

      {selectedItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
          onClick={() => setSelectedItem(null)}
        >
          <div
            className="collection-card-modal relative max-h-[90vh] w-[90%] max-w-md overflow-y-auto rounded-lg bg-gray-800 p-4 text-white shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute right-2 top-2 cursor-pointer text-xl text-white"
              onClick={() => setSelectedItem(null)}
            >
              x
            </button>

            <div className="flex flex-col items-center">
              <img
                src={selectedItem.card.image}
                alt={selectedItem.card.name}
                className="mb-4 w-72 rounded-xl shadow"
              />
              <h2 className="mb-1 text-center text-lg font-semibold">{selectedItem.card.name}</h2>
              <p className="mb-4 text-sm text-gray-300">
                {`${selectedItem.card.set.toUpperCase()} ${selectedItem.card.cn}`}
              </p>
              <p className="mb-4 rounded bg-gray-700 px-3 py-1 text-sm font-semibold">
                {displayPrice(cardPrice, loadingPrice, priceError)}
              </p>

              <div className="w-full rounded bg-gray-700 p-3 text-left">
                <h3 className="mb-2 text-sm font-semibold">Proxy decks</h3>
                <div className="flex flex-col gap-2">
                  {selectedItem.decks.map(deck => (
                    <Link
                      key={`${deck.deckId}-${deck.deckName}`}
                      href={`/decks/${deck.deckId}`}
                      className="rounded bg-gray-800 px-3 py-2 text-sm hover:bg-gray-600"
                    >
                      {`${deck.deckName} x${deck.quantity}`}
                    </Link>
                  ))}
                </div>
              </div>

              <div className="mt-3 w-full rounded bg-gray-700 p-3 text-left">
                <h3 className="mb-2 text-sm font-semibold">Owned copies</h3>
                {selectedItem.ownedCopies.length === 0 ? (
                  <p className="rounded bg-gray-800 px-3 py-2 text-sm text-gray-300">
                    No owned copies found in Bulk, Cool Cards, or Trade Binder.
                  </p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {selectedItem.ownedCopies.map(copy => (
                      <div key={`${copy.collection}-${copy.set}-${copy.cn}-${copy.foil}`} className="rounded bg-gray-800 px-3 py-2 text-sm">
                        <p className="font-semibold">{copy.collectionLabel}</p>
                        <p>{`${copy.set.toUpperCase()} ${copy.cn} x${copy.quant}`}</p>
                        <p className="text-gray-300">
                          {copy.foil === "nonfoil" ? "Nonfoil" : copy.foil === "foil" ? "Foil" : "Etched Foil"}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
