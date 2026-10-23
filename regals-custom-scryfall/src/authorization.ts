const permissionLevels = ["owner", "user", "collection-recorder"];

const canViewDecks = (permissionLevel: string): boolean => {
  const allowedLevels = ["owner", "user"];

  return allowedLevels.includes(permissionLevel);
};

const canAddDecks = (permissionLevel: string): boolean => {
  const allowedLevels = ["owner"];

  return allowedLevels.includes(permissionLevel);
};

const canAddGames = (permissionLevel: string): boolean => {
  const allowedLevels = ["owner"];

  return allowedLevels.includes(permissionLevel);
};

const canAddCardsToCollection = (permissionLevel: string): boolean => {
  const allowedLevels = ["owner", "collection-recorder"];

  return allowedLevels.includes(permissionLevel);
};

export default {
  permissionLevels,
  canViewDecks,
  canAddDecks,
  canAddGames,
  canAddCardsToCollection,
};
