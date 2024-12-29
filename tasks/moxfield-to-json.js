function parseCardList(input) {
  return input.split("\n").map((line) => {
    const foilMarker = "*F*";
    const etchedMarker = "*E*";
    const foil = line.includes(foilMarker);
    const etched = line.includes(etchedMarker);

    // Remove the foil marker from the line if it exists
    let sanitizedLine = line.replace(foilMarker, "").trim();
    sanitizedLine = sanitizedLine.replace(etchedMarker, "").trim();

    // Updated regex to extract the count and other fields
    const regex = /^(\d+)\s+(.+)\s\((\w+)\)\s([\w-]+)\s*(#.*)?$/;
    const match = sanitizedLine.match(regex);

    if (!match) {
      throw new Error(`Failed to parse line: ${sanitizedLine}`);
    }

    const [, count, cardName, set, cn, tagsRaw] = match;
    const tags = tagsRaw ? tagsRaw.split(" ").map((tag) => tag.trim()) : [];

    const cardObject = {
      cardName,
      set,
      cn, // Keep as string to support alphanumeric values
      tags,
      ...(foil && { foil: true }), // Include the foil property if applicable
      ...(etched && { etched: true }), // Include the etched property if applicable
      ...(parseInt(count, 10) > 1 && { count: parseInt(count, 10) }), // Include count if greater than 1
    };

    return cardObject;
  });
}

// Example Input
const input = `1 Abandoned Sarcophagus (C20) 236 #Cycle Synergy #Recursion
1 Akroma's Vengeance (C20) 74 #Cycling #!Wrath
1 Alhammarret's Archive (ORI) 221 #Draw
1 Arcane Signet (C20) 237 #Ramp #!Ramp
1 Arid Mesa (MH2) 244 #!Land
1 Ash Barrens (C20) 255 #Cycling #!Land
1 Astral Drift (C20) 76 #Cycle Synergy #Cycling
1 Azorius Signet (C20) 238 #Ramp #!Ramp
1 Boon of the Wish-Giver (IKO) 43 #Cycling #Draw
1 Boros Signet (C20) 239 #Ramp #!Ramp
1 Brallin, Skyshark Rider (C20) 4 *F* #Discard Synergy
1 Cast Out (C20) 79 #Cycling #!Removal {Artifact} #!Removal {Creature} #!Removal {Enchantment}
1 Cathars' Crusade (AVR) 10 #Anthem #!Anthem
1 Chandra, Flamecaller (C20) 145 #Draw #Wrath
1 Chaos Warp (CLB) 785 #!Removal {Artifact} #!Removal {Creature} #!Removal {Enchantment} #!Removal {Land}
1 Cloud of Faeries (DMR) 43 #Cycling
1 Command Tower (C20) 264 #!Land
1 Countervailing Winds (HOU) 32 #Cycling #Interaction
1 Crystalline Resonance (C20) 31 #Cycle Synergy
1 Curator of Mysteries (C20) 109 #Cycle Synergy #Cycling #Discard Synergy
1 Decree of Justice (C20) 85 #Cycling #Token Producer
1 Desert of the Fervent (C20) 266 #Cycling #!Land
1 Desert of the Mindful (C20) 267 #Cycling #!Land
1 Desert of the True (C20) 268 #Cycling #!Land
1 Dismantling Wave (C20) 25 #Cycling #!Removal {Artifact} #!Removal {Enchantment}
1 Dollmaker's Shop / Porcelain Gallery (DSK) 4 #Anthem #Token Producer
1 Drake Haven (C20) 110 #Cycle Synergy #Discard Synergy #Token Producer
1 Drifting Meadow (C20) 271 #Cycling #!Land
1 Eldrazi Monument (SLD) 603 *F* #Anthem
1 Ephara, God of the Polis (BNG) 145 #Draw
1 Esper Sentinel (MH2) 12 #Draw #!Draw
1 Exotic Orchard (C20) 273 #!Land
1 Felidar Retreat (ONC) 66 #Anthem
1 Fellwar Stone (NCC) 367 #Ramp #!Ramp
1 Fierce Guardianship (C20) 35 #!Interaction
1 Flooded Strand (MH3) 220 #!Land
1 Fluctuator (C20) 241 #Cycle Synergy
1 Forgotten Cave (C20) 274 #Cycling #!Land
1 Forsake the Worldly (AKH) 13 #Cycling #!Removal {Artifact} #!Removal {Enchantment}
1 Glacial Fortress (M12) 227 #!Land
1 Herald of the Forgotten (C20) 27 #Cycle Synergy #Recursion
1 Hieroglyphic Illumination (C20) 112 #Cycling #Draw
1 Hollow One (HOU) 163 #Cycling
1 Idyllic Tutor (THB) 24 #!Tutor
1 Irrigated Farmland (C20) 282 #Cycling #!Land
4 Island (IKO) 264 #!Land
1 Izzet Signet (C20) 243 #Ramp #!Ramp
1 Lonely Sandbar (C20) 287 #Cycling #!Land
1 Mana Confluence (JOU) 163 #!Land
1 Mana Drain (OTP) 11 #!Interaction
1 Mind Stone (CLB) 325 #Ramp #!Ramp
1 Mind's Eye (BRR) 96 #Draw
3 Mountain (IKO) 269 #!Land
1 Mystic Monastery (C20) 293 #!Land
1 Neutralize (IKO) 59 #Cycling #!Interaction
1 New Perspectives (C20) 119 #Cycle Synergy #Draw
1 Nimble Obstructionist (C20) 121 #Cycling #Interaction
1 Niv-Mizzet, the Firemind (C20) 225 #Draw #Draw Synergy
1 Ominous Seas (IKO) 61 #Cycling #Draw Synergy
1 Ondu Inversion / Ondu Skyruins (ZNR) 30 #!Land #!Wrath
1 Path to Exile (MD1) 3 #!Removal {Creature}
3 Plains (IKO) 262 #!Land
1 Prairie Stream (C20) 299 #!Land
1 Psychosis Crawler (C20) 248 #Draw Synergy
1 Quakefoot Cyclops (PLST) MH1-142 #Cycling
1 Raugrin Crystal (IKO) 238 #Cycling #!Ramp
1 Reconnaissance Mission (IKO) 65 #Cycling #Draw #!Draw
1 Reliquary Tower (C20) 301 #!Land
1 Remote Isle (C20) 302 #Cycling #!Land
1 Resculpt (STX) 51 #!Removal {Artifact} #!Removal {Creature}
1 Rhystic Study (PCY) 45 #Draw #!Draw
1 Rooting Moloch (IKO) 133 #Cycle Synergy #Cycling
1 Scalding Tarn (MH2) 254 #!Land
1 Sea of Clouds (CLB) 360 #!Land
1 Secluded Steppe (C20) 307 #Cycling #!Land
1 Shabraz, the Skyshark (C20) 14 *F* #Draw Synergy
1 Shivan Reef (C20) 310 #!Land
1 Smoldering Crater (C20) 313 #Cycling #!Land
1 Smothering Tithe (CMM) 57 #Ramp
1 Sol Ring (C20) 252 #Ramp #!Ramp
1 Stroke of Midnight (WOE) 33 *F* #!Removal {Artifact} #!Removal {Creature} #!Removal {Enchantment}
1 Sun Titan (C20) 101 #!Recursion
1 Sundown Pass (VOW) 285 #!Land
1 Surly Badgersaur (C20) 57 #Discard Synergy
1 Swiftfoot Boots (CLB) 339 #!Protection
1 Tectonic Reformation (C20) 162 #Cycling
1 The Locust God (C20) 219 #Draw Synergy #Token Producer
1 Thought Vessel (PLST) C15-55 #Ramp #!Ramp
1 Valiant Rescuer (IKO) 36 #Cycle Synergy #Cycling #Token Producer
1 Vanquish the Horde (PMID) 41p #!Wrath
1 Vizier of Tumbling Sands (C20) 126 #Cycling #Ramp #!Ramp
1 Volcanic Island (3ED) 291 #!Land`;

// Parse the input and print the output
const parsedOutput = parseCardList(input);
console.log(JSON.stringify(parsedOutput, null, 2));
