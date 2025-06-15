import { NextRequest, NextResponse } from "next/server";
import { cards } from "@/config/mongoCollections";

export async function GET(
  request: NextRequest,
  { params }: { params: { search_terms: string } }
) {
  // const searchTerms = await (await params).search_terms;
  const searchTerms = (await params).search_terms;
  const mongoQuery: any = {};

  const terms = searchTerms.match(/(?:[^\s"]+|"[^"]*")+/g) || [];

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
      mongoQuery.name = { $regex: new RegExp(term, 'i') };
    }
  }
  
  try {
    const cardCollection = await cards();
    const foundCards = await cardCollection.find(mongoQuery).sort({ updatedAt: -1 }).limit(100).toArray();
    return NextResponse.json(foundCards);
  } catch (error) {
    console.error("Error fetching cards:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}