require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose"); // * We don't need to require passport-local, we just need it installed for the passport-local-mongoose
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const findOrCreate = require("mongoose-findorcreate");


const app = express();

app.set("view engine", "ejs");

app.use(express.static("public"));

app.use(bodyParser.urlencoded({
  extended: true
}))
// Express session
app.use(session({
  secret: process.env.SECRET,
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
  password: String,
  googleId: String,
  secret: String
})
// Plugin for schema
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);
// Mongoose model / collection / table name
const User = mongoose.model("User", userSchema);
// Passport Serialize and Deserialize
passport.use(User.createStrategy()); // For local use

passport.serializeUser(function(user, done) {
  done(null, user.id);
});
passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  })
});

passport.use(new GoogleStrategy({
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  callbackURL: "http://localhost:3000/auth/google/secrets"
},
function(accessToken, refreshToken, profile, cb) {
  User.findOrCreate({ googleId: profile.id }, function (err, user) {
    return cb(err, user);
  });
}
));

// * Route handlers
// Home
app.route("/")
.get((req, res) => {
  res.render("home");
})

// OAuth20 autentication
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile'] }));

app.get('/auth/google/secrets', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect secrets.
    res.redirect("/secrets");
  });

// Secrets
app.route("/secrets")
.get((req, res) => {
  if (req.isAuthenticated()) { // ! Don't forget to CALL it!!! put  a set of ()
    User.find({secret: {$ne: null}}, (err, users) => {
      res.render("secrets", {submittedSecrets: users});
    })
  } else {
    res.redirect("/login");
  }
})

// Submit
app.route("/submit")
.get((req, res) => {
  res.render("submit");
})
.post((req, res) => {
  const submittedSecret = req.body.secret;

  console.log(req.user);
  User.findOneAndUpdate({_id: req.user.id}, {secret: submittedSecret}, (err) => {
    if (err) {
      console.log(err);
    } else {
      res.redirect("/secrets");
    }
  })
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
.post((req, res) => {
  const username = req.body.username;
  const password = req.body.password;

  const user = new User({
    username: username,
    password: password
  })

  req.login(user, (err) => {
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, () => {
        res.redirect("/secrets");
      })
    }
  })
})

// Logout
app.get("/logout", (req, res) => {
  req.logout(() => {});
  res.redirect("/");
})

app.listen(3000, () => {
  console.log("Server has started on port 3000");
})