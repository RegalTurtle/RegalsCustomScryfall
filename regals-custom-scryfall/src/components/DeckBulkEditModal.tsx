import Modal from "@/components/Modal";
import { Card, CollectionTypeOption, FoilOption } from "@/types";
import { Dispatch, SetStateAction, useState } from "react";

type DeckBulkEditModalProps = {
  show: boolean;
  onClose: () => void;
  deckId: string;
  collectionType: CollectionTypeOption;
  update: number;
  sendUpdate: Dispatch<SetStateAction<number>>;
};

type ParsedDeckLine = {
  lineNumber: number;
  original: string;
  quant: number;
  name: string;
  set: string;
  cn: string;
  foil: FoilOption;
  proxy: boolean;
  tags: string[];
};

type ScryfallCard = {
  name: string;
  set: string;
  collector_number: string;
  finishes: string[];
  image_uris?: { normal: string };
  card_faces?: Array<{
    image_uris?: { normal: string };
    oracle_text?: string;
    colors?: string[];
  }>;
  oracle_text?: string;
  colors?: string[];
  color_identity: string[];
  type_line: string;
  cmc: number;
  object?: string;
  data?: ScryfallCard[];
};

const WUBRG = ["W", "U", "B", "R", "G"];

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function parseTags(rawTags: string): { proxy: boolean; tags: string[] } {
  let proxy = false;
  const tags: string[] = [];
  const tagMatches = rawTags.matchAll(/#([^#]+)/g);

  for (const match of tagMatches) {
    const tag = match[1].trim().replace(/^!+/, "").trim();
    if (!tag) continue;
    if (tag.toLowerCase() === "proxy") {
      proxy = true;
    } else if (!tags.includes(tag)) {
      tags.push(tag);
    }
  }

  return { proxy, tags };
}

function parseDeckList(deckList: string): ParsedDeckLine[] {
  return deckList
    .split(/\r?\n/)
    .map((line, index) => ({ line: line.trim(), lineNumber: index + 1 }))
    .filter(({ line }) => line.length > 0)
    .map(({ line, lineNumber }) => {
      const match = line.match(/^(\d+)\s+(.+)\s+\(([^)]+)\)\s+(\S+)(.*)$/);
      if (!match) {
        throw new Error(`Line ${lineNumber} could not be parsed`);
      }

      const [, quantRaw, name, setRaw, cn, rest] = match;
      const { proxy, tags } = parseTags(rest);

      return {
        lineNumber,
        original: line,
        quant: Number(quantRaw),
        name: name.trim(),
        set: setRaw.toLowerCase(),
        cn,
        foil: rest.includes("*F*") ? "foil" : "nonfoil",
        proxy,
        tags,
      };
    });
}

function getCardImage(card: ScryfallCard): string {
  return card.image_uris?.normal ?? card.card_faces?.[0]?.image_uris?.normal ?? "";
}

function getCardOracle(card: ScryfallCard): string {
  return card.oracle_text ?? card.card_faces?.map(face => face.oracle_text ?? "").join(" // ") ?? "";
}

function getCardColors(card: ScryfallCard): string {
  if (card.colors) {
    return WUBRG.filter(c => card.colors?.includes(c)).join("");
  }

  if (card.card_faces && card.card_faces.length > 0) {
    return card.card_faces
      .map(face => WUBRG.filter(c => face.colors?.includes(c)).join(""))
      .join(" // ");
  }

  return "";
}

async function fetchScryfallCard(parsed: ParsedDeckLine): Promise<ScryfallCard> {
  let res: Response;

  if (parsed.set === "plst") {
    const params = new URLSearchParams({ q: `s:plst cn=${parsed.cn}` });
    res = await fetch(`https://api.scryfall.com/cards/search?${params.toString()}`);
    const data = await res.json();
    if (!res.ok || data.object === "error" || !data.data?.[0]) {
      throw new Error(`Line ${parsed.lineNumber}: ${parsed.name} was not found on Scryfall`);
    }
    return data.data[0];
  }

  res = await fetch(`https://api.scryfall.com/cards/${parsed.set}/${encodeURIComponent(parsed.cn)}`);
  const data = await res.json();
  if (!res.ok || data.object === "error") {
    throw new Error(`Line ${parsed.lineNumber}: ${parsed.name} was not found on Scryfall`);
  }

  return data;
}

