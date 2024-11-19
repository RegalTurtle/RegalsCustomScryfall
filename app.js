import express from "express";
const app = express();
import configRoutes from "./routes/index.js";

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
app.set("view engine", "ejs");

configRoutes(app);

app.listen(5000, () => {
  console.log("We've now got a server!");
  console.log("Your routes will be running on http://localhost:5000");
});
