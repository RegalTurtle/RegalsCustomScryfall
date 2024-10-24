import data from "../customcards.json" assert { type: "json" };
import fs from "fs";

// Make a deep copy of the original data
let dataCopy = structuredClone(data);

export const setCnBetweenCns = (beginCn, endCn, set) => {
  // Filter and get the relevant cards
  let filteredData = data.filter((card) => {
    if (card["set"] !== set) return false;
    if (card["cn"] >= beginCn && card["cn"] <= endCn) return true;
    return false;
  });

  // Sort the filtered data by card name
  filteredData.sort((a, b) => a["name"].localeCompare(b["name"]));

  // Modify the `cn` values in the sorted data
  let curCn = beginCn;
  for (let i = 0; i < filteredData.length; i++) {
    filteredData[i]["cn"] = curCn;
    curCn++;
  }

  // Filter `dataCopy` to remove cards in the specified range and set
  dataCopy = dataCopy.filter((card) => {
    if (card["set"] !== set) return true;
    if (card["cn"] >= beginCn && card["cn"] <= endCn) return false;
    return true;
  });

  // Merge filtered data with the modified copy
  let mergedArray = [...filteredData, ...dataCopy];

  // Write the merged array back to the JSON file
  fs.writeFileSync(
    "../customcards.json",
    JSON.stringify(mergedArray, null, 2),
    "utf8"
  );
};

export const sortMTD = () => {
  // White
  setCnBetweenCns(1, 42, "MTD");
  // Blue
  setCnBetweenCns(43, 84, "MTD");
  // Black
  setCnBetweenCns(85, 126, "MTD");
  // Red
  setCnBetweenCns(127, 168, "MTD");
  // Green
  setCnBetweenCns(169, 210, "MTD");
  // Multicolor
  setCnBetweenCns(211, 244, "MTD");
  // Artifact
  setCnBetweenCns(245, 265, "MTD");
  // Land
  setCnBetweenCns(266, 286, "MTD");
};
