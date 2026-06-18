import { Card, CollectionTypeOption } from "@/types";
import { Dispatch, SetStateAction, useEffect } from "react";
import { useState } from "react";

type OwnedVersion = Card & {
  _id: string;
  collection: "bulk" | "cool-cards" | "trade-binder";
  collectionLabel: string;
};

type CardPrice = {
  usd?: string | null;
  usd_foil?: string | null;
  usd_etched?: string | null;
  eur?: string | null;
  tix?: string | null;
};

type DeckSection = "cards" | "sideboard" | "maybeboard" | "wishlist";

const deckSectionLabels: Record<DeckSection, string> = {
  cards: "Decklist",
  sideboard: "Sideboard",
  maybeboard: "Physical Maybeboard",
  wishlist: "Online Maybeboard",
};

function getDeckSection(collectionType: CollectionTypeOption): DeckSection {
  const section = collectionType.split("+")[1];

  if (section === "sideboard" || section === "maybeboard" || section === "wishlist") {
    return section;
  }

  return "cards";
}

function displayPrice(card: Card, cardPrice: CardPrice | null, loadingPrice: boolean, priceError: string) {
  if (loadingPrice) return "Loading price...";
  if (priceError) return priceError;
  if (!cardPrice) return "Price unavailable";

  if (card.foil === "foil" && cardPrice.usd_foil) return `$${cardPrice.usd_foil} foil`;
  if (card.foil === "etched" && cardPrice.usd_etched) return `$${cardPrice.usd_etched} etched`;
  if (cardPrice.usd) return `$${cardPrice.usd}`;
  if (cardPrice.usd_foil) return `$${cardPrice.usd_foil} foil`;
  if (cardPrice.usd_etched) return `$${cardPrice.usd_etched} etched`;
  if (cardPrice.eur) return `EUR ${cardPrice.eur}`;
  if (cardPrice.tix) return `${cardPrice.tix} tix`;

  return "Price unavailable";
}

function bellevueKioskSearchUrl(cardName: string) {
  const frontFaceName = cardName.split(" // ")[0].trim();
  return `https://mbhbellevue.mtgkiosk.com/catalog/search?search=header&filter%5Bname%5D=${encodeURIComponent(frontFaceName)}`;
}

