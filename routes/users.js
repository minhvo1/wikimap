/*
 * All routes for Users are defined here
 * Since this file is loaded in server.js into api/users,
 *   these routes are mounted onto /users
 * See: https://expressjs.com/en/guide/using-middleware.html#middleware.router
 */

const express = require("express");
const bcrypt = require("bcryptjs");
const router = express.Router();
const { authUser } = require("../middlewares/authUser");

module.exports = (db) => {
  router.get("/login", (req, res) => {
    const userId = req.session.userId;

    if (userId === undefined || !userId) {
      return res.render("login");
    }
    res.redirect("/");
  });

  router.post("/login", (req, res) => {
    const { email, password } = req.body;

    db.query(`SELECT * FROM users WHERE email = $1`, [email])
      .then((data) => {
        const user = data.rows[0];

        if (!user)
          return res.status(422).send({ message: "invalid email/password" });

        const validCredential = bcrypt.compareSync(password, user.password);

        if (!validCredential)
          return res.status(422).send({ message: "invalid email/password" });

        req.session.userId = user.id;

        res.redirect("/");
      })
      .catch((err) => {
        res.status(500).json({ error: err.message });
      });
  });

  router.get("/logout", (req, res) => {
    req.session = null;
    res.render("login");
  });

  router.get("/register", (req, res) => {
    const userId = req.session.userId;

    if (userId === undefined || !userId) {
      return res.render("register");
    }
    res.redirect("/");
  });

  router.post("/register", (req, res) => {
    const { first_name, last_name, email, password } = req.body;
    if (!email.length || !password.length) {
      return res.status(400).send({ message: "invalid email or password" });
    }

    // check email if already in use
    db.query(`SELECT * FROM users WHERE email = $1`, [email])
      .then((result) => {
        const user = result.rows[0];

        //if user exists in db return;
        if (user)
          return res.status(403).send({ message: "user already exists" });

        // create new user
        const hashedPassword = bcrypt.hashSync(password, 10);
        db.query(
          `INSERT INTO users (first_name, last_name, email, password) VALUES ($1, $2, $3, $4) RETURNING *`,
          [first_name, last_name, email, hashedPassword]
        )
          .then((data) => {
            const user = data.rows[0];
            req.session.userId = user.id;
            return res.redirect("/");
          })
          .catch((err) => {
            res.status(500).json({ error: err.message });
          });
      })
      .catch((err) => {
        res.status(500).json({ error: err.message });
      });
  });

  router.get("/me", authUser, (req, res) => {
    db.query(
      `SELECT users.first_name, users.last_name, users.email, ARRAY_AGG(maps.map_name) as map_lists
              FROM users JOIN maps ON maps.creator_id = users.id
              WHERE users.id = $1
              GROUP BY users.first_name, users.last_name, users.email
              `,
      [req.session.userId]
    )
      .then((data) => {
        const user = data.rows[0];
        res.render("profile");
      })
      .catch((err) => {
        res.status(500).json({ error: err.message });
      });
  });
  router.post("/", (req, res) => {
    res.send({ message: "user register" });
  });

  return router;
};
