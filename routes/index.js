import cardJsonRoutes from "./cards.js";
import cardRoutes from "./card.js";
import deckRoutes from "./decks/deckList.js";

import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path
  .dirname(__filename)
  .replace("/routes", "")
  .replace("\\routes", "");

const constructorMethod = (app) => {
  app.get("/", async (req, res) => {
    res.render("pages/home");
  });

  app.use("/cardjson", cardJsonRoutes);

  // Routes for the custom card searcher
  app.use("/custom", cardRoutes);

  // Routes for deck lists
  app.use("/decks", deckRoutes);

  app.get("*/customcards.json", async (req, res) => {
    res.sendFile(path.resolve(__dirname, "customcards.json"));
  });

  app.get("*/style.css", async (req, res) => {
    res.sendFile(path.resolve(__dirname, "client/style.css"));
  });

  app.get("/card/*", async (req, res) => {
    res.render("pages/card");
  });

  app.get("/search/*", async (req, res) => {
    res.sendFile(path.resolve(__dirname, "client/search.html"));
  });

  app.use("*", (req, res) => {
    return res.status(404).json({ error: "Route not found", route: req.route });
  });
};

export default constructorMethod;
