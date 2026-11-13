const permissionLevels = ["owner", "user", "collection-recorder"];

const canViewDecks = (permissionLevel: string): boolean => {
  const allowedLevels = permissionLevels;

  return allowedLevels.includes(permissionLevel);
};

const canAddDecks = (permissionLevel: string): boolean => {
  const allowedLevels = permissionLevels;

  return allowedLevels.includes(permissionLevel);
};

const canAddGames = (permissionLevel: string): boolean => {
  const allowedLevels = permissionLevels;

  return allowedLevels.includes(permissionLevel);
};

const canAddCardsToCollection = (permissionLevel: string): boolean => {
  const allowedLevels = permissionLevels;

  return allowedLevels.includes(permissionLevel);
};

export default {
  permissionLevels,
  canViewDecks,
  canAddDecks,
  canAddGames,
  canAddCardsToCollection,
};
