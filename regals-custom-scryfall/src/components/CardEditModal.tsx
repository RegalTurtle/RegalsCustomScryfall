import { Card } from "@/types";
import { useEffect } from "react";

export default function CardEditModal({
  card,
  onClose,
}: {
  card: Card;
  onClose: () => void;
}) {
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

  return (
    <div className="fixed inset-0 bg-black/70 bg-opacity-60 flex justify-center items-center z-200">
      <div className="bg-gray-800 text-white rounded-lg shadow-lg w-[90%] max-w-md p-4 relative">
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

          <div className="space-y-2 w-full">
            <button className="w-full bg-green-800 hover:bg-green-700 px-4 py-2 rounded">
              Add Tag
            </button>
            <button className="w-full bg-red-900 hover:bg-red-800 px-4 py-2 rounded">
              Remove Tag
            </button>
            <button className="w-full bg-purple-800 hover:bg-purple-700 px-4 py-2 rounded">
              Swap Card
            </button>
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