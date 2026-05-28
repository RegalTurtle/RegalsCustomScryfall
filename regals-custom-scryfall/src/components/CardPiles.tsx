import { Card, CardPile } from "@/types";

const cardKey = (card: Card) => `${card.set}|${card.cn}`;

export default function CardPiles({ 
  piles, 
  setSelectedCard,
  setHoveredCard,
  availableProxyKeys = [],
  availableProxyLocations = {},
}: { 
  piles: CardPile[], 
  setSelectedCard: (card: Card) => void,
  setHoveredCard?: (card: Card) => void,
  availableProxyKeys?: string[],
  availableProxyLocations?: Record<string, string[]>,
}) {
  const cardOffset = 32;
  const cardHeight = 279;
  const availableProxyKeySet = new Set(availableProxyKeys);

  return (
    <div className="w-55 sm:w-107 md:w-159 lg:w-211 xl:w-315 2xl:w-367 mx-auto">
      <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-6 2xl:columns-7 gap-4 p-4">
        {piles.map((pile) => {
          const totalCards = pile.cards.reduce((sum, c) => sum + c.quant, 0);
          const visibleCardCount = pile.cards.length;
          const stackHeight = cardHeight + cardOffset * (visibleCardCount - 1);

          return (
            <div
              key={pile.pileName}
              className="break-inside-avoid mb-6 mx-auto w-[200px]" // Centered and fixed width
            >
              <p className="text-center text-sm mb-2">{`${pile.pileName} (${totalCards})`}</p>

              <div
                className="relative w-full overflow-visible"
                style={{ height: `${stackHeight}px` }}
              >
                {pile.cards.map((card, index) => (
                  <div
                    key={`${card.set}|${card.cn}`}
                    className="group absolute top-0 left-0"
                    style={{
                      transform: `translateY(${index * cardOffset}px)`,
                      zIndex: index,
                      height: `${cardHeight}px`,
                      width: '200px', // or match the card width
                    }}
                  >
                    {card.quant > 1 && (
                      <div
                        className="absolute top-1 right-1 bg-gray-700 text-white text-xs px-1 py-0.5 rounded shadow-md z-10"
                      >
                        {card.quant}
                      </div>
                    )}
                    <img
                      src={card.image}
                      alt={card.name}
                      onMouseEnter={() => setHoveredCard?.(card)}
                      onClick={() => setSelectedCard(card)}
                      className="w-full h-full object-contain rounded-lg cursor-pointer"
                      style={{ pointerEvents: "auto" }}
                    />
                    {card.proxy && (
                      <div className={`pointer-events-none absolute inset-0 rounded-lg border-4 ${availableProxyKeySet.has(cardKey(card)) ? "border-blue-600" : "border-red-600"}`} />
                    )}
                    {card.proxy && availableProxyKeySet.has(cardKey(card)) && (
                      <div className="pointer-events-none absolute left-2 top-2 z-20 hidden rounded bg-blue-700 px-2 py-1 text-xs font-semibold text-white shadow-lg group-hover:block">
                        {availableProxyLocations[cardKey(card)]?.join(" + ") ?? "Available"}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
