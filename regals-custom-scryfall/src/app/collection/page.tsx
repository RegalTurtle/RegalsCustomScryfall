"use client";
import { useSession } from "next-auth/react";
import { useState } from "react";
import RegalsMagicHeader from "@/components/RegalsMagicHeader";
import authorization from "@/authorization";
import ProgressBar from "@/components/ProgressBar";
import Link from "next/link";
import CardAddSystem from "@/components/CardAddSystem";
import CardsWithSearch from "@/components/CardsWithSearch";

export default function Collection() {
  // SESSION VARIABLES
  const { data: session, status } = useSession();


  // Used when adding cards to the list, as it puts them at the front of the list
  const [ update, sendUpdate ] = useState(0);

  const [ showFindModal, setShowFindModal ] = useState<boolean>(false);

  if (status === "loading") return <p>Loading...</p>;

  return (
    <div className="flex flex-col min-h-screen bg-teal-900">
      <RegalsMagicHeader isHome={false} />

      <main className="flex-1 px-4 text-center justify-items-center">
        <h2 className="text-2xl mb-4">Bulk Collection</h2>
        <div className="mb-4">
          <Link href="/collection/trade-binder" className="bg-sky-600 text-white px-4 py-3 rounded hover:bg-sky-700 mx-1">Trade Binder</Link>
          <Link href="/collection/cool-cards" className="bg-sky-600 text-white px-4 py-3 rounded hover:bg-sky-700 mx-1">Cool Cards</Link>
        </div>

        {session && authorization.canAddCardsToCollection(session.user?.permissionLevel) && 
          <div className="mb-4">
            <button
              onClick={() => setShowFindModal(true)}
              className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
            >
              + Add a Card
            </button>
          </div>
        }

        <CardsWithSearch 
          update={update}
          collection_type="bulk"
        />
      </main>

      <footer className="h-16 bg-gray-900 text-white flex flex-col items-center justify-center mt-10 space-y-4">
        <div className="w-4/5 max-w-xl">
          <ProgressBar update={update} />
        </div>
      </footer>

      <CardAddSystem
        showFindModal={showFindModal}
        setShowFindModal={setShowFindModal}
        update={update}
        sendUpdate={sendUpdate}
        collection_type="bulk"
      />
    </div>
  );
}