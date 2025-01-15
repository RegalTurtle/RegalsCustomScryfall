import cardJsonRoutes from "./cards.js";
import cardRoutes from "./card.js";
import deckRoutes from "./decks.js";
import loginRoutes from "./login.js";
import signupRoutes from "./signup.js";
import session from "express-session";
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
    res.render("pages/home", { user: req.session.userInfo });
  });

  // Use login routes, but redirect any users that are already signed in to the profile page
  app.use(
    "/login",
    (req, res, next) => {
      if (req.session && req.session.userInfo) {
        return res.redirect("/profile");
      }
      next();
    },
    loginRoutes
  );

  // Use signup routes, but redirect any users that are already signed in to the profile page
  app.use(
    "/signup",
    (req, res, next) => {
      if (req.session && req.session.userInfo) {
        return res.redirect("/profile");
      }
      next();
    },
    signupRoutes
  );

  // Logout route, when hit, logs user out and redirects to home
  // If hit while not logged in, redirect to login
  // This doesn't seem relevant enought to create a whole file for
  app.use(
    "/logout",
    (req, res, next) => {
      if (!req.session || !req.session.userInfo) {
        return res.redirect("/login");
      }
      next();
    },
    async (req, res) => {
      req.session.destroy();
      return res.redirect("/");
    }
  );

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

  app.use("*", (req, res) => {
    return res.status(404).json({ error: "Route not found", route: req.route });
  });
};

export default constructorMethod;
