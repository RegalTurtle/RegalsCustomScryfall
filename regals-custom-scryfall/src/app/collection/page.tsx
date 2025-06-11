"use client";
import { Card, FoilOption } from "@/types";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import Modal from '@/components/Modal';

type ExtendedCard = Card & {
  image: string;
};

interface ScryfallCard {
  name: string;
  finishes: Array<String>;
  oracle_id: string;
  set: string;
  collector_number: string;
  [key: string]: any; // allows additional properties
}

const headers = {
  "User-Agent": "RegalTurtlesMagic/1.0", // Replace with your app name/version
  "Accept": "application/json",
};

export default function Collection() {
  const { data: session, status } = useSession();

  const [ cards, setCards ] = useState<ExtendedCard[]>([]);
  const [ loading, setLoading ] = useState<boolean>(true);
  const [ footerLoading, setFooterLoading ] = useState<boolean>(true);
  const [ showFindModal, setShowFindModal ] = useState<boolean>(false);
  const [ showAddModal, setShowAddModal ] = useState<boolean>(false);

  const [ cn, setCn ] = useState<string>("");
  const [ setCode, setSetCode ] = useState<string>("");
  const [ name, setName ] = useState<string>("");
  const [ artUrl, setArtUrl ] = useState<string>("");

  const [ cardToAdd, setCardToAdd ] = useState<ScryfallCard | null>(null);
  const [ cardNotFound, setCardNotFound ] = useState<boolean>(false);
  // const [ setAndCn, setSetAndCn ] = useState<Array<string>>([]);

  const [ foilOption, setFoilOption ] = useState<FoilOption>("nonfoil");
  const [ quantToAdd, setQuantToAdd ] = useState<number>(1);
  const [ isProxy, setIsProxy ] = useState<string>("false");
  const [ isList, setIsList ] = useState<boolean>(false);

  const [ update, sendUpdate ] = useState(0);

  const [ totalCards, setTotalCards ] = useState(0);

  const [ moxfieldSearch, setMoxfieldSearch ] = useState<string>("");
  const [ debouncedSearch, setDebouncedSearch ] = useState(moxfieldSearch);

  const findRef = useRef<HTMLInputElement>(null);
  const addRef = useRef<HTMLInputElement>(null);


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
          res = await fetch("/api/collection/all_cards");
        } else {
          res = await fetch(`/api/collection/collection_search/${debouncedSearch}`);
        }
        const data = await res.json();
        setCards(data);
      } catch (error) {
        console.error("Failed to fetch cards", error);
      } finally {
        setLoading(false);
      }
    }

    async function countCards() {
      try {
        const res = await fetch("/api/collection/stats/total_card_count");
        const data = await res.json();
        setTotalCards(data.count);
      } catch (error) {
        console.error("Failed to sum cards", error);
      } finally {
        setFooterLoading(false);
      }
    }

    fetchCards();
    countCards();
  }, [update, debouncedSearch]);

  if (status === "loading" || loading) return <p>Loading...</p>;

  return (
    <div className="flex flex-col min-h-screen bg-teal-900">
      <header className="h-20 flex items-center relative mb-5 bg-teal-950">
        <Link href="/" className="mr-auto mv-auto ml-5 bg-indigo-600 p-2 text-white rounded-md hover:bg-indigo-700">Home</Link>
        <h1 className="absolute left-1/2 transform -translate-x-1/2 text-3xl">Regal's Magic</h1>
        {!session && <Link href="/login" className="ml-auto mv-auto mr-5 bg-indigo-600 p-2 text-white rounded-md hover:bg-indigo-700">Log In</Link>}
        {session && <Link href="/logout" className="ml-auto mv-auto mr-5 bg-indigo-600 p-2 text-white rounded-md hover:bg-indigo-700">Log Out</Link>}
      </header>

      <main className="flex-1 px-4 text-center justify-items-center">
        {session && 
          // TODO: Change this so that you have to both be signed in, and have a permission to add cards
          <div className="mb-4">
            <button
              onClick={() => setShowFindModal(true)}
              className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
            >
              + Add a Card
            </button>
          </div>
        }

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
      </main>

      <footer className="h-16 bg-gray-900 text-white flex items-center justify-center mt-10">
        {
          footerLoading ?
          <p>Loading...</p> :
          <p>{`Cards: ${totalCards}`}</p>
        }
      </footer>

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
                res = await fetch(`https://api.scryfall.com/cards/named?fuzzy=${name.replace(" ", "+")}`, { headers });
                data = await res.json();
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

          {/* <label className="text-sm font-medium">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="border rounded px-2 py-1"
          /> */}

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
              decks: [],
              updatedAt: null,
              image: artUrl,
            }

            const res = await fetch("/api/collection/add_card", {
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
    </div>
  );
}