export default function CardEditModal({
  card,
  onClose,
  update, 
  sendUpdate,
  deckId,
  collectionType,
}: {
  card: Card;
  onClose: () => void;
  update: number;
  sendUpdate: Dispatch<SetStateAction<number>>;
  deckId: string;
  collectionType: CollectionTypeOption;
}) {
  // Inside CardEditModal
  const [tags, setTags] = useState<string[]>(card.tag ?? []);
  const [newTag, setNewTag] = useState("");
  const [ownedVersions, setOwnedVersions] = useState<OwnedVersion[]>([]);
  const [selectedOwnedVersion, setSelectedOwnedVersion] = useState("");
  const [returnCollection, setReturnCollection] = useState<"bulk" | "cool-cards" | "none">("bulk");
  const [hasLoadedOwnedVersions, setHasLoadedOwnedVersions] = useState(false);
  const [loadingOwnedVersions, setLoadingOwnedVersions] = useState(false);
  const [swapError, setSwapError] = useState("");
  const [removeQuant, setRemoveQuant] = useState(1);
  const [removingCopies, setRemovingCopies] = useState(false);
  const [removeCopiesError, setRemoveCopiesError] = useState("");
  const [moveQuant, setMoveQuant] = useState(1);
  const [moveTargetSection, setMoveTargetSection] = useState<DeckSection>("wishlist");
  const [movingCopies, setMovingCopies] = useState(false);
  const [moveCopiesError, setMoveCopiesError] = useState("");
  const [cardPrice, setCardPrice] = useState<CardPrice | null>(null);
  const [loadingPrice, setLoadingPrice] = useState(false);
  const [priceError, setPriceError] = useState("");
  const sourceSection = getDeckSection(collectionType);
  const moveTargetOptions = (Object.keys(deckSectionLabels) as DeckSection[])
    .filter(section => section !== sourceSection);

  const addTag = async () => {
    if (!newTag.trim() || tags.includes(newTag)) return;
    const updatedTags = [...tags, newTag.trim()];
    const _res = await fetch(`/api/decks/${deckId}/change_tags`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        set: card.set,
        cn: card.cn,
        updatedTags,
        collectionType,
      }),
    });
    setTags(updatedTags);
    setNewTag("");
    sendUpdate(update + 1);
  };

  const loadOwnedVersions = async () => {
    setLoadingOwnedVersions(true);
    setSwapError("");

    try {
      const res = await fetch(`/api/decks/${deckId}/owned_versions?name=${encodeURIComponent(card.name)}`);
      if (!res.ok) throw new Error("Could not load owned copies");
      const { ownedVersions } = await res.json();
      setOwnedVersions(ownedVersions);
      setSelectedOwnedVersion(ownedVersions[0] ? `${ownedVersions[0].collection}|${ownedVersions[0]._id}` : "");
      setReturnCollection(
        ownedVersions[0]?.collection === "bulk" || ownedVersions[0]?.collection === "cool-cards"
          ? ownedVersions[0].collection
          : "none"
      );
      setHasLoadedOwnedVersions(true);
    } catch (error) {
      setSwapError(error instanceof Error ? error.message : "Could not load owned copies");
    } finally {
      setLoadingOwnedVersions(false);
    }
  };

  const replaceCard = async () => {
    if (!selectedOwnedVersion) return;
    const [collection, collectionCardId] = selectedOwnedVersion.split("|");
    setSwapError("");

    try {
      const res = await fetch(`/api/decks/${deckId}/replace_proxy`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          originalSet: card.set,
          originalCn: card.cn,
          collection,
          collectionCardId,
          returnCollection: card.proxy ? undefined : returnCollection,
          deckSection: sourceSection,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Could not replace card");
      }

      sendUpdate(update + 1);
      onClose();
    } catch (error) {
      setSwapError(error instanceof Error ? error.message : "Could not replace card");
    }
  };

  const removeTag = async (tagToRemove: string) => {
    const updatedTags = tags.filter(t => t !== tagToRemove);
    const _res = await fetch(`/api/decks/${deckId}/change_tags`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        set: card.set,
        cn: card.cn,
        updatedTags,
        collectionType,
      }),
    });
    setTags(updatedTags);
    sendUpdate(update + 1);
  };

  const removeCopies = async () => {
    setRemovingCopies(true);
    setRemoveCopiesError("");

    try {
      const res = await fetch(`/api/collection/${collectionType}/add_card`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...card,
          quant: -removeQuant,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Could not remove copies");
      }

      sendUpdate(update + 1);
      onClose();
    } catch (error) {
      setRemoveCopiesError(error instanceof Error ? error.message : "Could not remove copies");
    } finally {
      setRemovingCopies(false);
    }
  };

  const moveCopies = async () => {
    setMovingCopies(true);
    setMoveCopiesError("");

    try {
      const res = await fetch(`/api/decks/${deckId}/move_card`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sourceSection,
          targetSection: moveTargetSection,
          set: card.set,
          cn: card.cn,
          foil: card.foil,
          proxy: card.proxy,
          quant: moveQuant,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Could not move copies");
      }

      sendUpdate(update + 1);
      onClose();
    } catch (error) {
      setMoveCopiesError(error instanceof Error ? error.message : "Could not move copies");
    } finally {
      setMovingCopies(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose(); // Trigger the close function
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    
    return () => {
      window.removeEventListener("keydown", handleKeyDown); // Clean up on unmount
    };
  }, [onClose]);

  useEffect(() => {
    setMoveQuant(1);
    setRemoveQuant(1);
    setMoveCopiesError("");
    setRemoveCopiesError("");
    setCardPrice(null);
    setPriceError("");
    setMoveTargetSection(moveTargetOptions.includes("wishlist") ? "wishlist" : moveTargetOptions[0] ?? "cards");
  }, [card, collectionType]);

  useEffect(() => {
    const cardToPrice = card;

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
            name: cardToPrice.name,
            set: cardToPrice.set,
            cn: cardToPrice.cn,
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
  }, [card]);

  return (
    <div
      className="fixed inset-0 bg-black/70 bg-opacity-60 flex justify-center items-center z-200"
      onClick={onClose}
    >
      <div
        className="collection-card-modal bg-gray-800 text-white rounded-lg shadow-lg w-[90%] max-w-md max-h-[90vh] overflow-y-auto p-4 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="absolute top-2 right-2 text-white text-xl cursor-pointer"
          onClick={onClose}
        >
          ✕
        </button>

        <div className="flex flex-col items-center">
          <img
            src={card.image}
            alt={card.name}
            className="w-72 rounded-xl mb-4 shadow"
          />
          <h2 className="text-lg font-semibold mb-2">{card.name}</h2>
          <p className="mb-3 rounded bg-gray-700 px-3 py-1 text-sm font-semibold">
            {displayPrice(card, cardPrice, loadingPrice, priceError)}
          </p>

          <div className="space-y-2 w-full">
            {card.proxy && (
              <a
                href={bellevueKioskSearchUrl(card.name)}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full rounded bg-sky-700 px-4 py-2 text-center text-sm text-white hover:bg-sky-600"
              >
                Search Bellevue Kiosk
              </a>
            )}
            <div className="w-full">
              <div className="mb-2">
                <label className="block text-sm mb-1">Tags:</label>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <span key={tag} className="bg-gray-600 px-2 py-1 rounded text-sm flex items-center gap-1">
                      {tag}
                      <button onClick={() => removeTag(tag)} className="text-xs text-red-300">✕</button>
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  className="flex-grow px-2 py-1 rounded bg-gray-700 text-white"
                  placeholder="Add a tag..."
                />
                <button
                  onClick={addTag}
                  className="bg-green-700 hover:bg-green-600 px-3 py-1 rounded text-sm"
                >
                  Add
                </button>
              </div>
            </div>
            <div className="w-full rounded bg-gray-700 p-3">
              {ownedVersions.length === 0 ? (
                <div className="flex flex-col gap-2">
                  <button
                    onClick={loadOwnedVersions}
                    disabled={loadingOwnedVersions}
                    className="w-full bg-purple-800 hover:bg-purple-700 disabled:bg-gray-500 px-4 py-2 rounded"
                  >
                    {loadingOwnedVersions ? "Loading..." : "Use Owned Copy"}
                  </button>
                  {hasLoadedOwnedVersions && <p className="text-sm text-gray-300">No owned copies found.</p>}
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <label className="text-sm">Owned copy:</label>
                  <select
                    value={selectedOwnedVersion}
                    onChange={(e) => {
                      setSelectedOwnedVersion(e.target.value);
                      const [selectedCollection] = e.target.value.split("|");
                      if (selectedCollection === "bulk" || selectedCollection === "cool-cards") {
                        setReturnCollection(selectedCollection);
                      } else {
                        setReturnCollection("none");
                      }
                    }}
                    className="rounded bg-gray-800 px-2 py-1 text-white"
                  >
                    {ownedVersions.map((ownedCard) => (
                      <option
                        key={`${ownedCard.collection}|${ownedCard._id}`}
                        value={`${ownedCard.collection}|${ownedCard._id}`}
                      >
                        {`${ownedCard.collectionLabel}: ${ownedCard.set.toUpperCase()} ${ownedCard.cn}${ownedCard.foil !== "nonfoil" ? ` (${ownedCard.foil})` : ""} - ${ownedCard.quant} owned`}
                      </option>
                    ))}
                  </select>
                  {!card.proxy && (
                    <>
                      <label className="text-sm">Return removed card to:</label>
                      <select
                        value={returnCollection}
                        onChange={(e) => setReturnCollection(e.target.value as "bulk" | "cool-cards" | "none")}
                        className="rounded bg-gray-800 px-2 py-1 text-white"
                      >
                        <option value="none">Do not return</option>
                        <option value="bulk">Bulk</option>
                        <option value="cool-cards">Cool Cards</option>
                      </select>
                    </>
                  )}
                  <button
                    onClick={replaceCard}
                    disabled={!selectedOwnedVersion}
                    className="w-full bg-purple-800 hover:bg-purple-700 disabled:bg-gray-500 px-4 py-2 rounded"
                  >
                    Use Owned Copy
                  </button>
                </div>
              )}
              {swapError && <p className="mt-2 text-sm text-red-300">{swapError}</p>}
            </div>
            <div className="w-full rounded bg-gray-700 p-3">
              <div className="flex flex-col gap-2">
                <label className="text-sm">Move copies from {deckSectionLabels[sourceSection]} to:</label>
                <select
                  value={moveTargetSection}
                  onChange={(e) => setMoveTargetSection(e.target.value as DeckSection)}
                  className="rounded bg-gray-800 px-2 py-1 text-white"
                >
                  {moveTargetOptions.map(section => (
                    <option key={section} value={section}>
                      {deckSectionLabels[section]}
                    </option>
                  ))}
                </select>
                <label className="text-sm">Quantity:</label>
                <input
                  type="number"
                  min={1}
                  max={card.quant}
                  value={moveQuant}
                  onChange={(e) => setMoveQuant(Math.min(card.quant, Math.max(1, Number(e.target.value))))}
                  className="rounded bg-gray-800 px-2 py-1 text-white"
                />
                <button
                  onClick={moveCopies}
                  disabled={movingCopies}
                  className="w-full bg-indigo-700 hover:bg-indigo-600 disabled:bg-gray-500 px-4 py-2 rounded"
                >
                  {movingCopies ? "Moving..." : "Move Copies"}
                </button>
              </div>
              {moveCopiesError && <p className="mt-2 text-sm text-red-300">{moveCopiesError}</p>}
            </div>
            <div className="w-full rounded bg-gray-700 p-3">
              <div className="flex flex-col gap-2">
                <label className="text-sm">Remove copies from this section:</label>
                <input
                  type="number"
                  min={1}
                  max={card.quant}
                  value={removeQuant}
                  onChange={(e) => setRemoveQuant(Math.min(card.quant, Math.max(1, Number(e.target.value))))}
                  className="rounded bg-gray-800 px-2 py-1 text-white"
                />
                <button
                  onClick={removeCopies}
                  disabled={removingCopies}
                  className="w-full bg-red-700 hover:bg-red-600 disabled:bg-gray-500 px-4 py-2 rounded"
                >
                  {removingCopies ? "Removing..." : "Remove Copies"}
                </button>
              </div>
              {removeCopiesError && <p className="mt-2 text-sm text-red-300">{removeCopiesError}</p>}
            </div>
            {/* <a
              href={`https://www.cardkingdom.com/catalog/search?search=header&filter[name]=${encodeURIComponent(card.name)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full block text-center bg-indigo-500 hover:bg-indigo-600 px-4 py-2 rounded"
            >
              Buy on Card Kingdom
            </a> */}
          </div>
        </div>
      </div>
    </div>
  );
}
