const permissionLevels = ["owner", "user"];

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

export default {
  permissionLevels,
  canViewDecks,
  canAddDecks,
  canAddGames,
};
