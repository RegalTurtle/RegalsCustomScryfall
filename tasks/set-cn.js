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

export const incAllCns = (set) => {
  let filteredData = data.filter((card) => {
    if (card["set"] !== set) return false;
    if (card["cn"] >= 250) return false;
    return true;
  });

  for (let i = 0; i < filteredData.length; i++) {
    filteredData[i]["cn"] = filteredData[i]["cn"] + 1;
  }

  dataCopy = dataCopy.filter((card) => {
    if (card["set"] !== set) return true;
    if (card["cn"] >= 250) return true;
    return false;
  });

  let mergedArray = [...filteredData, ...dataCopy];

  fs.writeFileSync(
    "../customcards.json",
    JSON.stringify(mergedArray, null, 2),
    "utf8"
  );
};

export const sortMTD = () => {
  // White
  // setCnBetweenCns(2, 43, "MTD");
  // Blue
  // setCnBetweenCns(44, 85, "MTD");
  // Black
  // setCnBetweenCns(86, 127, "MTD");
  // Red
  // setCnBetweenCns(128, 169, "MTD");
  // Green
  // setCnBetweenCns(170, 211, "MTD");
  // Multicolor
  // setCnBetweenCns(212, 245, "MTD");
  // Artifact
  setCnBetweenCns(246, 265, "MTD");
  // Land
  // setCnBetweenCns(266, 286, "MTD");
};

// incAllCns("MTD");
sortMTD();
