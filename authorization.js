const permissionLevels = ["owner", "user"];

const canViewDecks = (permissionLevel) => {
  const allowedLevels = ["owner", "user"];

  return allowedLevels.includes(permissionLevel);
};

const canAddDecks = (permissionLevel) => {
  const allowedLevels = ["owner"];

  return allowedLevels.includes(permissionLevel);
};

const mwCanAddDecks = async (req, res, next) => {
  if (canAddDecks(req.session.userInfo?.permissionLevel)) {
    return next();
  }
  return res.redirect(`/login/`);
};

const canAddGames = (permissionLevel) => {
  const allowedLevels = ["owner"];

  return allowedLevels.includes(permissionLevel);
};

export default {
  permissionLevels,
  canViewDecks,
  canAddDecks,
  mwCanAddDecks,
  canAddGames,
};
