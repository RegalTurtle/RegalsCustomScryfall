import { Card, CardPile } from "@/types";
import { Dispatch, SetStateAction } from "react";

export default function CardPiles({ piles, setSelectedCard }: { piles: CardPile[], setSelectedCard: Dispatch<SetStateAction<Card | null>> }) {
  const cardOffset = 32;
  const cardHeight = 279;

  return (
    <div className="flex overflow-x-auto space-x-6 p-4">
      {piles.map((pile) => {
        const totalCards = pile.cards.reduce((sum, c) => sum + c.quant, 0);
        const visibleCardCount = pile.cards.length;
        const stackHeight = cardHeight + cardOffset * (visibleCardCount - 1);

        return (
          <div key={pile.pileName} className="min-w-[200px] relative">
            <p className="text-center text-sm mb-2">{`${pile.pileName} (${totalCards})`}</p>

            <div
              className="relative w-[200px] overflow-visible"
              style={{ height: `${stackHeight}px` }}
            >
              {pile.cards.map((card, index) => (
                <img
                  key={`${card.set}|${card.cn}`}
                  src={card.image}
                  alt={card.name}
                  onClick={() => setSelectedCard(card)}
                  className="w-full object-contain rounded-lg absolute top-0 left-0 transition-transform cursor-pointer pt-0"
                  style={{
                    height: `${cardHeight}px`,
                    transform: `translateY(${index * cardOffset}px)`,
                    zIndex: index,
                  }}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
