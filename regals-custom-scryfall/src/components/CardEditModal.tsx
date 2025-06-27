import { Card } from "@/types";
import { Dispatch, SetStateAction, useEffect } from "react";
import { useState } from "react";

export default function CardEditModal({
  card,
  onClose,
  update, 
  sendUpdate,
  deckId,
}: {
  card: Card;
  onClose: () => void;
  update: number;
  sendUpdate: Dispatch<SetStateAction<number>>;
  deckId: string;
}) {
  // Inside CardEditModal
  const [tags, setTags] = useState<string[]>(card.tag ?? []);
  const [newTag, setNewTag] = useState("");

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
      }),
    });
    setTags(updatedTags);
    setNewTag("");
    sendUpdate(update + 1);
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
      }),
    });
    setTags(updatedTags);
    sendUpdate(update + 1);
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