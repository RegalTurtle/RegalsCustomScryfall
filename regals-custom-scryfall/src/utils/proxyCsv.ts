export type CsvRow = Record<string, string>;

export type SharedProxyVersion = {
  row: CsvRow;
  name: string;
  setCode: string;
  setName: string;
  cardNumber: string;
  printing: string;
  quantity: number;
  owned: boolean;
  ownedCopies: number;
  copiesNeeded: number;
  imageUrl?: string;
};

export type SharedProxyCard = {
  name: string;
  versions: SharedProxyVersion[];
};

export function normalizeProxyText(value: string | undefined | null): string {
  return String(value ?? "").trim().toLowerCase();
}

export function parseCsvRows(csvText: string): CsvRow[] {
  const normalizedText = csvText.replace(/^\uFEFF/, "").replace(/\r/g, "");
  const rows = normalizedText.split(/\n/).filter(line => line.trim() !== "");
  if (rows.length === 0) return [];

  const firstLine = rows[0].trim();
  if (firstLine === "sep=," || firstLine === '"sep=,"' || firstLine === "'sep=,'") {
    rows.shift();
  }

  if (rows.length === 0) return [];

  const header = parseCsvLine(rows[0]);
  const dataRows = rows.slice(1);

  return dataRows
    .filter(line => line.trim() !== "")
    .map(line => parseCsvLine(line))
    .filter(row => row.length > 0)
    .map(values => {
      const record: CsvRow = {};
      header.forEach((key, index) => {
        record[key] = values[index] ?? "";
      });
      return record;
    });
}

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      values.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current);
  return values.map(value => value.trim());
}

export function getSharedProxyVersions(
  proxyReport: Array<{
    card?: { name: string; set?: string; cn?: string };
    cards?: Array<{ name: string; set?: string; cn?: string }>;
    ownedCopies?: Array<{ name: string; set?: string; cn?: string; quant?: number }>;
  }>,
  csvRows: CsvRow[],
) {
  const proxyNames = new Map<string, Array<{ set: string; cn: string }>>();

  for (const item of proxyReport) {
    const versions = item.cards && item.cards.length > 0 ? item.cards : [item.card].filter(Boolean) as Array<{ name: string; set?: string; cn?: string }>;

    for (const card of versions) {
      const name = normalizeProxyText(card.name);
      if (!name) continue;

      const set = normalizeProxyText(card.set ?? "");
      const cn = normalizeProxyText(card.cn ?? "");
      const versionsForName = proxyNames.get(name) ?? [];
      versionsForName.push({ set, cn });
      proxyNames.set(name, versionsForName);
    }
  }

  const sharedCards: SharedProxyCard[] = [];

  for (const row of csvRows) {
    const normalizedName = normalizeProxyText(row["Card Name"]);
    const displayName = row["Card Name"]?.trim() || "";
    const setCode = normalizeProxyText(row["Set Code"]);
    const cardNumber = normalizeProxyText(row["Card Number"]);
    if (!normalizedName) continue;

    if (!proxyNames.has(normalizedName)) continue;

    const ownedCopiesForVersion = (proxyReport ?? [])
      .flatMap(item => item.ownedCopies ?? [])
      .filter(copy =>
        normalizeProxyText(copy.name) === normalizedName
        && normalizeProxyText(copy.set) === setCode
        && normalizeProxyText(copy.cn) === cardNumber,
      )
      .reduce((total, copy) => total + (Number(copy.quant ?? 0) || 0), 0);

    const rowQuantity = Number(row["Quantity"] ?? "0") || 0;
    const copiesNeeded = Math.max(0, rowQuantity - ownedCopiesForVersion);

    let cardGroup = sharedCards.find(card => normalizeProxyText(card.name) === normalizedName);
    if (!cardGroup) {
      cardGroup = { name: displayName, versions: [] };
      sharedCards.push(cardGroup);
    }

    cardGroup.versions.push({
      row,
      name: displayName,
      setCode,
      setName: row["Set Name"] ?? "",
      cardNumber,
      printing: row["Printing"] ?? row["Set Name"] ?? "",
      quantity: rowQuantity,
      owned: ownedCopiesForVersion > 0,
      ownedCopies: ownedCopiesForVersion,
      copiesNeeded,
    });
  }

  const orderedCards = [...sharedCards].sort((a, b) => a.name.localeCompare(b.name));
  const orderedNames = orderedCards.map(card => card.name);

  return {
    sharedCards: orderedCards,
    sharedCardNames: orderedNames,
    sharedKeys: Array.from(proxyNames.keys()).filter(name => orderedNames.includes(name)),
  };
}
