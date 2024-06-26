const { cache } = require("sharp");
const { mysql, pg, redis, cacheRefreshKey, postgresDatabases = {} } = require("../credentials.js");

exports.mysql = mysql;

exports.pg = pg;
// This is the default Redis port
exports.redis = redis;
// Generate a hash by running: node -e "console.log(require('uuid/v4')())"
exports.cacheRefreshKey = cacheRefreshKey;

exports.postgresDatabases = postgresDatabases