import type { CSSProperties } from "react";

const manaColors: Record<string, string> = {
  W: "#f8f0d8",
  U: "#4aa3df",
  B: "#312a2c",
  R: "#d9482f",
  G: "#3d8b4f",
};

const colorOrder = ["W", "U", "B", "R", "G"];
const gradientColorOrders: Record<string, string> = {
  W: "W",
  U: "U",
  B: "B",
  R: "R",
  G: "G",
  WU: "WU",
  UB: "UB",
  BR: "BR",
  RG: "RG",
  WG: "GW",
  WB: "WB",
  UR: "UR",
  BG: "BG",
  WR: "RW",
  UG: "GU",
  WUB: "WUB",
  UBR: "UBR",
  BRG: "BRG",
  WRG: "RGW",
  WUG: "GWU",
  WBG: "WBG",
  WUR: "URW",
  UBG: "BGU",
  WBR: "RWB",
  URG: "GUR",
  WUBR: "WUBR",
  UBRG: "UBRG",
  WBRG: "BRGW",
  WURG: "RGWU",
  WUBG: "GWUB",
  WUBRG: "WUBRG",
};
export const monoColorGroups = [
  { colorId: "W", label: "White" },
  { colorId: "U", label: "Blue" },
  { colorId: "B", label: "Black" },
  { colorId: "R", label: "Red" },
  { colorId: "G", label: "Green" },
];
export const twoColorGroups = [
  { colorId: "WU", label: "Azorius" },
  { colorId: "UB", label: "Dimir" },
  { colorId: "BR", label: "Rakdos" },
  { colorId: "RG", label: "Gruul" },
  { colorId: "WG", label: "Selesnya" },
  { colorId: "WB", label: "Orzhov" },
  { colorId: "UR", label: "Izzet" },
  { colorId: "BG", label: "Golgari" },
  { colorId: "WR", label: "Boros" },
  { colorId: "UG", label: "Simic" },
];
export const threeColorGroups = [
  { colorId: "WUG", label: "Bant" },
  { colorId: "WUB", label: "Esper" },
  { colorId: "UBR", label: "Grixis" },
  { colorId: "BRG", label: "Jund" },
  { colorId: "WRG", label: "Naya" },
  { colorId: "WBG", label: "Abzan" },
  { colorId: "WUR", label: "Jeskai" },
  { colorId: "UBG", label: "Sultai" },
  { colorId: "URG", label: "Temur" },
  { colorId: "WBR", label: "Mardu" },
];
export const fourColorGroups = [
  { colorId: "WUBR", label: "Yore-Tiller" },
  { colorId: "UBRG", label: "Glint-Eye" },
  { colorId: "WBRG", label: "Dune-Brood" },
  { colorId: "WURG", label: "Ink-Treader" },
  { colorId: "WUBG", label: "Witch-Maw" },
];

export function normalizeColorId(colorId?: string) {
  const selectedColors = new Set((colorId ?? "").toUpperCase().split(""));
  return colorOrder.filter(color => selectedColors.has(color)).join("");
}

export function deckBorderStyle(colorId?: string): CSSProperties {
  const normalizedColorId = normalizeColorId(colorId);
  const gradientColorOrder = gradientColorOrders[normalizedColorId] ?? normalizedColorId;
  const colors = gradientColorOrder.split("")
    .map(color => manaColors[color])
    .filter(Boolean);

  if (colors.length === 0) return {};

  return {
    background: colors.length === 1
      ? colors[0]
      : `linear-gradient(135deg, ${colors.join(", ")})`,
  };
}

