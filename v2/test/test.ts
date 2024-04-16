var should = require("should");
var settings = require("./settings");
//import { toExport as settings } from "./settings";
var app = require("../../server");
//import { app } from "../../server";
app.port = settings.port;

app.start();

describe("v2", require("./v2Tests"));
