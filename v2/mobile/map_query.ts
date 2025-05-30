var api = require("../api");
var async = require("async");
var larkin = require("../larkin");
var _ = require("underscore");

var LINE_TOLERANCE = 20;

var scaleLookup = {
  0: "tiny",
  1: "tiny",
  2: "tiny",
  3: "tiny",
  4: "small",
  5: "small",
  6: "medium",
  7: "medium",
  8: "medium",
  9: "medium",
  10: "large",
  11: "large",
  12: "large",
  13: "large",
  14: "large",
  15: "large",
  16: "large",
  17: "large",
  18: "large",
  19: "large",
  20: "large",
  21: "large",
  22: "large",
  23: "large",
  24: "large",
};
// Determine a priority order for each scale
var priorities = {
  tiny: ["tiny"],
  small: ["small", "tiny"],
  medium: ["medium", "small", "tiny"],
  large: ["large", "medium", "small", "tiny"],
};
const scaleIsIn = {
  tiny: ["tiny"],
  small: ["small", "tiny"],
  medium: ["medium", "small"],
  large: ["medium", "large"],
};

// https://msdn.microsoft.com/en-us/library/bb259689.aspx
// Calcucate m/px given a latitude and a zoom level
function tolerance(lat, z) {
  return (
    (Math.cos((lat * Math.PI) / 180) * 2 * Math.PI * 6378137) /
    (256 * Math.pow(2, z))
  );
}

function getBestFit(z, data) {
  var currentScale = scaleLookup[z];
  var returnedScales = _.uniq(
    data.map(function (d) {
      return d.scale;
    }),
  );

  var targetScales = [];

  // Iterate on possible scales given our z
  for (var i = 0; i < priorities[currentScale].length; i++) {
    // If that scale is present, record it
    if (returnedScales.indexOf(priorities[currentScale][i]) > -1) {
      targetScales.push(priorities[currentScale][i]);
      if (currentScale != "tiny" && currentScale != "small") {
        break;
      } else if (targetScales.length > 1) {
        break;
      }
    }
  }

  var bestFit = data.filter(function (d) {
    if (targetScales.indexOf(d.scale) > -1) {
      delete d.scale;
      return d;
    }
  });

  return bestFit;
}

function summarizeUnits(units, callback) {
  var stratNames = units.map(function (d) {
    return {
      name: d.strat_name_long,
      id: d.strat_name_id,
    };
  });
  var recorded = {};
  var filteredStratNames = stratNames.filter(function (d) {
    if (!recorded[d.id]) {
      recorded[d.id] = d;
      return d;
    }
  });

  callback({
    ids: units.map(function (d) {
      return d.unit_id;
    }),
    strat_names: filteredStratNames,
    rank_names: _.uniq(
      units.map(function (d) {
        return d.strat_name_long;
      }),
    ).join(", "),
    max_thick: _.reduce(
      units.map(function (d) {
        return d.max_thick;
      }),
      function (a, b) {
        return a + b;
      },
      0,
    ),
    max_min_thick: _.reduce(
      units.map(function (d) {
        if (d.min_thick === 0) {
          return d.max_thick;
        } else {
          return d.min_thick;
        }
      }),
      function (a, b) {
        return a + b;
      },
      0,
    ),
    min_min_thick: _.reduce(
      units.map(function (d) {
        return d.min_thick;
      }),
      function (a, b) {
        return a + b;
      },
      0,
    ),

    b_age: _.max(units, function (d) {
      return d.b_age;
    }).b_age,
    t_age: _.min(units, function (d) {
      return d.t_age;
    }).t_age,
    b_int_name: _.max(units, function (d) {
      return d.b_age;
    }).b_int_name,
    t_int_name: _.min(units, function (d) {
      return d.t_age;
    }).t_int_name,

    pbdb_collections: _.reduce(
      units.map(function (d) {
        return d.pbdb_collections;
      }),
      function (a, b) {
        return a + b;
      },
      0,
    ),
    lith: larkin.summarizeAttribute(units, "lith"),
    environ: larkin.summarizeAttribute(units, "environ"),
    econ: larkin.summarizeAttribute(units, "econ"),
    uniqueIntervals: (function () {
      var min_age = 9999,
        min_age_interval = "",
        max_age = -1,
        max_age_interval = "";

      units.forEach(function (d, i) {
        if (d.t_age < min_age) {
          min_age = d.t_age;
          min_age_interval = d.t_int_name;
        }
        if (d.b_age > max_age) {
          max_age = d.b_age;
          max_age_interval = d.b_int_name;
        }
      });
      return max_age_interval === min_age_interval
        ? min_age_interval
        : max_age_interval + " - " + min_age_interval;
    })(),
  });
}

