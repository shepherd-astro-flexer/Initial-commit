require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose"); // * We don't need to require passport-local, we just need it installed for the passport-local-mongoose

const app = express();

app.set("view engine", "ejs");

app.use(express.static("public"));

app.use(bodyParser.urlencoded({
  extended: true
}))
// Express session
app.use(session({
  secret: "Our little secret.",
  resave: false,
  saveUninitialized: false
  
}))
// Passport initialize and session
app.use(passport.initialize());
app.use(passport.session());
// MongoDB connect
mongoose.connect("mongodb://127.0.0.1:27017/userDB");
// Mongoose schema
const userSchema = new mongoose.Schema({
  username: String,
  password: String
})
// Plugin for schema
userSchema.plugin(passportLocalMongoose);
// Mongoose model / collection / table name
const User = mongoose.model("User", userSchema);
// Passport Serialize and Deserialize
passport.use(User.createStrategy()); // For local use

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// * Route handlers
// Home
app.route("/")
.get((req, res) => {
  res.render("home");
})
// Secrets
app.route("/secrets")
.get((req, res) => {
  if (req.isAuthenticated) {
    res.render("secrets");
  } else {
    res.redirect("/login");
  }
})

// Register
app.route("/register")
.get((req, res) => {
  res.render("register");
})
.post((req, res) => {
  const username = req.body.username;
  const password = req.body.password;

  User.register({username: username}, password, (err, user) => {
    if (err) {
      console.log(err);
      res.redirect("/register");
    } else {
      passport.authenticate("local")(req, res, () => {
        res.redirect("/secrets");
      })
    }
  })
})
// Login
app.route("/login")
.get((req, res) => {
  res.render("login");
})

app.listen(3000, () => {
  console.log("Server has started on port 3000");
})