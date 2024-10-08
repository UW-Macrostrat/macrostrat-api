var api = require("../api");
var async = require("async");
var dbgeo = require("dbgeo");
var gp = require("geojson-precision");
var mapshaper = require("mapshaper");
var larkin = require("../larkin");

module.exports = function (req, res, next, cb) {
  if (Object.keys(req.query).length < 1) {
    larkin.info(req, res, next);
  } else {
    if (req.query.lat && req.query.lng && req.query.shape) {
      return larkin.error(req, res, next, "Invalid request");
    }

    var where = [];
    var params = [];
    var pre = "";

    // Process the parameters
    async.parallel(
      [
        // Lat/lng
        function (callback) {
          if (req.query.lat && req.query.lng) {
            req.query.lng = larkin.normalizeLng(req.query.lng);
            where.push("ST_Intersects(s1.geom, ST_GeomFromText($1, 4326))");
            params.push("POINT(" + req.query.lng + " " + req.query.lat + ")");
          }
          callback(null);
        },

        // shape
        function (callback) {
          if (req.query.shape) {
            // Validate geometry and geometry area
            larkin.queryPg(
              "burwell",
              "SELECT ST_Area($1::geography)/1000000 area",
              [req.query.shape],
              function (error, result) {
                if (error) return callback("Invalid geometry passed");

                if (result.rows[0].area > 100000000) {
                  return callback("Geometry too large");
                }

                pre = `
              WITH shape AS (
                SELECT ST_GeomFromText($1) AS buffer
              )
            `;

                params.push("SRID=4326;" + req.query.shape);

                callback(null);
              },
            );
          } else {
            callback(null);
          }
        },
      ],
      function (error) {
        if (error) {
          return larkin.error(req, res, next, error);
        }
        // If no valid parameters passed, return an Error
        if (where.length < 1 && !("sample" in req.query) && pre.length < 1) {
          if (cb) return cb("No valid parameters passed");
          return larkin.error(req, res, next, "No valid parameters passed");
        }

        if (where.length > 0) {
          where = " WHERE " + where.join(" AND ");
        } else {
          where = "";
        }

        var limit = "sample" in req.query ? " LIMIT 5" : "";

        var sql =
          pre +
          " SELECT s1.map_id, s1.scale, s1.source_id, name, strat_name, age, lith, descrip, comments, best_age_top, best_age_bottom, t_interval AS t_int, b_interval AS b_int, color";
        var join = "";

        // Modify the query if geometry is being requested
        if (req.query.format && api.acceptedFormats.geo[req.query.format]) {
          if (req.query.shape) {
            sql += `,
            CASE
              WHEN ST_Within(s1.geom, shape.buffer)
                THEN ST_AsGeoJSON(s1.geom)
              ELSE ST_AsGeoJSON(ST_Multi(ST_Intersection(s1.geom, shape.buffer)))
            END AS geometry
          `;
            join = `
            JOIN shape ON ST_Intersects(s1.geom, shape.buffer)
          `;
          } else {
            sql += ", ST_AsGeoJSON(geom) geometry";
          }
        }

        sql += `
        FROM carto_new.small s1
        LEFT JOIN (
          SELECT * FROM maps.tiny
          UNION ALL
          SELECT * FROM maps.small
        ) s2 ON s1.map_id = s2.map_id
        LEFT JOIN (
          SELECT * FROM lookup_tiny
          UNION ALL
          SELECT * FROM lookup_small
        ) ls ON ls.map_id = s2.map_id
        ${join}
        ${where}
        ${limit}
      `;
        // console.log(sql)

        larkin.queryPg("burwell", sql, params, function (error, result) {
          if (error) {
            if (cb) return cb(error);
            return larkin.error(req, res, next, error);
          }

          // Requesting geographic data
          if (req.query.format && api.acceptedFormats.geo[req.query.format]) {
            // Convert the db response to a proper FeatureCollection
            dbgeo.parse(
              result.rows,
              {
                geometryColumn: "geometry",
                geometryType: "geojson",
                outputFormat: larkin.getOutputFormat(req.query.format),
              },
              function (error, result) {
                if (error) {
                  if (cb) return cb(error);
                  larkin.error(req, res, next, error);
                } else {
                  // Trim precision if GeoJSON
                  if (larkin.getOutputFormat(req.query.format) === "geojson") {
                    result = gp(result, 5);
                  }

                  // Simplify the output!
                  mapshaper.applyCommands(
                    "-simplify 14% visvalingam weighted",
                    result,
                    function (error, data) {
                      if (cb) return cb(null, result);

                      larkin.sendData(
                        req,
                        res,
                        next,
                        {
                          format: api.acceptedFormats.standard[req.query.format]
                            ? req.query.format
                            : "json",
                          bare: api.acceptedFormats.bare[req.query.format]
                            ? true
                            : false,
                          refs: "source_id",
                        },
                        {
                          data: data ? JSON.parse(data) : result,
                        },
                      );
                    },
                  );
                }
              },
            );
          } else {
            // Not requesting geographic data
            if (cb) return cb(null, result.rows);

            larkin.sendData(
              req,
              res,
              next,
              {
                format: api.acceptedFormats.standard[req.query.format]
                  ? req.query.format
                  : "json",
                bare: api.acceptedFormats.bare[req.query.format] ? true : false,
                compact: true,
                refs: "source_id",
              },
              {
                data: result.rows,
              },
            );
          }
        });
      },
    );
  }
};
