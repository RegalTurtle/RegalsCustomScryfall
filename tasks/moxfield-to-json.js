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
const input = `1 Ancient Animus (CMR) 215 *F* #!Removal
1 Arbor Elf (A25) 160 #!Ramp
1 Archon of Valor's Reach (BBD) 74 *F*
1 Ash Barrens (CMM) 419 #!Land
1 Avacyn, Angel of Hope (2XM) 8
1 Bitter Triumph (LCI) 91 #Discard #!Removal
1 Black Dragon Gate (CLB) 347 #!Land
1 Buried Alive (UMA) 88 #!Tutor
1 Carnage Tyrant (XLN) 179
1 Citadel Gate (CLB) 349 #!Land
1 Corrupted Grafstone (SOI) 253 #!Ramp
1 Crawling Infestation (VOW) 193 #Mill
1 Crawling Sensation (SOI) 199 *F* #Mill
1 Dakmor Salvage (UMA) 240 #!Land
1 Damn (LCC) 191 #!Removal #!Wrath
1 Darkstar Augur (BLB) 90 #Draw
1 Deceptive Landscape (MH3) 219 #!Land
1 Demolition Field (BRO) 260 #!Land
1 Despark (STA) 59 #!Removal
1 Doom Whisperer (GRN) 69 #Mill
1 Drana and Linvala (MOM) 222
1 Emrakul, the Promised End (SLD) 1160
1 Erebos, God of the Dead (SLD) 74 *F* #!Draw
1 Escape Tunnel (MKM) 261 #!Land
1 Evolving Wilds (CLB) 352 #!Land
1 Farewell (NEO) 365 #!Wrath
10 Forest (AKH) 268 #!Land
1 Get Lost (LCI) 14 #!Removal
1 Godless Shrine (RVR) 277 #!Land
1 Goldvein Hydra (OTJ) 167
1 Grimoire of the Dead (ISD) 226 #Discard
1 Grow from the Ashes (DOM) 164 #!Ramp
1 Guardian Project (RVR) 146 *F* #!Draw
1 Helm of the Host (BRR) 19
1 Hornet Queen (P30A) 19 *F*
1 Invasion of Ikoria / Zilortha, Apex of Ikoria (MOM) 190 #!Tutor
1 Key to the City (BRR) 27 #Discard
1 Khalni Ambush / Khalni Territory (ZNR) 192 #!Land #!Removal
1 Krosan Grip (STA) 53 #!Removal
1 Krosan Restorer (DMR) 168 #!Ramp
1 Krosan Verge (C19) 257 #!Land
1 Llanowar Elves (DOM) 168 #!Ramp
1 Manor Gate (CLB) 356 #!Land
1 Medicine Bag (EXO) 133 #Discard #Protection
1 Millikin (DMR) 231 #!Ramp
1 Mind Stone (C15) 259 #!Ramp
1 Mind's Eye (BRR) 33 #Draw
1 Natural Order (STA) 54 #!Tutor
1 Nesting Grounds (MH3) 302 #!Land
1 Odric, Lunarch Marshal (PLST) SOI-31
1 Oppression (WOT) 32 #Discard
1 Outrageous Robbery (MKM) 97 #!Draw
1 Panharmonicon (SLD) 605 *F*
1 Path of Ancestry (PLG21) C3 #!Land
1 Path to Exile (2XM) 25 #!Removal
1 Pattern of Rebirth (UMA) 176 #Tutor
1 Peerless Recycling (BLB) 188 #Recursion
5 Plains (MKM) 277 #!Land
1 Primal Command (STA) 55 #Graveyard Hate #!Graveyard Hate #Recursion #Removal #Tutor #!Tutor
1 Return to Nature (THB) 197 #!Graveyard Hate #!Removal
1 Ripples of Undeath (MH3) 107 #Draw
1 Ruin-Lurker Bat (LCI) 33
1 Sejiri Shelter / Sejiri Glacier (ZNR) 37 #!Land #Protection
1 Sheoldred / The True Scriptures (MOM) 125 *F*
1 Sol Ring (SLD) 1074 *E* #!Ramp
1 Stonespeaker Crystal (CLB) 450 #!Graveyard Hate #!Ramp
4 Swamp (MKM) 282 #!Land
1 Swiftfoot Boots (A25) 234 #!Protection
1 Takenuma, Abandoned Mire (NEO) 278 #!Land #Mill #Recursion #!Recursion
1 Tangled Florahedron / Tangled Vale (ZNR) 211 #!Land #!Ramp
1 Thespian's Stage (2XM) 327 #!Land
1 Toxic Deluge (CMM) 191 #!Wrath
1 Underrealm Lich (GRN) 211 #Mill
1 Vampire Nighthawk (M13) 112
1 Wand of Vertebrae (GRN) 242 *F* #Mill #Recursion
1 Whisperer of the Wilds (FRF) 144 #!Ramp
1 Winding Way (MH1) 193 #Draw
1 Wojek Investigator (MKM) 36 #!Draw
1 Woodland Cemetery (DOM) 248 #!Land
1 World Shaper (RIX) 151 #Mill
1 Wrenn and Realmbreaker (MOM) 217 #Draw
1 Zendikar Resurgent (OGW) 147 #!Draw
1 Zetalpa, Primal Dawn (CMM) 478 *E*`;

// Parse the input and print the output
const parsedOutput = parseCardList(input);
console.log(JSON.stringify(parsedOutput, null, 2));
