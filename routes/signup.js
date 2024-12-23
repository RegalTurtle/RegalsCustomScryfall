import { Router } from "express";
import xss from "xss";
import validation from "../validation.js";
import usersData from "../data/users.js";
import session from "express-session";
const router = Router();

router
  .route("/")
  .get(async (req, res) => {
    // I'm including errors and formData here because it helps with simplifying the EJS
    return res.render("pages/signup", {
      errors: undefined,
      formData: undefined,
    });
  })
  .post(async (req, res) => {
    let { firstName, lastName, username, email, password, confirmPassword } =
      req.body;
    // XSS checking, for cross-site scripting
    firstName = xss(firstName);
    lastName = xss(lastName);
    username = xss(username);
    email = xss(email);
    password = xss(password);
    confirmPassword = xss(confirmPassword);

    // go into error checking, collect all errors
    let errors = [];
    try {
      firstName = validation.verifyStr(firstName, `firstName`);
    } catch (e) {
      errors.push(e);
    }
    try {
      lastName = validation.verifyStr(lastName, `lastName`);
    } catch (e) {
      errors.push(e);
    }
    try {
      username = validation.verifyUsername(username, `username`);
    } catch (e) {
      errors.push(e);
    }
    try {
      email = validation.verifyEmail(email, `email`);
    } catch (e) {
      errors.push(e);
    }
    try {
      password = validation.verifyPassword(password, `password`);
    } catch (e) {
      errors.push(e);
    }
    try {
      confirmPassword = validation.verifyPassword(
        confirmPassword,
        `confirmPassword`
      );
    } catch (e) {
      errors.push(e);
    }
    if (password !== confirmPassword) {
      errors.push(`Passwords must match`);
    }

    // if there are errors, re-render the page
    if (errors.length > 0) {
      return res.status(400).render("pages/signup", {
        errors,
        formData: {
          firstName,
          lastName,
          username,
          email,
          password,
          confirmPassword,
        },
      });
    }

    // if no errors, try to input user
    let user;
    try {
      user = await usersData.addUser(
        username,
        password,
        firstName,
        lastName,
        email,
        "none" // change for allowing signups
      );
    } catch (e) {
      return res.status(500).render("pages/signup", {
        errors: [e],
        formData: {
          firstName,
          lastName,
          username,
          email,
          password,
          confirmPassword,
        },
      });
    }

    if (!user)
      return res.status(500).render("pages/signup", {
        errors: [e],
        formData: {
          firstName,
          lastName,
          username,
          email,
          password,
          confirmPassword,
        },
      });

    req.session.userInfo = user;
    return res.redirect("/");
  });

export default router;
