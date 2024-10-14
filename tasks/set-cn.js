import data from "../customcards.json" assert { type: 'json' };

const set = "MTD";
const beginCn = 85;
const endCn = 126;

data.filter((card) => {
  if (card["set"] !== set) return false;
  if (card["cn"] >= beginCn && card["cn"] <= endCn) return true;
  return false;
})

data.sort((a, b) => {
  return a["name"].localeCompare(b["name"]);
})

let curCn = beginCn;
let i = 0

while (i <= data.length) {
  data[i] = curCn;
  i++;
  curCn++;
}