function buildSQL(scale, where) {
  let scaleJoin = scaleIsIn[scale]
    .map((s) => {
      return `
    SELECT * FROM maps.${s}
    `;
    })
    .join(" UNION ALL ");
  let lookupJoin = scaleIsIn[scale]
    .map((s) => {
      return `
    SELECT * FROM lookup_${s}
    `;
    })
    .join(" UNION ALL ");

  return `
    SELECT
      m.map_id,
      m.source_id,
      COALESCE(m.name, '') AS name,
      COALESCE(m.strat_name, '') AS strat_name,
      COALESCE(m.lith, '') AS lith,
      COALESCE(m.descrip, '') AS descrip,
      COALESCE(m.comments, '') AS comments,
      COALESCE(mm.unit_ids, '{}') AS macro_units,
      COALESCE(mm.strat_name_ids, '{}') AS strat_names,
      COALESCE(mm.lith_ids, '{}') AS liths,
      m.t_interval AS t_int_id,
      ti.age_top::float AS t_int_age,
      ti.interval_name AS t_int_name,
      m.b_interval AS b_int_id,
      tb.age_bottom::float AS b_int_age,
      tb.interval_name AS b_int_name,
      mm.color,
      '${scale}' AS scale,
      (SELECT row_to_json(r) FROM (SELECT
        sources.name,
        COALESCE(sources.url, '') url,
        COALESCE(sources.ref_title, '') ref_title,
        COALESCE(sources.authors, '') authors,
        COALESCE(sources.ref_year, '') ref_year,
        COALESCE(sources.ref_source, '') ref_source,
        COALESCE(sources.isbn_doi, '') isbn_doi) r)::jsonb AS ref
      FROM carto_new.${scale} y
      JOIN (
        ${scaleJoin}
      ) m ON y.map_id = m.map_id
      LEFT JOIN (
        ${lookupJoin}
      ) mm ON mm.map_id = m.map_id
      JOIN maps.sources ON m.source_id = sources.source_id
      LEFT JOIN macrostrat.intervals ti ON m.t_interval = ti.id
      LEFT JOIN macrostrat.intervals tb ON m.b_interval = tb.id
      ${where}
      ORDER BY sources.new_priority DESC
  `;
}

