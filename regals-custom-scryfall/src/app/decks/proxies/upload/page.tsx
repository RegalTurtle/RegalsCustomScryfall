"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getSharedProxyVersions, parseCsvRows, type SharedProxyCard } from "@/utils/proxyCsv";

type ProxyReportItem = {
  card: {
    name: string;
    set: string;
    cn: string;
    image?: string;
  };
};

type CardImageMap = Record<string, string>;

function getCardImage(card: any): string {
  return (
    card?.image_uris?.normal
    ?? card?.image_uris?.large
    ?? card?.image_uris?.border_crop
    ?? card?.card_faces?.[0]?.image_uris?.normal
    ?? card?.card_faces?.[0]?.image_uris?.large
    ?? card?.card_faces?.[0]?.image_uris?.border_crop
    ?? ""
  );
}

export default function ProxyCsvUploadPage() {
  const [proxyReport, setProxyReport] = useState<ProxyReportItem[]>([]);
  const [sharedCards, setSharedCards] = useState<SharedProxyCard[]>([]);
  const [cardImages, setCardImages] = useState<CardImageMap>({});
  const [loadingReport, setLoadingReport] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [scanComplete, setScanComplete] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchProxyReport() {
      try {
        const res = await fetch("/api/decks/proxy_report");
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error ?? "Could not load proxy report");
        }

        setProxyReport(data.proxyReport ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load proxy report");
      } finally {
        setLoadingReport(false);
      }
    }

    fetchProxyReport();
  }, []);

  const handleCsvScan = async () => {
    if (!selectedFile) {
      setError("Please choose a CSV file first.");
      return;
    }

    try {
      setUploading(true);
      setError("");
      setScanComplete(false);
      const csvText = await selectedFile.text();
      const csvRows = parseCsvRows(csvText);
      if (csvRows.length === 0) {
        setSharedCards([]);
        setCardImages({});
        setScanComplete(true);
        return;
      }

      const matches = getSharedProxyVersions(proxyReport, csvRows);
      setSharedCards(matches.sharedCards);

      const nextImages: CardImageMap = {};
      for (const card of matches.sharedCards) {
        for (const version of card.versions) {
          const imageKey = `${version.name}-${version.setCode}-${version.cardNumber}`;
          const lookupRes = await fetch("/api/scryfall/card_lookup", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              name: version.name,
              set: version.setCode,
              cn: version.cardNumber,
            }),
          });
          const lookupData = await lookupRes.json();
          if (lookupRes.ok && lookupData.card) {
            nextImages[imageKey] = getCardImage(lookupData.card);
          }
        }
      }

      setCardImages(nextImages);
      setScanComplete(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read CSV");
      setSharedCards([]);
      setCardImages({});
      setScanComplete(false);
    } finally {
      setUploading(false);
    }
  };

  const handleCsvUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    setSharedCards([]);
    setCardImages({});
    setScanComplete(false);
    setError("");
  };

  return (
    <div className="min-h-screen bg-teal-900 p-6 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm uppercase tracking-wide text-teal-100/75">Proxy report</p>
            <h1 className="text-3xl font-bold">CSV version comparison</h1>
          </div>
          <Link href="/decks/proxies" className="rounded bg-teal-100 px-4 py-2 font-medium text-teal-900 hover:bg-white">
            Back to proxy report
          </Link>
        </div>

        <div className="rounded-lg border border-teal-700 bg-slate-900/50 p-5 shadow-lg">
          <label className="mb-3 block text-sm font-medium text-teal-100">Upload a csv from a list tracker</label>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={handleCsvUpload}
            className="block w-full rounded border border-teal-600 bg-slate-800 px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-teal-600 file:px-3 file:py-2 file:text-white"
          />
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={handleCsvScan}
              disabled={!selectedFile || uploading}
              className="rounded bg-teal-600 px-4 py-2 font-semibold text-white transition hover:bg-teal-500 disabled:cursor-not-allowed disabled:bg-slate-600"
            >
              {uploading ? "Scanning..." : "Scan CSV"}
            </button>
            {uploading && (
              <div className="flex items-center gap-2 text-sm text-teal-100/80">
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Comparing versions and fetching card images...
              </div>
            )}
          </div>
          <p className="mt-2 text-xs text-teal-100/80">
            Expected headers include: List Type, List Name, Collection, Format, Board, Quantity, Card Name, Set Code, Set Name, Card Number, Condition, Printing, Rarity, Language, Price Bought, Date Bought, Parent List Type, Parent List Name, Current Price (tcgplayer_marketsellprice), List Cover Image, Parent List Cover Image
          </p>
        </div>

        {loadingReport && <p className="mt-4 text-sm text-teal-100/75">Loading proxy report...</p>}
        {error && <p className="mt-4 rounded border border-red-400 bg-red-900/40 px-3 py-2 text-sm text-red-100">{error}</p>}

        {!uploading && !error && !scanComplete && !loadingReport && (
          <p className="mt-6 rounded border border-teal-700 bg-slate-900/40 px-4 py-3 text-sm text-teal-100/80">
            Upload a CSV to see which versions are shared with your current proxy report.
          </p>
        )}

        {!uploading && !error && scanComplete && sharedCards.length === 0 && (
          <p className="mt-6 rounded border border-teal-700 bg-slate-900/40 px-4 py-3 text-sm text-teal-100/80">
            Scan complete: no shared versions were found in this CSV.
          </p>
        )}

        <div className="mt-6 space-y-6">
          {sharedCards.map(card => (
            <div key={card.name} className="rounded-lg border border-teal-700 bg-slate-900/60 p-4">
              <h2 className="mb-4 text-xl font-semibold text-white">{card.name}</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {card.versions.map((version, index) => {
                  const imageKey = `${version.name}-${version.setCode}-${version.cardNumber}`;
                  return (
                    <div key={`${version.name}-${version.setCode}-${version.cardNumber}-${index}`} className="rounded bg-slate-800 p-3 shadow">
                      <img
                        src={cardImages[imageKey] || ""}
                        alt={`${version.name} ${version.setCode.toUpperCase()} ${version.cardNumber}`}
                        className="mb-3 h-44 w-full rounded object-contain bg-slate-700"
                      />
                      <p className="text-sm font-semibold text-teal-200">{version.setCode.toUpperCase()} {version.cardNumber}</p>
                      <p className="text-xs text-gray-300">{version.printing || version.setName || "Unknown printing"}</p>
                      <p className="mt-2 text-xs text-gray-400">Qty: {version.quantity || 1}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
