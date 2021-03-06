// express
const express = require("express");
const app = express();
// dotenv (ommit in heorku)
//require("dotenv").config();
// body parser
const bodyParser = require("body-parser");
app.use(bodyParser.json());

//cors
const cors = require("cors");
app.use(cors());

// node-fetch

const { google } = require("googleapis");

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_LINK // server redirect url handler
);
const fetch = require("node-fetch");

app.post("/createAuthLink", cors(), (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: [
      "https://www.googleapis.com/auth/userinfo.email",
      //calendar api scopes]
      "https://www.googleapis.com/auth/calendar",
      "https://www.googleapis.com/auth/contacts",
    ],
    prompt: "consent",
  });

  res.send({ url });
});

app.get("/handleGoogleRedirect", async (req, res) => {
  // get code from url
  const code = req.query.code;
  console.log("server 36 | code", code);
  // get access token
  oauth2Client.getToken(code, async (err, tokens) => {
    if (err) {
      console.log("server 39 | error", err);
      throw new Error("Issue with Login", err.message);
    }
    const accessToken = tokens.access_token;
    const refreshToken = tokens.refresh_token;

    /*res.redirect(
      `http://localhost:3000?accessToken=${accessToken}&refreshToken=${refreshToken}`
    );*/ //original

    let oauth2Client2 = new google.auth.OAuth2(); // create new auth client
    oauth2Client2.setCredentials({ access_token: accessToken }); // use the new auth client with the access_token
    let oauth2 = google.oauth2({
      auth: oauth2Client2,
      version: "v2",
    });

    let { data } = await oauth2.userinfo.get(); // get user info
    const miEmail = data.email;

    res.redirect(
      `${process.env.REDIRECTPAGE}?accessToken=${accessToken}&refreshToken=${refreshToken}&miEmail=${miEmail}&codeGmail=${code}`
    );
  });
});

app.post("/getValidToken", async (req, res) => {
  try {
    const request = await fetch("https://www.googleapis.com/oauth2/v4/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        refresh_token: req.body.refreshToken,
        grant_type: "refresh_token",
      }),
    });

    const data = await request.json();
    console.log("server 74 | data", data.access_token);

    res.json({
      accessToken: data.access_token,
    });
  } catch (error) {
    res.json({ error: error.message });
  }
});

app.listen(process.env.PORT || 8080, () => {
  console.log("listening on port 8080");
});
