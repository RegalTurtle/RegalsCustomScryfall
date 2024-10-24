import cardRoutes from "./cards.js";

import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const constructorMethod = (app) => {
  app.use(express.static(path.join(__dirname, "client")));

  app.use("/cardjson", cardRoutes);
  // similar to switch, always does top to bottom
  app.use("*/customcards.json", async (req, res) => {
    res.sendFile(path.resolve(__dirname, "customcards.json"));
  });

  app.use("*/style.css", async (req, res) => {
    res.sendFile(path.resolve(__dirname, "client/style.css"));
  });

  // Serve the main index.html file
  app.use("/", async (req, res) => {
    res.sendFile(path.resolve(__dirname, "client/index.html"));
  });

  app.use("/card/*", async (req, res) => {
    res.sendFile(path.resolve(__dirname, "client/card.html"));
  });

  app.get("/search/*", async (req, res) => {
    res.sendFile(path.resolve(__dirname, "client/search.html"));
  });
  app.use("*", (req, res) => {
    return res.status(404).json({ error: "Not found" });
  });
};

export default constructorMethod;