function buildCard(parsed: ParsedDeckLine, scryfallCard: ScryfallCard): Card {
  const foil = scryfallCard.finishes.includes(parsed.foil) ? parsed.foil : (scryfallCard.finishes[0] as FoilOption);

  return {
    name: scryfallCard.name,
    quant: parsed.quant,
    set: scryfallCard.set,
    cn: scryfallCard.collector_number,
    foil,
    proxy: parsed.proxy,
    updatedAt: null,
    image: getCardImage(scryfallCard),
    oracle: getCardOracle(scryfallCard),
    tag: parsed.tags,
    color: getCardColors(scryfallCard),
    color_identity: WUBRG.filter(c => scryfallCard.color_identity.includes(c)).join(""),
    type: scryfallCard.type_line,
    cmc: scryfallCard.cmc,
  };
}

export default function DeckBulkEditModal({
  show,
  onClose,
  deckId,
  collectionType,
  update,
  sendUpdate,
}: DeckBulkEditModalProps) {
  const [deckList, setDeckList] = useState("");
  const [overrideDeck, setOverrideDeck] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [status, setStatus] = useState("");
  const [errors, setErrors] = useState<string[]>([]);

  const closeModal = () => {
    if (isImporting) return;
    setStatus("");
    setErrors([]);
    onClose();
  };

  const importDeck = async () => {
    setIsImporting(true);
    setErrors([]);
    setStatus("Parsing decklist...");

    try {
      const parsedLines = parseDeckList(deckList);
      const importErrors: string[] = [];
      const replacementCards: Card[] = [];

      for (let index = 0; index < parsedLines.length; index++) {
        const parsed = parsedLines[index];
        setStatus(`${overrideDeck ? "Preparing" : "Importing"} ${index + 1} of ${parsedLines.length}: ${parsed.name}`);

        try {
          const scryfallCard = await fetchScryfallCard(parsed);
          const card = buildCard(parsed, scryfallCard);
          if (overrideDeck) {
            replacementCards.push(card);
            await wait(75);
            continue;
          }

          const res = await fetch(`/api/collection/${collectionType}/add_card`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(card),
          });

          if (!res.ok) {
            throw new Error(`Line ${parsed.lineNumber}: ${parsed.name} could not be added`);
          }
        } catch (error) {
          importErrors.push(error instanceof Error ? error.message : `Line ${parsed.lineNumber}: ${parsed.name} failed`);
        }

        await wait(75);
      }

      if (overrideDeck) {
        if (importErrors.length > 0) {
          setErrors(importErrors);
          setStatus(`Override cancelled with ${importErrors.length} error(s)`);
          return;
        }

        setStatus("Replacing deck...");
        const res = await fetch(`/api/decks/${deckId}/replace_cards`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ cards: replacementCards }),
        });

        if (!res.ok) {
          throw new Error("Deck could not be replaced");
        }
      }

      setErrors(importErrors);
      setStatus(importErrors.length ? `Imported with ${importErrors.length} error(s)` : overrideDeck ? "Deck replaced" : "Import complete");
      sendUpdate(update + 1);
    } catch (error) {
      setErrors([error instanceof Error ? error.message : "Decklist could not be imported"]);
      setStatus("");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Modal show={show} onClose={closeModal}>
      <div className="w-[85vw] max-w-3xl">
        <h2 className="text-lg font-semibold mb-3">Bulk edit deck</h2>
        <textarea
          value={deckList}
          onChange={(e) => setDeckList(e.target.value)}
          className="w-full h-96 border border-gray-300 rounded px-3 py-2 font-mono text-sm"
          placeholder="1 Sol Ring (SLC) 19 #!Ramp"
          disabled={isImporting}
        />
        <label className="mt-3 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={overrideDeck}
            onChange={(e) => setOverrideDeck(e.target.checked)}
            disabled={isImporting}
            className="h-4 w-4"
          />
          Override deck
        </label>
        {status && <p className="mt-3 text-sm font-medium">{status}</p>}
        {errors.length > 0 && (
          <div className="mt-3 max-h-40 overflow-y-auto rounded border border-red-300 bg-red-50 p-2 text-sm text-red-800">
            {errors.map((error, index) => (
              <p key={index}>{error}</p>
            ))}
          </div>
        )}
        <div className="mt-4 flex gap-2">
          <button
            onClick={importDeck}
            disabled={isImporting || deckList.trim().length === 0}
            className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 disabled:bg-gray-400"
          >
            {isImporting ? "Importing..." : overrideDeck ? "Replace Deck" : "Import Decklist"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
