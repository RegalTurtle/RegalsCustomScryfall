export type CsvRow = Record<string, string>;

export type SharedProxyVersion = {
  row: CsvRow;
  name: string;
  setCode: string;
  setName: string;
  cardNumber: string;
  printing: string;
  quantity: number;
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
  proxyReport: Array<{ card: { name: string; set: string; cn: string } }>,
  csvRows: CsvRow[],
) {
  const proxyKeys = new Set<string>();
  const proxyNames = new Map<string, Array<{ set: string; cn: string }>>();

  for (const item of proxyReport) {
    const name = normalizeProxyText(item.card.name);
    const set = normalizeProxyText(item.card.set);
    const cn = normalizeProxyText(item.card.cn);
    const key = `${name}|${set}|${cn}`;
    proxyKeys.add(key);

    const versions = proxyNames.get(name) ?? [];
    versions.push({ set, cn });
    proxyNames.set(name, versions);
  }

  const sharedCards: SharedProxyCard[] = [];

  for (const row of csvRows) {
    const normalizedName = normalizeProxyText(row["Card Name"]);
    const displayName = row["Card Name"]?.trim() || "";
    const setCode = normalizeProxyText(row["Set Code"]);
    const cardNumber = normalizeProxyText(row["Card Number"]);
    if (!normalizedName) continue;

    const matchedProxy = (proxyNames.get(normalizedName) ?? []).some(version =>
      version.set === setCode && version.cn === cardNumber,
    );

    if (!matchedProxy) continue;

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
      quantity: Number(row["Quantity"] ?? "0") || 0,
    });
  }

  const orderedCards = [...sharedCards].sort((a, b) => a.name.localeCompare(b.name));
  const orderedNames = orderedCards.map(card => card.name);

  return {
    sharedCards: orderedCards,
    sharedCardNames: orderedNames,
    sharedKeys: Array.from(proxyKeys).filter(key => {
      const [name] = key.split("|");
      return orderedNames.includes(name);
    }),
  };
}
