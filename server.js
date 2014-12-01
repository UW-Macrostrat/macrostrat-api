var express = require("express"),
    bodyParser = require("body-parser"),
    v1 = require("./v1"),
    app = express();

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))

// parse application/json
app.use(bodyParser.json())

// parse application/vnd.api+json as json
app.use(bodyParser.json({ type: "application/vnd.api+json" }))

// Load and prefix all routes with /api and appropriate version
app.use("/api/v1", v1);

// If no version specified, fall back to more current
app.use("/api", v1);

if (process.env.NODE_ENV !== "production") {
  app.set("json spaces", 2);
}

var port = 5000;
app.listen(port, function() {
  console.log("Listening on port " + port);
});
