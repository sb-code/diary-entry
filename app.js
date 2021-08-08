//jshint esversion:6
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const lodash = require("lodash");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const { identity, rearg, indexOf } = require("lodash");
const app = express();

const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require("mongoose-findorcreate");


app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));



// setting up express-session package
app.use(session({
  secret: 'random- secret',
  resave: false,
  saveUninitialized: false,
  //cookie: { secure: true }
}));

// setting up the initialization of passport in middleware
app.use(passport.initialize());
app.use(passport.session());  // setting up passport to use it for sessions


const homeStartingContent = " Home content";
const aboutContent = "Add your Diaries and save them so you can read them later";
const contactContent = "Made by Sanyam bajaj";

mongoose.connect("mongodb://localhost:27017/blogDB", {useNewUrlParser : true});
mongoose.set("useCreateIndex", true);


const BlogSchema = new mongoose.Schema({
  title : {type:String, required: true},
  blogBody : String,
  user_id : String
});

const userSchema = new mongoose.Schema({
  username: {type : String}, 
  password : {type : String },
  googleId : String,
  titles : [String],
  articles : [String]
});

// add a plugin to the userSchema 
userSchema.plugin(passportLocalMongoose); /// used to hash and salt the passwords and save the users in our mongo database, no requirement og=f bcrypt
userSchema.plugin(findOrCreate);

const Blog = new mongoose.model("Blog", BlogSchema );
const User = new mongoose.model("User", userSchema);

// configuration for passportLocalMongoose
passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

/// google authentication strategy
passport.use(new GoogleStrategy({
  clientID: "308269643729-gsghddcjshdhghes0bkb6b7a19m3v51r.apps.googleusercontent.com",
  clientSecret: "FjDbABCqBfgu-kb2g_4liiqG",
  callbackURL: "http://localhost:3000/auth/google/secrets",
  userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
},
function(accessToken, refreshToken, profile, cb) {
  console.log(profile);

  User.findOrCreate({ googleId: profile.id }, function (err, user) {
    return cb(err, user);
  });
}
));



let posts = [];

// app.get("/", function (req, res) {
//   Blog.find({}, function(err, data){
//     if(err) console.log(err);
//     else
//     res.render("login", {content : homeStartingContent, tit : "HOME", posts : data});
//   })  
//   console.log(posts);
// })

// app.get("/home", function(req, res){
//  Blog.find({}, function(err, data){
//    if(err) console.log(err);
//    else
//    res.render("home", {content : homeStartingContent, tit:"HOME", posts : data});
//  })
// });
// User.find({username : "x@y.com"}, function(err, res){
//   if(err) console.log(err);
//   else{
//     if(res[0].articles.length == 0){
//     res[0].articles.push("random-blog");
//     res[0].save(function(){
//       console.log("saved");
//     });
//     }
    
//     console.log(res[0]);
//   }

// })
// app.get("/blogpage", function(req, res){
//   if(req.isAuthenticated()){
//     Blog.find({},  function(err, data){
//       if(err) console.log(err);
//       else
//       res.render("blogpage", {content : homeStartingContent, tit : "HOME",  posts : data});

//     })
//   }
//   else
//   {
//     //res.send("please login");
//     res.redirect("/login");
//   }
// })

app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile'] }));

  app.get('/auth/google/secrets', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/blogpage');
  });

app.get("/blogpage", function(req, res){
  if(req.isAuthenticated()){
    User.findById(req.user.id, function(err, foundUser){
      if(err) console.log(err);
      else{
        if(foundUser){
          res.render("blogpage", {content : homeStartingContent, tit : "HOME", titles : foundUser.titles, articles : foundUser.articles});
        }
        else{
          res.send("no user");
        }
      }
    })
  }
  else{
    res.redirect("/login");
  }
})

// logout
app.get('/logout', function(req, res){
  req.logout();
  res.redirect('/login');
});

/// login page
app.get("/login", function(req, res){
  res.render("login");

});

app.get("/register", function(req, res){
  res.render("register");
});

