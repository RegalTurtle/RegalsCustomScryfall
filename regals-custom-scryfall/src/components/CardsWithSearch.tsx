import { Card } from "@/types";
import { Dispatch, SetStateAction, useEffect, useState } from "react";

type CardsWithSearchProps = {
  update: number;
  collection_type: string;
}

const CardsWithSearch = ({
  update,
  collection_type
}: CardsWithSearchProps) => {
  const [ cards, setCards ] = useState<Card[]>([]);
  const [ loading, setLoading ] = useState<boolean>(true);

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
          <div key={index} className="bg-teal-100 rounded-lg shadow-md p-4 w-58 flex flex-col">
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
          </div>
        ))}
      </div>
    </div>
  );
}

export default CardsWithSearch;