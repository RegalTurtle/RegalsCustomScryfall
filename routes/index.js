import cardJsonRoutes from "./cards.js";
import cardRoutes from "./card.js";

import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path
  .dirname(__filename)
  .replace("/routes", "")
  .replace("\\routes", "");

const constructorMethod = (app) => {
  app.get(express.static(path.join(__dirname, "client")));

  app.use("/cardjson", cardJsonRoutes);

  app.use("/card", cardRoutes);

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

  // Serve the main index.html file
  app.get("/", async (req, res) => {
    res.render("pages/index");
    // res.sendFile(path.resolve(__dirname, "client/index.html"));
  });

  app.use("*", (req, res) => {
    return res.status(404).json({ error: "Route not found", route: req.route });
  });
};

export default constructorMethod;
