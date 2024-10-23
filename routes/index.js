import cardRoutes from "./cards.js";

const constructorMethod = (app) => {
  app.use("/card", cardRoutes);
  // similar to switch, always does top to bottom
  app.use("*", (req, res) => {
    return res.status(404).json({ error: "Not foundaa" });
  });
};

export default constructorMethod;
