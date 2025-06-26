import Modal from "@/components/Modal";
import { Card, CollectionTypeOption, FoilOption } from "@/types";
import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react";

interface ScryfallCard {
  name: string;
  finishes: Array<String>;
  oracle_id: string;
  set: string;
  collector_number: string;
  [key: string]: any; // allows additional properties
}

type CardAddSystemProps = {
  showFindModal: boolean;
  setShowFindModal: Dispatch<SetStateAction<boolean>>;
  update: number;
  sendUpdate: Dispatch<SetStateAction<number>>;
  collection_type: CollectionTypeOption;
};

const headers = {
  "User-Agent": "RegalTurtlesMagic/1.0",
  "Accept": "application/json",
};

const CardAddSystem = ({ 
    showFindModal, 
    setShowFindModal, 
    update,
    sendUpdate,
    collection_type
}: CardAddSystemProps) => {
    // References to be used to focus to the right place for finding and adding a card
  const findRef = useRef<HTMLInputElement>(null);
  const addRef = useRef<HTMLInputElement>(null);
  const addByNameRef = useRef<HTMLSelectElement>(null);

  const [ cn, setCn ] = useState<string>("");
  const [ setCode, setSetCode ] = useState<string>("");
  const [ name, setName ] = useState<string>("");
  const [ showAddModal, setShowAddModal ] = useState<boolean>(false);
  const [ artUrl, setArtUrl ] = useState<string>("");
  const [ cardToAdd, setCardToAdd ] = useState<ScryfallCard | null>(null);
  const [ cardNotFound, setCardNotFound ] = useState<boolean>(false);
  const [ foilOption, setFoilOption ] = useState<FoilOption>("nonfoil");
  const [ quantToAdd, setQuantToAdd ] = useState<number>(1);
  const [ isProxy, setIsProxy ] = useState<string>("false");
  const [ isList, setIsList ] = useState<boolean>(false);

  // Used for searching by name
  const [ showAddByCardModal, setShowAddByCardModal ] = useState<boolean>(false);
  const [ cardList, setCardList ] = useState<Array<ScryfallCard>>([]);
  const [ setAndCn, setSetAndCn ] = useState<string>("");

  const handleNameSearch = async () => {
    const params = new URLSearchParams({
      q: `!"${name}"`,
      unique: "prints",
      order: "released",
      dir: "asc",
    });

    try {
      const res = await fetch(`https://api.scryfall.com/cards/search?${params.toString()}`, { headers });
      const data = await res.json();
      if (data.object === "error") {
        setCardNotFound(true);
        return;
      }
      setCardToAdd(data.data[0]);
      const foundCard = data.data[0];
      if (foundCard === null) {
        setCardNotFound(true);
        return;
      }
      setCardList(data.data);
      setName(foundCard.name);
      setArtUrl((foundCard.image_uris ? foundCard.image_uris.normal : foundCard.card_faces[0].image_uris.normal))
      setShowFindModal(false);
      setShowAddByCardModal(true);
      setSetAndCn(`${foundCard.set} | ${foundCard.collector_number}`);
      setFoilOption(foundCard.finishes[0] as FoilOption);
    } catch (e) {
      console.error("Error:", e);
    }
  }

  useEffect(() => {
    if (showFindModal && findRef.current) {
      findRef.current.focus();
    }
  }, [ showFindModal ]);

  useEffect(() => {
    if (showAddModal && addRef.current) {
      addRef.current.focus();
    }
  }, [ showFindModal ]);

  useEffect(() => {
    if (showAddByCardModal && addByNameRef.current) {
      addByNameRef.current.focus();
    }
  }, [ showFindModal ]);


  return (
    <div>
      <Modal 
        show={showFindModal} 
        onClose={() => {
          setShowFindModal(false);
          setCn("");
          setSetCode("");
          setName("");
          setIsList(false);
          setCardNotFound(false);
        }}
      >
        <h2 className="text-lg font-semibold mb-4">Find a card</h2>

        {cardNotFound && <p className="text-red-700 bg-red-100 px-2 py-1 mt-0 mb-3 w-40 border border-red-300 rounded-md font-medium text-center mx-auto">Card not found</p>}

        <form 
          className="flex flex-col gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            setCardNotFound(false);
            try {
              let res;
              let data: ScryfallCard;
              if (name) {
                await handleNameSearch();
                return;
              } else {
                if (isList) {
                  res = await fetch(`https://api.scryfall.com/cards/search?q=s:plst+cn=${setCode}-${cn}`);
                  const parsedJson = await res.json();
                  if (parsedJson.object === "error") {
                    setCardNotFound(true);
                    return;
                  }
                  data = parsedJson.data[0];
                } else {
                  res = await fetch(`https://api.scryfall.com/cards/${setCode}/${cn}/`);
                  data = await res.json();
                }
              }
              if (data.object === "error") {
                setCardNotFound(true);
                return;
              }
              // const oracleId: string = data.oracle_id;
              setArtUrl((data.image_uris ? data.image_uris.normal : data.card_faces[0].image_uris.normal))
              setShowFindModal(false);
              setShowAddModal(true);
              setCardToAdd(data);
              setSetCode(data.set);
              setCn(data.collector_number);
              setName(data.name);
              setFoilOption(data.finishes[0] as FoilOption);
            } catch (err) {
              console.error("Failed to fetch art:", err);
            }
          }}
        >
          <label className="text-sm font-medium">Set Code</label>
          <input
            ref={findRef}
            type="text"
            value={setCode}
            onChange={(e) => setSetCode(e.target.value)}
            className="border rounded px-2 py-1"
          />

          <label className="text-sm font-medium">Collector Number</label>
          <input
            type="text"
            value={cn}
            onChange={(e) => setCn(e.target.value)}
            className="border rounded px-2 py-1"
          />

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="list"
              checked={isList}
              onChange={(e) => setIsList(e.target.checked)}
              className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <label htmlFor="proxy" className="text-sm text-gray-700">
              Is on The List
            </label>
          </div>

          <label className="text-sm font-medium">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="border rounded px-2 py-1"
          />

          <button
            className="bg-indigo-600 text-white rounded px-4 py-2 mt-2 hover:bg-indigo-700"
            type="submit"
          >
            Find
          </button>
        </form>
      </Modal>

      <Modal 
        show={showAddModal} 
        onClose={() => {
          setShowAddModal(false);
          setCn("");
          setSetCode("");
          setName("");
          setArtUrl("");
          setFoilOption("nonfoil");
          setQuantToAdd(1);
          setIsProxy("false");
          setIsList(false);
          setCardToAdd(null);
          setCardNotFound(false);
        }}
      >
        <h2 className="text-lg font-semibold mb-4">Add a card</h2>

        <form 
          className="flex flex-col gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!cardToAdd) {
              setShowAddModal(false);
              setShowFindModal(true);
              setArtUrl("");
              setFoilOption("nonfoil");
              setQuantToAdd(1);
              setIsProxy("false");
              setIsList(false);
              setCardNotFound(true);
              return;
            }

            const proxyBool: boolean = isProxy === "true";

            const card: Card = {
              name: cardToAdd.name,
              quant: quantToAdd,
              set: cardToAdd.set,
              cn: cardToAdd.collector_number,
              foil: foilOption,
              proxy: proxyBool,
              updatedAt: null,
              image: artUrl,
              oracle: cardToAdd.oracle_text ?? `${cardToAdd?.card_faces?.[0]?.oracle_text} // ${cardToAdd?.card_faces?.[1]?.oracle_text}`,
            }

            const _res = await fetch(`/api/collection/${collection_type}/add_card`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(card)
            });

            setShowAddModal(false);
            setCn("");
            setSetCode("");
            setName("");
            setArtUrl("");
            setFoilOption("nonfoil");
            setQuantToAdd(1);
            setIsProxy("false");
            setCardToAdd(null);
            setCardNotFound(false);
            sendUpdate(update + 1);
            setIsList(false);
            setShowFindModal(true);
          }}
        >
          <div className="flex flex-row gap-6">
            {/* Image on the left */}
            <div className="w-1/2 flex items-center justify-center">
              <div className="mt-4">
                <img src={artUrl} alt="Card Art" className="w-full max-w-xs mx-auto rounded" />
              </div>
            </div>

            {/* Form on the right */}
            <div className="w-1/2 flex flex-col gap-2">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {}}
                  className="border rounded px-2 py-1"
                />

                <label className="text-sm font-medium">Set Code</label>
                <input
                  type="text"
                  value={setCode}
                  onChange={(e) => {}}
                  className="border rounded px-2 py-1"
                />

                <label className="text-sm font-medium">Collector Number</label>
                <input
                  type="text"
                  value={cn}
                  onChange={(e) => {}}
                  className="border rounded px-2 py-1"
                />

                <label className="text-sm font-medium">Quantity</label>
                <input
                  ref={addRef}
                  type="number"
                  value={quantToAdd}
                  onChange={(e) => setQuantToAdd(Number(e.target.value))}
                  className="border rounded px-2 py-1"
                />

                <label className="text-sm font-medium">Foil</label>
                <select
                  id="dropdown"
                  value={foilOption}
                  onChange={(e) => setFoilOption(e.target.value as FoilOption)}
                  className="border rounded px-2 py-1"
                >
                  {cardToAdd && cardToAdd.finishes.includes("nonfoil") && (<option value="nonfoil">Nonfoil</option>)}
                  {cardToAdd && cardToAdd.finishes.includes("foil") && (<option value="foil">Foil</option>)}
                  {cardToAdd && cardToAdd.finishes.includes("etched") && (<option value="etched">Etched Foil</option>)}
                </select>

                <label className="text-sm font-medium mr-2">Is a proxy?</label>
                <select
                  id="dropdown"
                  value={isProxy}
                  onChange={(e) => setIsProxy(e.target.value)}
                  className="border rounded px-2 py-1"
                >
                  <option value="false">No</option>
                  <option value="true">Yes</option>
                </select>
              </div>
            </div>
          </div>

          <button
            className="bg-indigo-600 text-white rounded px-4 py-2 mt-2 hover:bg-indigo-700"
            type="submit"
          >
            Add
          </button>
        </form>
      </Modal>

      <Modal 
        show={showAddByCardModal} 
        onClose={() => {
          setShowAddByCardModal(false);
          setSetAndCn("");
          setName("");
          setArtUrl("");
          setFoilOption("nonfoil");
          setQuantToAdd(1);
          setIsProxy("false");
          setIsList(false);
          setCardToAdd(null);
          setCardNotFound(false);
          setCardList([]);
        }}
      >
        <h2 className="text-lg font-semibold mb-4">Add a card</h2>

        <form 
          className="flex flex-col gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!cardToAdd) {
              setShowAddModal(false);
              setShowFindModal(true);
              setArtUrl("");
              setFoilOption("nonfoil");
              setQuantToAdd(1);
              setIsProxy("false");
              setIsList(false);
              setCardNotFound(true);
              return;
            }

            const proxyBool: boolean = isProxy === "true";

            const card: Card = {
              name: cardToAdd.name,
              quant: quantToAdd,
              set: cardToAdd.set,
              cn: cardToAdd.collector_number,
              foil: foilOption,
              proxy: proxyBool,
              updatedAt: null,
              image: artUrl,
              oracle: cardToAdd.oracle_text ?? `${cardToAdd?.card_faces?.[0]?.oracle_text} // ${cardToAdd?.card_faces?.[1]?.oracle_text}`,
            }

            const _res = await fetch(`/api/collection/${collection_type}/add_card`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(card)
            });

            setShowAddByCardModal(false);
            setCn("");
            setSetCode("");
            setName("");
            setArtUrl("");
            setFoilOption("nonfoil");
            setQuantToAdd(1);
            setIsProxy("false");
            setCardToAdd(null);
            setCardNotFound(false);
            sendUpdate(update + 1);
            setIsList(false);
            setShowFindModal(true);
          }}
        >
          <div className="flex flex-row gap-6">
            {/* Image on the left */}
            <div className="w-1/2 flex items-center justify-center">
              <div className="mt-4">
                <img src={artUrl} alt="Card Art" className="w-full max-w-xs mx-auto rounded" />
              </div>
            </div>

            {/* Form on the right */}
            <div className="w-1/2 flex flex-col gap-2">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {}}
                  className="border rounded px-2 py-1"
                />

                <label className="text-sm font-medium">Collector Info</label>
                <select
                  ref={addByNameRef}
                  id="dropdown"
                  value={setAndCn}
                  onChange={(e) => {
                    setSetAndCn(e.target.value);
                    const [setCode, collectorNumber] = e.target.value.split(" | ");

                    const selectedCard = cardList.find(
                      (card) => card.set === setCode && card.collector_number === collectorNumber
                    );
                    
                    if (selectedCard) {
                      setFoilOption(selectedCard.finishes[0] as FoilOption);
                      setCardToAdd(selectedCard);
                      setArtUrl(
                        selectedCard.image_uris
                          ? selectedCard.image_uris.normal
                          : selectedCard.card_faces[0].image_uris.normal
                      );
                    }
                  }}
                  className="border rounded px-2 py-1"
                >
                  {cardList.map((card, index) => (
                    <option value={`${card.set} | ${card.collector_number}`} key={index}>{`${card.set.toUpperCase()} | ${card.collector_number}`}</option>
                  ))}
                </select>

                <label className="text-sm font-medium">Quantity</label>
                <input
                  type="number"
                  value={quantToAdd}
                  onChange={(e) => setQuantToAdd(Number(e.target.value))}
                  className="border rounded px-2 py-1"
                />

                <label className="text-sm font-medium">Foil</label>
                <select
                  id="dropdown"
                  value={foilOption}
                  onChange={(e) => setFoilOption(e.target.value as FoilOption)}
                  className="border rounded px-2 py-1"
                >
                  {cardToAdd && cardToAdd.finishes.includes("nonfoil") && (<option value="nonfoil">Nonfoil</option>)}
                  {cardToAdd && cardToAdd.finishes.includes("foil") && (<option value="foil">Foil</option>)}
                  {cardToAdd && cardToAdd.finishes.includes("etched") && (<option value="etched">Etched Foil</option>)}
                </select>

                <label className="text-sm font-medium mr-2">Is a proxy?</label>
                <select
                  id="dropdown"
                  value={isProxy}
                  onChange={(e) => setIsProxy(e.target.value)}
                  className="border rounded px-2 py-1"
                >
                  <option value="false">No</option>
                  <option value="true">Yes</option>
                </select>
              </div>
            </div>
          </div>

          <button
            className="bg-indigo-600 text-white rounded px-4 py-2 mt-2 hover:bg-indigo-700"
            type="submit"
          >
            Add
          </button>
        </form>
      </Modal>
    </div>
  )
}

export default CardAddSystem;