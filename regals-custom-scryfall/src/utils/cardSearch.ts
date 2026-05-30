import { Card } from "@/types";

const colorOrder = ["W", "U", "B", "R", "G"];

export type CardSearchTerm =
  | { type: "text"; value: string }
  | { type: "oracle"; value: string }
  | { type: "color"; value: string }
  | { type: "colorCount"; operator: "$eq" | "$gte" | "$lte" | "$gt" | "$lt"; value: number }
  | { type: "quantity"; operator: "$eq" | "$gte" | "$lte" | "$gt" | "$lt"; value: number }
  | { type: "owned"; owned: boolean };

type SearchableCard = Pick<Card, "name" | "oracle" | "color">;

export function parseCardSearchTerms(searchTerms: string): CardSearchTerm[] {
  const terms = searchTerms.match(/(?:[^\s"]+|"[^"]*")+/g) || [];

  return terms.map(rawTerm => {
    const term = rawTerm.replace(/^"(.+(?="$))"$/, "$1");
    const lowerTerm = term.toLowerCase();

    if (lowerTerm === "is:owned") return { type: "owned", owned: true };
    if (lowerTerm === "is:unowned") return { type: "owned", owned: false };
    if (term.startsWith("o:")) return { type: "oracle", value: term.slice(2) };
    if (term.startsWith("oracle:")) return { type: "oracle", value: term.slice(7) };
    if (term.startsWith("c=")) return { type: "color", value: term.slice(2) };
    if (term.startsWith("color=")) return { type: "color", value: term.slice(6) };

    const colorCountMatch = term.match(/^(c|color)(>=|<=|>|<)([0-5])$/);
    if (colorCountMatch) {
      const operatorMap: Record<string, "$gte" | "$lte" | "$gt" | "$lt"> = {
        ">=": "$gte",
        "<=": "$lte",
        ">": "$gt",
        "<": "$lt",
      };

      return {
        type: "colorCount",
        operator: operatorMap[colorCountMatch[2]],
        value: parseInt(colorCountMatch[3]),
      };
    }

    const quantityMatch = term.match(/^(q|quant)(=|>=|<=|>|<)(\d+)$/);
    if (quantityMatch) {
      const operatorMap: Record<string, "$eq" | "$gte" | "$lte" | "$gt" | "$lt"> = {
        "=": "$eq",
        ">=": "$gte",
        "<=": "$lte",
        ">": "$gt",
        "<": "$lt",
      };

      return {
        type: "quantity",
        operator: operatorMap[quantityMatch[2]],
        value: parseInt(quantityMatch[3]),
      };
    }

    return { type: "text", value: term };
  });
}

export function normalizeColorSearch(value: string) {
  const selectedColors = new Set(value.toUpperCase().split(""));
  return colorOrder.filter(color => selectedColors.has(color)).join("");
}

export function buildColorQuery(rawColorSearch: string) {
  const normalizedColorSearch = rawColorSearch.toLowerCase();

  if (normalizedColorSearch === "c" || normalizedColorSearch === "0" || normalizedColorSearch === "colorless") {
    return "";
  }

  if (/^[1-5]$/.test(normalizedColorSearch)) {
    return { $regex: new RegExp(`^[WUBRG]{${normalizedColorSearch}}$`) };
  }

  return normalizeColorSearch(rawColorSearch);
}

export function cardMatchesColor(card: SearchableCard, rawColorSearch: string) {
  const colorQuery = buildColorQuery(rawColorSearch);
  const cardColor = card.color ?? "";

  if (typeof colorQuery === "string") {
    return cardColor === colorQuery;
  }

  return colorQuery.$regex.test(cardColor);
}

export function buildCollectionCardSearchQuery(searchTerms: string) {
  const mongoQuery: {
    $and?: Array<{ name: { $regex: RegExp } }>;
    oracle?: { $regex: RegExp };
    color?: string | { $regex: RegExp };
    quant?: Partial<Record<"$eq" | "$gte" | "$lte" | "$gt" | "$lt", number>>;
  } = {
    $and: [],
  };

  for (const term of parseCardSearchTerms(searchTerms)) {
    if (term.type === "oracle") {
      mongoQuery.oracle = { $regex: new RegExp(term.value, "i") };
    } else if (term.type === "color") {
      mongoQuery.color = buildColorQuery(term.value);
    } else if (term.type === "colorCount") {
      const colorCountPattern: Record<typeof term.operator, string> = {
        "$eq": `{${term.value}}`,
        "$gte": `{${term.value},5}`,
        "$lte": `{0,${term.value}}`,
        "$gt": `{${term.value + 1},5}`,
        "$lt": `{0,${Math.max(0, term.value - 1)}}`,
      };
      mongoQuery.color = { $regex: new RegExp(`^[WUBRG]${colorCountPattern[term.operator]}$`) };
    } else if (term.type === "quantity") {
      mongoQuery.quant = { ...(mongoQuery.quant || {}), [term.operator]: term.value };
    } else if (term.type === "text") {
      mongoQuery.$and?.push({ name: { $regex: new RegExp(term.value, "i") } });
    }
  }

  if (mongoQuery.$and?.length === 0) {
    delete mongoQuery.$and;
  }

  return mongoQuery;
}

export function cardSearchTextMatches(
  term: string,
  values: Array<string | undefined | null>,
) {
  const termRegex = new RegExp(term, "i");
  return values.some(value => Boolean(value && termRegex.test(value)));
}

export function cardMatchesParsedSearch(
  card: SearchableCard,
  parsedTerms: CardSearchTerm[],
  options: {
    quantity?: number;
    totalOwned?: number;
    textValues?: Array<string | undefined | null>;
  } = {},
) {
  for (const term of parsedTerms) {
    if (term.type === "owned") {
      const totalOwned = options.totalOwned ?? 0;
      if (term.owned && totalOwned <= 0) return false;
      if (!term.owned && totalOwned !== 0) return false;
    } else if (term.type === "oracle") {
      if (!new RegExp(term.value, "i").test(card.oracle)) return false;
    } else if (term.type === "color") {
      if (!cardMatchesColor(card, term.value)) return false;
    } else if (term.type === "colorCount") {
      const colorCount = (card.color ?? "").length;
      if (term.operator === "$eq" && colorCount !== term.value) return false;
      if (term.operator === "$gte" && colorCount < term.value) return false;
      if (term.operator === "$lte" && colorCount > term.value) return false;
      if (term.operator === "$gt" && colorCount <= term.value) return false;
      if (term.operator === "$lt" && colorCount >= term.value) return false;
    } else if (term.type === "quantity") {
      const quantity = options.quantity ?? 0;
      if (term.operator === "$eq" && quantity !== term.value) return false;
      if (term.operator === "$gte" && quantity < term.value) return false;
      if (term.operator === "$lte" && quantity > term.value) return false;
      if (term.operator === "$gt" && quantity <= term.value) return false;
      if (term.operator === "$lt" && quantity >= term.value) return false;
    } else if (term.type === "text") {
      if (!cardSearchTextMatches(term.value, [card.name, ...(options.textValues ?? [])])) return false;
    }
  }

  return true;
}
