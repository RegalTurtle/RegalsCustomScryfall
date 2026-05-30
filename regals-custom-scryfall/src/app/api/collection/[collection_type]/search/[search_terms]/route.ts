import { NextRequest, NextResponse } from "next/server";
import { bulkCards, coolCards, tradeBinder } from "@/config/mongoCollections";
import { Card } from "@/types";
import { Collection } from "mongodb";

export async function GET(
  request: NextRequest,
  { params }: { params: { search_terms: string, collection_type: "bulk" | "cool-cards" | "trade-binder" } }
) {
  // const searchTerms = await (await params).search_terms;
  const { search_terms, collection_type } = await params;
  const mongoQuery: any = {};
  mongoQuery.$and = [];

  const terms = search_terms.match(/(?:[^\s"]+|"[^"]*")+/g) || [];

  for (let term of terms) {
    term = term.replace(/^"(.+(?="$))"$/, '$1');

    // Implemented:
    // [ q / quant ]  [ = / > / < / >= / <= ] [ number ]
    // [ o / oracle ] [ : ]                   [ string ]
    // [ string ]

    if (term.startsWith("o:")) { // Oracle contains
      mongoQuery.oracle = { $regex: new RegExp(term.slice(2), 'i') };
    } else if (term.startsWith("oracle:")) { // Oracle contains
      mongoQuery.oracle = { $regex: new RegExp(term.slice(7), 'i') };
    } else if (term.startsWith("q=")) { // Quantity equals
      mongoQuery.quant = { ...(mongoQuery.quant || {}), $eq: parseInt(term.slice(2)) };
    } else if (term.startsWith("q>=")) { // Quantity greater than or equal
      mongoQuery.quant = { ...(mongoQuery.quant || {}), $gte: parseInt(term.slice(3)) };
    } else if (term.startsWith("q<=")) { // Quantity less than or equal
      mongoQuery.quant = { ...(mongoQuery.quant || {}), $lte: parseInt(term.slice(3)) };
    } else if (term.startsWith("q>")) { // Quantity greater than
      mongoQuery.quant = { ...(mongoQuery.quant || {}), $gt: parseInt(term.slice(2)) };
    } else if (term.startsWith("q<")) { // Quantity less than
      mongoQuery.quant = { ...(mongoQuery.quant || {}), $lt: parseInt(term.slice(2)) };
    } else if (term.startsWith("quant=")) { // Quantity equals
      mongoQuery.quant = { ...(mongoQuery.quant || {}), $eq: parseInt(term.slice(6)) };
    } else if (term.startsWith("quant>=")) { // Quantity greater than or equal
      mongoQuery.quant = { ...(mongoQuery.quant || {}), $gte: parseInt(term.slice(7)) };
    } else if (term.startsWith("quant<=")) { // Quantity less than or equal
      mongoQuery.quant = { ...(mongoQuery.quant || {}), $lte: parseInt(term.slice(7)) };
    } else if (term.startsWith("quant>")) { // Quantity greater than
      mongoQuery.quant = { ...(mongoQuery.quant || {}), $gt: parseInt(term.slice(6)) };
    } else if (term.startsWith("quant<")) { // Quantity less than
      mongoQuery.quant = { ...(mongoQuery.quant || {}), $lt: parseInt(term.slice(6)) };
    } else {
      mongoQuery.$and.push({ name: { $regex: new RegExp(term, 'i') }});
    }
  }

  if (mongoQuery.$and.length === 0) {
    delete mongoQuery.$and;
  }
  
  try {
    let cardsCollection: Collection<Card>;
    if (collection_type === "bulk") {
      cardsCollection = await bulkCards();
    } else if (collection_type === "cool-cards") {
      cardsCollection = await coolCards();
    } else if (collection_type === "trade-binder") {
      cardsCollection = await tradeBinder();
    } else {
      return new NextResponse("collection_type invalid", { status: 400 });
    }
    const foundCards = await cardsCollection.find(mongoQuery).sort({ updatedAt: -1 }).limit(100).toArray();
    return NextResponse.json(foundCards);
  } catch (error) {
    console.error("Error fetching cards:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