// Accepts a longitude, a latitude, and a zoom level
// Returns the proper burwell data and macrostrat data
module.exports = function (req, res, next) {
  if (Object.keys(req.query).length < 1) {
    return larkin.info(req, res, next);
  }
  if (
    (!req.query.lng || !req.query.lat || !req.query.z) &&
    !req.query.hasOwnProperty("sample")
  ) {
    return larkin.error(
      req,
      res,
      next,
      "You are missing a required parameter",
      400,
    );
  }

  if ("sample" in req.query) {
    req.query.lng = -89.3;
    req.query.lat = 43.03;
    req.query.z = 10;
  }

  req.query.lng = larkin.normalizeLng(req.query.lng);
  req.query.z = parseInt(req.query.z || 0);

  async.parallel(
    {
      elevation: function (cb) {
        require("../elevation")(req, null, null, function (error, data) {
          if (data && data.length) {
            cb(null, data[0].elevation);
          } else {
            cb(null, null);
          }
        });
      },
      lines: function (cb) {
        var scale = scaleLookup[req.query.z];
        larkin.queryPg(
          "burwell",
          `
        SELECT
          m.line_id,
          COALESCE(s.name, '') AS name,
          COALESCE(s.type, s.new_type, '') AS type,
          COALESCE(s.direction, s.new_direction, '') AS direction,
          COALESCE(s.descrip, '') AS descrip,
          '${scale}' AS scale,
          (SELECT row_to_json(r) FROM (SELECT
            source_id,
            name,
            COALESCE(url, '') url,
            COALESCE(ref_title, '') ref_title,
            COALESCE(authors, '') authors,
            COALESCE(ref_year, '') ref_year,
            COALESCE(ref_source, '') ref_source,
            COALESCE(isbn_doi, '') isbn_doi
            FROM maps.sources
            WHERE source_id = m.source_id) r)::jsonb AS ref,
          ST_DistanceSpheroid(m.geom, $1, 'SPHEROID["WGS 84",6378137,298.257223563]') AS distance
        FROM carto_new.lines_${scale} m
        JOIN LATERAL (
            SELECT * FROM lines.tiny
            UNION ALL
            SELECT * FROM lines.small
            UNION ALL
            SELECT * FROM lines.medium
            UNION ALL
            SELECT * FROM lines.large
        ) s ON s.line_id = m.line_id
        LEFT JOIN maps.sources ON m.source_id = sources.source_id
        WHERE sources.status_code = 'active'
        ORDER BY m.geom <-> $1
        LIMIT 1
      `,
          [`SRID=4326;POINT(${req.query.lng} ${req.query.lat})`],
          function (error, result) {
            if (error) return cb(error);

            var bestFit =
              result.rows && result.rows.length ? result.rows[0] : {};

            // Verify that the best fit is within a clickable tolerance
            if (
              bestFit.hasOwnProperty("distance") &&
              bestFit.distance >= tolerance(req.query.lat, req.query.z) * 20
            ) {
              bestFit = {};
            }

            if (bestFit.hasOwnProperty("distance")) {
              delete bestFit.distance;
            }

            cb(null, bestFit);
          },
        );
      },
      burwell: function (cb) {
        var where = [];
        var params = [];
        where.push(
          "ST_Intersects(y.geom, ST_GeomFromText($" +
            (where.length + 1) +
            ", 4326))",
        );
        params.push(`SRID=4326;POINT(${req.query.lng} ${req.query.lat})`);

        // If no valid parameters passed, return an Error
        if (where.length < 1 && !("sample" in req.query)) {
          return cb("No valid parameters passed");
        }

        where.push(`sources.status_code = 'active'`);

        where = " WHERE " + where.join(" AND ");

        let z = req.query.z || 10;
        let sql = buildSQL(scaleLookup[z], where);

        larkin.queryPg("burwell", sql, params, function (error, result) {
          if (error) {
            return cb(error);
          } else {
            var bestFit = result.rows[0] || {};
            var macroUnits =
              bestFit && bestFit.macro_units ? bestFit.macro_units : [];
            var macroNames =
              bestFit && bestFit.strat_names ? bestFit.strat_names : [];

            if (macroUnits.length) {
              require("../units")(
                { query: { unit_id: macroUnits.join(",") } },
                null,
                null,
                function (error, result) {
                  if (error) larkin.trace("Error fetching units", error);
                  if (result && result.length) {
                    // summarizeUnits
                    summarizeUnits(result, function (summary) {
                      if (macroNames.length) {
                        require("../definitions/strat_names")(
                          {
                            query: {
                              strat_name_id: macroNames.join(","),
                            },
                          },
                          null,
                          null,
                          function (error, result) {
                            if (error || !result || !result.length) {
                              return cb(null, {
                                burwell: bestFit,
                                macrostrat: summary,
                              });
                            }
                            summary.rank_names = _.uniq(
                              result.map(function (d) {
                                return d.strat_name_long;
                              }),
                            ).join(", ");
                            summary.strat_names = result.map(function (d) {
                              return {
                                name: d.strat_name_long,
                                id: d.strat_name_id,
                              };
                            });
                            cb(null, {
                              burwell: bestFit,
                              macrostrat: summary,
                            });
                          },
                        );
                      } else {
                        cb(null, {
                          burwell: bestFit,
                          macrostrat: summary,
                        });
                      }
                    });
                  } else {
                    cb(null, {
                      burwell: bestFit,
                      macrostrat: {},
                    });
                  }
                },
              );
            } else if (macroNames.length) {
              require("../definitions/strat_names")(
                {
                  query: {
                    strat_name_id: macroNames.join(","),
                  },
                },
                null,
                null,
                function (error, result) {
                  if (error || !result || !result.length) {
                    larkin.trace("Error fetching strat names ", error);
                    return cb(null, {
                      burwell: bestFit,
                      macrostrat: {},
                    });
                  }
                  cb(null, {
                    burwell: bestFit,
                    macrostrat: {
                      rank_names: _.uniq(
                        result.map(function (d) {
                          return d.strat_name_long;
                        }),
                      ).join(", "),
                      strat_names: result.map(function (d) {
                        return {
                          name: d.strat_name_long,
                          id: d.strat_name_id,
                        };
                      }),
                    },
                  });
                },
              );
            } else {
              cb(null, {
                burwell: bestFit,
                macrostrat: {},
              });
            }
          }
        });
      },
    },
    function (error, data) {
      if (error) return larkin.error(req, res, next, error || null);

      larkin.sendData(
        req,
        res,
        next,
        {
          format: api.acceptedFormats.standard[req.query.format]
            ? req.query.format
            : "json",
          bare: api.acceptedFormats.bare[req.query.format] ? true : false,
        },
        {
          data: {
            elevation: data.elevation,
            burwell: [data.burwell.burwell],
            macrostrat: data.burwell.macrostrat,
            lines: data.lines,
          },
        },
      );
    },
  );
};
