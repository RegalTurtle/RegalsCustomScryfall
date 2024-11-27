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
const input = `1 Ajani, the Greathearted (WAR) 184
1 Ancient Brass Dragon (CLB) 111 *F* #Dragon
1 Anguished Unmaking (SOI) 242 #Removal #!Removal
1 Arcane Sanctum (MM3) 228 #!Land
1 Atarka, World Render (FRF) 149 #Dragon
1 Atsushi, the Blazing Sky (NEO) 134 #Dragon
1 Backdraft Hellkite (C19) 23 #Dragon
1 Beast Within (CLB) 820 #Removal #!Removal
1 Blackblade Reforged (DOM) 211
1 Bladewing the Risen (C17) 163 #Dragon #Recursion
1 Bridgeworks Battle / Tanglespan Bridgeworks (MH3) 249 #Land #Removal
1 Chromatic Lantern (RTR) 226 *F* #Ramp #!Ramp
1 Command Tower (C18) 240 #!Land
1 Counterspell (A25) 50 #Interaction #!Interaction
1 Crucible of the Spirit Dragon (C17) 243 #!Land
1 Crux of Fate (C17) 107 #Wrath
1 Deathbringer Regent (NCC) 246 #Dragon #Wrath
1 Descendants' Path (AVR) 173
1 Despark (WAR) 190 #Removal #!Removal
1 Draconic Lore (CLB) 64 #Draw
1 Dragon Tempest (DTK) 136 #Removal
1 Dragon's Hoard (M19) 232 #Draw #Ramp #!Ramp
1 Dragonlord Ojutai (DTK) 219 #Dragon #Draw
1 Dragonlord's Servant (PL24) 1 *F* #Ramp
1 Dragonspeaker Shaman (DDG) 53 #Ramp
1 Earthquake Dragon (CLB) 588 *F* #Dragon
1 Elemental Bond (C19) 163 #Draw #!Draw
1 Emergence Zone (WAR) 245 #!Land
1 Evolving Wilds (AKH) 242 #!Land
1 Forbidden Orchard (2X2) 323 #!Land
2 Forest (3ED) 304 #!Land
1 Frontier Bivouac (C16) 297 #!Land
1 Ganax, Astral Hunter (CLB) 398 #Dragon
1 Generous Gift (NEC) 84 #Removal #!Removal
1 Haven of the Spirit Dragon (C17) 255 #!Land
1 Intet, the Dreamer (CMD) 204 #Dragon
1 Island (M20) 267 #!Land
1 Island (3ED) 297 #!Land
1 Jungle Shrine (C16) 304 #!Land
1 Korlessa, Scale Singer (CLB) 280 #Dragon #Draw
1 Lathliss, Dragon Queen (M19) 149 #Dragon
1 Lightning Greaves (2XM) 267 #Protection #!Protection
1 Lozhan, Dragons' Legacy (CLB) 281 *F* #Dragon #Removal
1 Mana Confluence (JOU) 163 #!Land
1 Miirym, Sentinel Wyrm (CLB) 284 #Dragon
2 Mountain (XLN) 275 #!Land
1 Mystic Monastery (C19) 262 #!Land
1 Nimbleclaw Adept (CLB) 86 #Dragon #Ramp
1 Nomad Outpost (DDN) 34 #!Land
1 Ojutai, Soul of Winter (C17) 187 #Dragon #Removal
1 Old Gnawbone (AFR) 296 *F* #Dragon #Ramp
1 Ondu Inversion / Ondu Skyruins (ZNR) 30 *F* #!Land #!Wrath
1 Opulent Palace (C16) 313 #!Land
1 Orb of Dragonkind (PAFR) 157a *F* #Ramp
1 Path of Ancestry (C17) 56 #!Land
1 Path to Exile (MM3) 17 #Removal #!Removal
1 Pillar of Origins (XLN) 241 #Ramp
1 Plains (WAR) 250 #!Land
1 Plains (ELD) 251 #!Land
1 Pull from Tomorrow (AKH) 65 #Draw #!Draw
1 Renari, Merchant of Marvels (CLB) 386 *F* #Dragon
1 Resculpt (STX) 51 #Removal #!Removal
1 Return of the Wildspeaker (ELD) 172 #Draw #!Draw
1 Rivaz of the Claw (DMU) 215 #Ramp #Recursion
1 Rush of Knowledge (C14) 123 #Draw
1 Sandsteppe Citadel (KTK) 241 #!Land
1 Sarkhan's Triumph (DTK) 154 #Tutor
1 Savage Lands (ALA) 228 #!Land
1 Scaled Nurturer (CLB) 252 #Dragon #Ramp
1 Scalelord Reckoner (C17) 6 #Dragon #Removal
1 Scourge of Valkas (IMA) 145 #Dragon #Removal
1 Seaside Citadel (C16) 322 #!Land
1 Shadrix Silverquill (STX) 230 #Dragon #Draw
1 Smothering Tithe (RNA) 22 #Ramp
1 Sol Ring (C18) 222 #Ramp #!Ramp
1 Soul-Guide Lantern (BRR) 54 #!Graveyard Hate
1 Sunscorch Regent (C17) 74 #Dragon
2 Swamp (M19) 270 #!Land
1 Swiftfoot Boots (PW22) 4 *F* #Protection #!Protection
1 Swords to Plowshares (C16) 78 #Removal #!Removal
1 Sylvia Brightspear (BBD) 10
1 Taiga (3ED) 287 #!Land
1 Temple of the Dragon Queen (AFR) 357 #!Land
1 Temur Ascendancy (KTK) 207 #Draw
1 Terramorphic Expanse (C18) 286 #!Land
1 Terror of the Peaks (OTJ) 149 #Dragon #Removal
1 Tiamat (AFR) 235 #Dragon #Tutor
1 Twinflame Tyrant (FDN) 97 #Dragon
1 Unclaimed Territory (XLN) 258 #!Land
1 Unwind (DOM) 72 #Interaction #!Interaction
1 Vivid Grove (C15) 318 #!Land
1 Vivid Marsh (MMA) 228 #!Land
1 Vivid Meadow (MMA) 229 #!Land
1 Volcanic Island (3ED) 291 #!Land
1 Xander's Lounge (SNC) 260 #!Land
1 Zendikar Resurgent (POGW) 147p #!Draw #Ramp`;

// Parse the input and print the output
const parsedOutput = parseCardList(input);
console.log(JSON.stringify(parsedOutput, null, 2));
