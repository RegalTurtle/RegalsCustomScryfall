"use client";

import { Card, Deck } from "@/types";
import { useMemo, useState } from "react";

type ExportScope = "all" | "deck" | "sideboard" | "maybeboard" | "wishlist";
type ExportType = "text" | "moxfield";

type DeckExportModalProps = {
  show: boolean;
  onClose: () => void;
  deck: Deck;
};

type ExportOptions = {
  quantityX: boolean;
  setCode: boolean;
  collectorNumber: boolean;
  foilIndicator: boolean;
  categories: boolean;
  colorTagData: boolean;
};

const exportScopes: Array<{ value: ExportScope; label: string }> = [
  { value: "all", label: "All cards" },
  { value: "deck", label: "Deck only" },
  { value: "sideboard", label: "Sideboard" },
  { value: "maybeboard", label: "Physical maybeboard" },
  { value: "wishlist", label: "Online maybeboard" },
];

const exportTypes: Array<{ value: ExportType; label: string }> = [
  { value: "text", label: "Text" },
  { value: "moxfield", label: "Moxfield text" },
];

const optionLabels: Array<{ key: keyof ExportOptions; label: string }> = [
  { key: "quantityX", label: "Include x in quantity" },
  { key: "setCode", label: "Include set code" },
  { key: "collectorNumber", label: "Include collector number" },
  { key: "foilIndicator", label: "Include foil indicator" },
  { key: "categories", label: "Include categories" },
  { key: "colorTagData", label: "Include color tag data" },
];

const defaultOptions: ExportOptions = {
  quantityX: false,
  setCode: true,
  collectorNumber: true,
  foilIndicator: true,
  categories: true,
  colorTagData: false,
};

function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[<>:"/\\|?*]+/g, "").replace(/\s+/g, "-").toLowerCase();
}

function countCards(cards: Card[]): number {
  return cards.reduce((sum, card) => sum + card.quant, 0);
}

function uniqueCardCount(cards: Card[]): number {
  return new Set(cards.map(card => `${card.name}|${card.set}|${card.cn}`)).size;
}

function getScopedCards(deck: Deck, scope: ExportScope, includeOutOfDeck: boolean): Card[] {
  if (scope === "deck") return deck.cards;
  if (scope === "sideboard") return deck.sideboard;
  if (scope === "maybeboard") return deck.maybeboard;
  if (scope === "wishlist") return deck.wishlist;

  return [
    ...deck.cards,
    ...(includeOutOfDeck ? deck.sideboard : []),
    ...(includeOutOfDeck ? deck.maybeboard : []),
    ...(includeOutOfDeck ? deck.wishlist : []),
  ];
}

function formatTag(tag: string): string {
  return `#!${tag.replace(/^!+/, "").trim()}`;
}

function formatCardLine(card: Card, options: ExportOptions): string {
  const parts = [
    `${card.quant}${options.quantityX ? "x" : ""}`,
    card.name,
  ];

  if (options.setCode && card.set) {
    parts.push(`(${card.set.toUpperCase()})`);
  }

  if (options.collectorNumber && card.cn) {
    parts.push(card.cn);
  }

  if (options.foilIndicator && card.foil === "foil") {
    parts.push("*F*");
  }

  if (options.categories && card.tag?.length) {
    parts.push(...card.tag.map(formatTag));
  }

  if (options.colorTagData) {
    parts.push(formatTag(`Color ${card.color_identity || "C"}`));
  }

  return parts.join(" ");
}

