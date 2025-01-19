import { Router } from "express";
import xss from "xss";
import validation from "../validation.js";
import usersData from "../data/users.js";
const router = Router();

router
  .route("/")
  .get(async (req, res) => {
    // I'm including errors and formData here because it helps with simplifying the EJS
    return res.render("pages/login", {
      errors: undefined,
      formData: undefined,
    });
  })
  .post(async (req, res) => {
    let { username, password } = req.body;
    // XSS checking, for cross-site scripting
    username = xss(username);
    password = xss(password);

    // This is in its own try/catch because if the username can't exist, I want to remind the user
    try {
      username = validation.verifyUsername(username);
    } catch (e) {
      return res.status(400).render("pages/login", {
        errors: [
          "Username must be between 5 and 25 characters, without spaces",
        ],
        formData: {
          username,
          password,
        },
      });
    }
    // Now we try the password, and report back to the user
    let userInfo;
    try {
      password = validation.verifyPassword(password);
      userInfo = await usersData.verifyUser(username, password);
    } catch (e) {
      return res.status(400).render("pages/login", {
        errors: [`Username and password don't match`],
        formData: {
          username,
          password,
        },
      });
    }

    req.session.userInfo = userInfo;

    return res.redirect("/");
  });

export default router;
