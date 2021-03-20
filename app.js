require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const ejs = require("ejs");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;

const findOrCreate = require("mongoose-findorcreate");

const app = express();

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
    extended: true
  }));

app.use(session({
    secret: "Nosso pequeno segredinho.",
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/userDB", {useNewUrlParser: true});
mongoose.set("useCreateIndex", true);

const userSchema = new mongoose.Schema ({
    email: String,
    password: String,
    googleId: String,
    segredo: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
    done(null, user.id);
  });
  
  passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
      done(err, user);
    });
  });

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/segredo",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
      console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

app.get("/", function(req, res){
    res.render("home");
});

app.get("/auth/google", 
    passport.authenticate('google', { scope: ["profile"] })
);

app.get("/auth/google/segredo", 
    passport.authenticate('google', { failureRedirect: "/entrar" }),
    function(req, res) {
        res.redirect("/segredo");
    });

app.get("/entrar", function(req, res){
    res.render("entrar");
});

app.get("/registrar", function(req, res){
    res.render("registrar");
});;

app.get("/segredo", function(req, res){
    User.find({"segredo": {$ne: null}}, function(err, foundUsers){
        if (err){
            console.log(err);
        } else {
            if (foundUsers) {
                res.render("segredo", {usersComSegredo: foundUsers});
            }
        }
    });
});

app.get("/enviar", function(req, res) {
    if (req.isAuthenticated()){
        res.render("enviar");
    } else {
        res.redirect("/entrar");
    }
});

app.post("/enviar", function(req, res){
    const segredoEnviado = req.body.segredo;

    console.log(req.user.id);

    User.findById(req.user.id, function(err, foundUser){
        if (err) {
            console.log(err);
        } else {
            if (foundUser) {
                foundUser.segredo = segredoEnviado;
                foundUser.save(function(){
                    res.redirect("/segredo");
                });
            }
        }
    });
});

app.get("/sair", function(req, res){
    req.logout();
    res.redirect("/");
});
//update your code

app.post("/registrar", function(req, res){

    User.register({username: req.body.username}, req.body.password, function(err, user){
        if (err) {
            console.log(err);
            res.redirect("/registrar");
        } else {
            passport.authenticate("local")(req, res, function(){
                res.redirect("/segredo");
            });
        }
    });
});

app.post("/entrar", function(req, res){

    const user = new User({
        username: req.body.username,
        password: req.body.password
    });

    req.login(user, function(err) {
        if (err) {
            console.log(err);
        } else {
            passport.authenticate("local")(req, res, function(){
                res.redirect("/segredo");
            });
        }
    });

});

  app.listen(3000, function(){
    console.log("Servidor rodando em http://localhost:3000");
});