app.post("/login", function(req, res){
  var user = new User({
    username : req.body.username,
    password : req.body.password
  });

  req.login(user, function(err){
    if(err) {
      console.log(err);
      res.redirect("/register");
    }
    else
    {
      passport.authenticate("local")(req, res, function(){
        console.log("success");
        res.redirect("/blogpage");
      });
      //res.redirect("/register");
      
    }
  });


});

app.get("/secret", function(req, res){
   if(req.isAuthenticated()){
     res.render("secret");
   }else{
     console.log(req.isAuthenticated())
     res.redirect("/login");
   }
  
})

app.post("/register", function(req, res){

  User.register({username : req.body.username}, req.body.password, function(err, user){ // .register is a method provided by PLM before we did it manualy
    if(err){
      //console.log("error ocuured please check");
      console.log(err);
      console.log(req.body.username);
      console.log(req.body.password);
      //res.send("failed");
      res.redirect("register");
    }
    else{   // if no errors
      passport.authenticate("local")(req, res, function(){
        res.redirect("/blogpage"); /// secrets is a temporay page later will be changed to actual blog page
      });

    }
  });
});



app.get("/about", function (req, res) {
  res.render("about", { content: aboutContent, tit: "ABOUT US" });
})
app.get("/contact", function (req, res) {
  res.render("contact", { content: contactContent, tit: "CONTACT US" });
})

app.get("/compose", function (req, res) {
  if(req.isAuthenticated()){
    res.render("compose");
  }else{
    res.redirect("/login");
  }
})
// app.post("/compose", function (req, res) {
//   let post = req.body;
//   console.log(req.body);
//   const postVal = new Blog({
//     title : post.tit,
//     blogBody : post.body
//   });
//   postVal.save();
//   posts.push(post);
//   res.redirect("/blogpage");
// })



app.post("/compose", function(req, res){
  const input_title = req.body.tit;
  const input_blog = req.body.body;
  

  User.findById(req.user.id, function(err, foundUser){
    if(err) console.log(err);
    else{
      if(foundUser){
        foundUser.titles.push(input_title);
        foundUser.articles.push(input_blog);
        foundUser.save(function(){
          console.log("final done");
        })
        //console.log(foundUser.articles);
        res.send("saved");
      }else{
        console.log(req.id);
        res.send("not found");
      }
    }
  })
  //http://localhost:3000/auth/google/secrets
  //308269643729-gsghddcjshdhghes0bkb6b7a19m3v51r.apps.googleusercontent.com ->ID
  //FjDbABCqBfgu-kb2g_4liiqG ->Secret
  


})

app.get("/posts/:postval", function(req, res){
  let val = req.params.postval;
  //val = lodash.lowerCase(val);
  var flag=0;
  var ans;
  console.log(req);
  User.findById(req.user.id, function(err, foundUser){
    if(err) console.log(err);
    else if(foundUser){
      var idx = foundUser.titles.indexOf(val);
      console.log(foundUser.titles[idx]);
      console.log(idx);
      res.render("post", {tit : foundUser.titles[idx], body:foundUser.articles[idx]});
    }
    else{
      res.redirect("login");
    }
  })
})

// app.get("/posts/:postval", function (req, res) {
//   let val = req.params.postval;
//   val=lodash.lowerCase(val);
//   var flag = 0;
//   var ans;
//   Blog.find({}, function(err, data){
//     if(err) console.log(err);
//     else
//     {
//       for (var i = 0; i < data.length; i++) {
//         if (val == data[i].title) {
//           flag = 1;
//           ans=data[i];
//           break;
//         }
//       }
//       if (flag == 1){
//         console.log("Found");
//         res.render("post", {tit : ans.title, body: ans.blogBody} );
//       }
//       else{
//         console.log("Not found");
//         console.log(val);
//         res.send("OK");
//       }

//     }
//   });
  

  
// })















app.listen(process.env.PORT || 3000, function () {
  console.log("Server started on port 3000");
});
