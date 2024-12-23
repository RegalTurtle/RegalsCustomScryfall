import express from "express";
import configRoutes from "./routes/index.js";
import dotenv from "dotenv"; // Import dotenv to load environment variables
import session from "express-session";
const app = express();

dotenv.config(); // Loads the variables from .env file

const rewriteUnsupportedBrowserMethods = (req, res, next) => {
  if (req.body && req.body._method) {
    req.method = req.body._method;
    delete req.body._method;
  }
  next();
};

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(rewriteUnsupportedBrowserMethods);
app.use("/public", express.static("public"));
app.use(
  session({
    name: "AuthenticationState",
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
  })
);

app.set("view engine", "ejs");

configRoutes(app);

app.listen(5000, () => {
  console.log("We've now got a server!");
  console.log("Your routes will be running on http://localhost:5000");
});