export default function DeckExportModal({ show, onClose, deck }: DeckExportModalProps) {
  const [scope, setScope] = useState<ExportScope>("all");
  const [exportType, setExportType] = useState<ExportType>("text");
  const [includeOutOfDeck, setIncludeOutOfDeck] = useState(true);
  const [options, setOptions] = useState<ExportOptions>(defaultOptions);
  const [copied, setCopied] = useState(false);

  const selectedCards = useMemo(
    () => getScopedCards(deck, scope, includeOutOfDeck),
    [deck, scope, includeOutOfDeck]
  );
  const exportText = useMemo(
    () => selectedCards.map(card => formatCardLine(card, options)).join("\n"),
    [selectedCards, options]
  );
  const exampleLine = formatCardLine(
    {
      name: "Example Card",
      quant: 1,
      set: "rex",
      cn: "42",
      foil: "foil",
      proxy: false,
      updatedAt: null,
      image: "",
      oracle: "",
      tag: ["Ramp"],
      color: "G",
      color_identity: "G",
      type: "Creature",
      cmc: 2,
    },
    options
  );

  if (!show) return null;

  const setAllOptions = (checked: boolean) => {
    setOptions({
      quantityX: checked,
      setCode: checked,
      collectorNumber: checked,
      foilIndicator: checked,
      categories: checked,
      colorTagData: checked,
    });
  };

  const copyDecklist = async () => {
    await navigator.clipboard.writeText(exportText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  const downloadDecklist = () => {
    const blob = new Blob([exportText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${sanitizeFileName(deck.name || "decklist")}-${exportType}.txt`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/80 px-3 text-teal-50">
      <div className="w-full max-w-4xl rounded-lg border border-slate-500 bg-neutral-900 p-4 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold">{`Export ${deck.name}`}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded bg-neutral-800 px-3 py-1 text-sm text-white hover:bg-neutral-700"
          >
            Close
          </button>
        </div>

        <div className="space-y-4">
          <label className="block text-sm font-semibold">
            Select cards by
            <select
              value={scope}
              onChange={(event) => setScope(event.target.value as ExportScope)}
              className="mt-1 w-full rounded border border-slate-500 bg-neutral-800 px-3 py-2 font-normal text-white"
            >
              {exportScopes.map(exportScope => (
                <option key={exportScope.value} value={exportScope.value}>{exportScope.label}</option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              checked={includeOutOfDeck}
              onChange={(event) => setIncludeOutOfDeck(event.target.checked)}
              disabled={scope !== "all"}
              className="h-4 w-4"
            />
            Include out of deck cards (eg: maybeboard)
          </label>

          <p className="text-sm font-semibold">
            {`Selected cards: ${countCards(selectedCards)} (${uniqueCardCount(selectedCards)} unique cards)`}
          </p>

          <label className="block text-sm font-semibold">
            Export type
            <select
              value={exportType}
              onChange={(event) => setExportType(event.target.value as ExportType)}
              className="mt-1 w-full rounded border border-slate-500 bg-neutral-800 px-3 py-2 font-normal text-white"
            >
              {exportTypes.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </label>

          <div>
            <p className="text-sm font-semibold">Export options</p>
            <div className="mt-1 rounded border border-slate-500 bg-neutral-800">
              <div className="border-b border-slate-600 bg-neutral-700 px-3 py-2 font-mono text-sm">
                {exampleLine}
              </div>
              <div className="app-scrollbar max-h-64 overflow-y-auto p-3">
                <div className="mb-3 flex flex-col gap-2 border-b border-slate-600 pb-3 text-sm">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={Object.values(options).every(Boolean)}
                      onChange={() => setAllOptions(true)}
                    />
                    Check all
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={Object.values(options).every(value => !value)}
                      onChange={() => setAllOptions(false)}
                    />
                    Uncheck all
                  </label>
                </div>

                <div className="space-y-3">
                  {optionLabels.map(option => (
                    <label key={option.key} className="flex items-center justify-between gap-3 text-sm">
                      <span>{option.label}</span>
                      <input
                        type="checkbox"
                        checked={options[option.key]}
                        onChange={(event) => setOptions(current => ({
                          ...current,
                          [option.key]: event.target.checked,
                        }))}
                        className="h-4 w-4"
                      />
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <textarea
            readOnly
            value={exportText}
            className="app-scrollbar h-48 w-full rounded border border-slate-500 bg-neutral-950 px-3 py-2 font-mono text-xs text-teal-50"
            aria-label="Deck export preview"
          />
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={copyDecklist}
            disabled={exportText.length === 0}
            className="rounded bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-500 disabled:bg-gray-500"
          >
            {copied ? "Copied" : "Copy"}
          </button>
          <button
            type="button"
            onClick={downloadDecklist}
            disabled={exportText.length === 0}
            className="rounded bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-500 disabled:bg-gray-500"
          >
            Download
          </button>
        </div>
      </div>
    </div>
  );
}
