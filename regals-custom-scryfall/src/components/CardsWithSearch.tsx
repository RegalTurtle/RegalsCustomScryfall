import { Card } from "@/types";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import Link from "next/link";

type CollectionType = "bulk" | "cool-cards" | "trade-binder";

type CardsWithSearchProps = {
  update: number;
  sendUpdate: Dispatch<SetStateAction<number>>;
  collection_type: CollectionType;
}

type CardPrice = {
  usd?: string | null;
  usd_foil?: string | null;
  usd_etched?: string | null;
  eur?: string | null;
  tix?: string | null;
};

type FoilOption = "nonfoil" | "foil" | "etched";

type CardDeckUsage = {
  deckId: string;
  deckName: string;
  sectionLabel: string;
  quantity: number;
  proxy: boolean;
  versionLabel: string;
};

const collectionLabels: Record<CollectionType, string> = {
  "bulk": "Bulk Collection",
  "cool-cards": "Cool Cards",
  "trade-binder": "Trade Binder",
};

const CardsWithSearch = ({
  update,
  sendUpdate,
  collection_type
}: CardsWithSearchProps) => {
  const [ cards, setCards ] = useState<Card[]>([]);
  const [ loading, setLoading ] = useState<boolean>(true);
  const [ selectedCard, setSelectedCard ] = useState<Card | null>(null);
  const [ transferQuant, setTransferQuant ] = useState(1);
  const [ transferTarget, setTransferTarget ] = useState<CollectionType>(
    collection_type === "bulk" ? "cool-cards" : "bulk"
  );
  const [ transferring, setTransferring ] = useState(false);
  const [ transferError, setTransferError ] = useState("");
  const [ finishQuant, setFinishQuant ] = useState(1);
  const [ finishTarget, setFinishTarget ] = useState<FoilOption>("foil");
  const [ updatingFinish, setUpdatingFinish ] = useState(false);
  const [ finishError, setFinishError ] = useState("");
  const [ removeQuant, setRemoveQuant ] = useState(1);
  const [ removingCard, setRemovingCard ] = useState(false);
  const [ removeError, setRemoveError ] = useState("");
  const [ cardPrice, setCardPrice ] = useState<CardPrice | null>(null);
  const [ loadingPrice, setLoadingPrice ] = useState(false);
  const [ priceError, setPriceError ] = useState("");
  const [ deckUsages, setDeckUsages ] = useState<CardDeckUsage[]>([]);
  const [ loadingDeckUsages, setLoadingDeckUsages ] = useState(false);
  const [ deckUsageError, setDeckUsageError ] = useState("");

  // Used for the searching of collection
  const [ moxfieldSearch, setMoxfieldSearch ] = useState<string>("");
  const [ debouncedSearch, setDebouncedSearch ] = useState(moxfieldSearch);
  
  useEffect(() => {
    // Set a timer to update debouncedSearch after 500ms of no typing
    const handler = setTimeout(() => {
      setDebouncedSearch(moxfieldSearch);
    }, 500); // 500ms debounce time — adjust as needed

    // Cleanup function clears the timeout if moxfieldSearch changes before 500ms
    return () => clearTimeout(handler);
  }, [moxfieldSearch]);

  useEffect(() => {
    async function fetchCards() {
      try {
        let res;
        if (debouncedSearch.trim() === "") {
          res = await fetch(`/api/collection/${collection_type}/card_page`);
        } else {
          res = await fetch(`/api/collection/${collection_type}/search/${debouncedSearch}`);
        }
        const data = await res.json();
        setCards(data);
      } catch (error) {
        console.error("Failed to fetch cards", error);
      } finally {
        setLoading(false);
      }
    }

    fetchCards();
  }, [update, debouncedSearch]);

  useEffect(() => {
    if (!selectedCard) return;
    setTransferQuant(1);
    setFinishQuant(1);
    setRemoveQuant(1);
    setFinishTarget(selectedCard.foil === "foil" ? "nonfoil" : "foil");
    setTransferTarget(collection_type === "bulk" ? "cool-cards" : "bulk");
    setTransferError("");
    setFinishError("");
    setRemoveError("");
    setDeckUsages([]);
    setDeckUsageError("");
  }, [selectedCard, collection_type]);

  useEffect(() => {
    if (!selectedCard) return;
    const cardToPrice = selectedCard;

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
  }, [selectedCard]);

  useEffect(() => {
    if (!selectedCard) return;
    const cardToFind = selectedCard;

    async function fetchDeckUsages() {
      setLoadingDeckUsages(true);
      setDeckUsages([]);
      setDeckUsageError("");

      try {
        const res = await fetch(`/api/collection/card_deck_usage?name=${encodeURIComponent(cardToFind.name)}`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error ?? "Deck usage unavailable");
        }

        setDeckUsages(data.usages ?? []);
      } catch (error) {
        setDeckUsageError(error instanceof Error ? error.message : "Deck usage unavailable");
      } finally {
        setLoadingDeckUsages(false);
      }
    }

    fetchDeckUsages();
  }, [selectedCard]);

  const displayPrice = () => {
    if (loadingPrice) return "Loading price...";
    if (priceError) return priceError;
    if (!cardPrice) return "Price unavailable";

    if (selectedCard?.foil === "foil" && cardPrice.usd_foil) return `$${cardPrice.usd_foil} foil`;
    if (selectedCard?.foil === "etched" && cardPrice.usd_etched) return `$${cardPrice.usd_etched} etched`;
    if (cardPrice.usd) return `$${cardPrice.usd}`;
    if (cardPrice.usd_foil) return `$${cardPrice.usd_foil} foil`;
    if (cardPrice.usd_etched) return `$${cardPrice.usd_etched} etched`;
    if (cardPrice.eur) return `€${cardPrice.eur}`;
    if (cardPrice.tix) return `${cardPrice.tix} tix`;

    return "Price unavailable";
  };

  const transferCard = async () => {
    if (!selectedCard?._id) return;
    setTransferring(true);
    setTransferError("");

    try {
      const res = await fetch("/api/collection/transfer_card", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fromCollectionType: collection_type,
          toCollectionType: transferTarget,
          cardId: selectedCard._id.toString(),
          quant: transferQuant,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Transfer failed");
      }

      setSelectedCard(null);
      sendUpdate(update + 1);
    } catch (error) {
      setTransferError(error instanceof Error ? error.message : "Transfer failed");
    } finally {
      setTransferring(false);
    }
  };

  const changeFinish = async () => {
    if (!selectedCard?._id) return;
    setUpdatingFinish(true);
    setFinishError("");

    try {
      const res = await fetch("/api/collection/change_foil", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          collectionType: collection_type,
          cardId: selectedCard._id.toString(),
          quant: finishQuant,
          foil: finishTarget,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Finish update failed");
      }

      setSelectedCard(null);
      sendUpdate(update + 1);
    } catch (error) {
      setFinishError(error instanceof Error ? error.message : "Finish update failed");
    } finally {
      setUpdatingFinish(false);
    }
  };

  const removeCard = async () => {
    if (!selectedCard?._id) return;
    setRemovingCard(true);
    setRemoveError("");

    try {
      const res = await fetch("/api/collection/remove_card", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          collectionType: collection_type,
          cardId: selectedCard._id.toString(),
          quant: removeQuant,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Remove failed");
      }

      setSelectedCard(null);
      sendUpdate(update + 1);
    } catch (error) {
      setRemoveError(error instanceof Error ? error.message : "Remove failed");
    } finally {
      setRemovingCard(false);
    }
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div>
      <input
        type="text"
        value={moxfieldSearch}
        onChange={(e) => setMoxfieldSearch(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
          }
        }}
        className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition mb-4"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 justify-items-center">    
        {cards.map((card, index) => (
          <button
            key={index}
            onClick={() => setSelectedCard(card)}
            className="bg-teal-100 rounded-lg shadow-md p-4 w-58 flex flex-col text-left"
          >
            <img src={card.image} alt={card.name} className="w-full h-70 object-contain rounded-lg" />
            <div className="flex-1 flex items-center justify-center">
              <div>
                <h2 className="text-md font-semibold text-black break-words text-center mt-3">{card.name}</h2>
                {card.foil === "foil" && <p className="text-sm font-semibold text-black break-words text-center">Foil</p>}
                {card.foil === "etched" && <p className="text-sm font-semibold text-black break-words text-center">Etched Foil</p>}
                {card.quant > 1 && <p className="text-sm font-semibold text-black break-words text-center">{`x${card.quant}`}</p>}
                {card.proxy && <p className="text-sm font-semibold text-black break-words text-center">Proxy</p>}
              </div>
            </div>
          </button>
        ))}
      </div>

      {selectedCard && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
          onClick={() => setSelectedCard(null)}
        >
          <div
            className="collection-card-modal bg-gray-800 text-white rounded-lg shadow-lg w-[90%] max-w-md max-h-[90vh] overflow-y-auto p-4 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-2 right-2 text-white text-xl cursor-pointer"
              onClick={() => setSelectedCard(null)}
            >
              x
            </button>

            <div className="flex flex-col items-center">
              <img
                src={selectedCard.image}
                alt={selectedCard.name}
                className="w-72 rounded-xl mb-4 shadow"
              />
              <h2 className="text-lg font-semibold mb-1 text-center">{selectedCard.name}</h2>
              <p className="text-sm text-gray-300 mb-4">
                {`${selectedCard.set.toUpperCase()} ${selectedCard.cn} - ${collectionLabels[collection_type]}`}
              </p>
              <p className="mb-4 rounded bg-gray-700 px-3 py-1 text-sm font-semibold">
                {displayPrice()}
              </p>

              <div className="mb-3 w-full rounded bg-gray-700 p-3 text-left">
                <h3 className="mb-2 text-sm font-semibold">Decks</h3>
                {loadingDeckUsages && <p className="text-sm text-gray-300">Checking decks...</p>}
                {!loadingDeckUsages && deckUsageError && <p className="text-sm text-red-300">{deckUsageError}</p>}
                {!loadingDeckUsages && !deckUsageError && deckUsages.length === 0 && (
                  <p className="text-sm text-gray-300">Not currently in any decks.</p>
                )}
                {!loadingDeckUsages && !deckUsageError && deckUsages.length > 0 && (
                  <div className="flex flex-col gap-2">
                    {deckUsages.map((usage, index) => (
                      <Link
                        key={`${usage.deckId}-${usage.sectionLabel}-${usage.versionLabel}-${index}`}
                        href={`/decks/${usage.deckId}`}
                        className="rounded bg-gray-800 px-3 py-2 text-sm hover:bg-gray-900"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold">{usage.deckName}</p>
                            <p className="text-gray-300">{`${usage.sectionLabel} x${usage.quantity}`}</p>
                            <p className="text-gray-300">{usage.versionLabel}</p>
                          </div>
                          <span className={`shrink-0 rounded px-2 py-1 text-xs font-semibold ${usage.proxy ? "bg-yellow-500 text-black" : "bg-emerald-600 text-white"}`}>
                            {usage.proxy ? "Proxy" : "Owned"}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              <div className="w-full rounded bg-gray-700 p-3 flex flex-col gap-2">
                <label className="text-sm">Transfer to:</label>
                <select
                  value={transferTarget}
                  onChange={(e) => setTransferTarget(e.target.value as CollectionType)}
                  className="rounded bg-gray-800 px-2 py-1 text-white"
                >
                  {(Object.keys(collectionLabels) as CollectionType[])
                    .filter(collection => collection !== collection_type)
                    .map(collection => (
                      <option key={collection} value={collection}>
                        {collectionLabels[collection]}
                      </option>
                    ))}
                </select>

                <label className="text-sm">Quantity:</label>
                <input
                  type="number"
                  min={1}
                  max={selectedCard.quant}
                  value={transferQuant}
                  onChange={(e) => setTransferQuant(Math.min(selectedCard.quant, Math.max(1, Number(e.target.value))))}
                  className="rounded bg-gray-800 px-2 py-1 text-white"
                />

                <button
                  onClick={transferCard}
                  disabled={transferring}
                  className="mt-2 w-full bg-purple-800 hover:bg-purple-700 disabled:bg-gray-500 px-4 py-2 rounded"
                >
                  {transferring ? "Transferring..." : "Transfer"}
                </button>
                {transferError && <p className="text-sm text-red-300">{transferError}</p>}
              </div>

              <div className="mt-3 w-full rounded bg-gray-700 p-3 flex flex-col gap-2">
                <label className="text-sm">Change finish to:</label>
                <select
                  value={finishTarget}
                  onChange={(e) => setFinishTarget(e.target.value as FoilOption)}
                  className="rounded bg-gray-800 px-2 py-1 text-white"
                >
                  {(["nonfoil", "foil", "etched"] as FoilOption[])
                    .filter(foil => foil !== selectedCard.foil)
                    .map(foil => (
                      <option key={foil} value={foil}>
                        {foil === "nonfoil" ? "Nonfoil" : foil === "foil" ? "Foil" : "Etched Foil"}
                      </option>
                    ))}
                </select>

                <label className="text-sm">Quantity:</label>
                <input
                  type="number"
                  min={1}
                  max={selectedCard.quant}
                  value={finishQuant}
                  onChange={(e) => setFinishQuant(Math.min(selectedCard.quant, Math.max(1, Number(e.target.value))))}
                  className="rounded bg-gray-800 px-2 py-1 text-white"
                />

                <button
                  onClick={changeFinish}
                  disabled={updatingFinish}
                  className="mt-2 w-full bg-purple-800 hover:bg-purple-700 disabled:bg-gray-500 px-4 py-2 rounded"
                >
                  {updatingFinish ? "Updating..." : "Update Finish"}
                </button>
                {finishError && <p className="text-sm text-red-300">{finishError}</p>}
              </div>

              <div className="mt-3 w-full rounded bg-gray-700 p-3 flex flex-col gap-2">
                <label className="text-sm">Remove quantity:</label>
                <input
                  type="number"
                  min={1}
                  max={selectedCard.quant}
                  value={removeQuant}
                  onChange={(e) => setRemoveQuant(Math.min(selectedCard.quant, Math.max(1, Number(e.target.value))))}
                  className="rounded bg-gray-800 px-2 py-1 text-white"
                />
                <button
                  onClick={removeCard}
                  disabled={removingCard}
                  className="w-full bg-red-700 hover:bg-red-600 disabled:bg-gray-500 px-4 py-2 rounded"
                >
                  {removingCard ? "Removing..." : "Remove Cards"}
                </button>
                {removeError && <p className="mt-2 text-sm text-red-300">{removeError}</p>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CardsWithSearch;
