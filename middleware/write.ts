var api = require("../v2/api"),
  larkin = require("../v2/larkin");

module.exports = function (req, res, next, cb) {
  //changes similar to structures.ts:
  //change params from dict to array. add params.push to array
  //add schema to sql table in the from and join clauses
  //change sql where syntax to = ANY($1)
  //update larkin.queryPg function

  //changing params from array back to dict
  let params = {};
  let where = [];

  where = where.length ? "WHERE " + where.join(" AND ") : "";

  let sql = `SELECT col_groups.id AS col_group_id,
       col_group,
       col_group_long AS name,
       COUNT(DISTINCT cols.id) AS t_cols,
       COUNT(DISTINCT units_sections.unit_id) AS t_units,
       cols.project_id
    FROM macrostrat.col_groups
    LEFT JOIN macrostrat.cols ON cols.col_group_id = col_groups.id
    LEFT JOIN macrostrat.units_sections ON units_sections.col_id = cols.id
    ${where}
    GROUP BY col_groups.id, cols.project_id `;


  larkin.queryPg("burwell", sql, params, function (error, data) {
    if (error) {
      if (cb) {
        cb(error);
      } else {
        return larkin.error(req, res, next, error);
      }
    }

    if (cb) {
      cb(null, data?.rows);
    } else {
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
        },
        {
          data: data?.rows,
        },
      );
    }
  });
};
