var api = require("../api"),
    larkin = require("../larkin");

module.exports = function(req, res, next, cb) {
  if (Object.keys(req.query).length < 1) {
    return larkin.info(req, res, next);
  }
  var sql = "WITH RECURSIVE in_proc AS (SELECT count(distinct id) c,project_id from cols where status_code='in process' group by project_id), obs AS (SELECT count(distinct id) co,project_id from cols where status_code='obsolete' group by project_id) SELECT projects.id AS project_id, project, descrip, timescale_id, COUNT(DISTINCT units_sections.col_id) AS t_cols, coalesce(c,0) as in_proccess_cols, coalesce(co,0) as obsolete_cols, COUNT(DISTINCT units_sections.unit_id) AS t_units, round(SUM(cols.col_area),0) as area FROM projects LEFT JOIN cols ON projects.id = cols.project_id LEFT JOIN units_sections ON units_sections.col_id = cols.id LEFT JOIN in_proc using (project_id) left join obs using (project_id)";

  var where = []
  var params = {}

  if (req.query.project_id) {
    where.push("projects.id in (:project_id)")
    params["project_id"] = larkin.parseMultipleIds(req.query.project_id)
  }
  if (where.length) {
    sql += ` WHERE ${where.join(' AND ')}`
  }
  sql += " GROUP BY projects.id";

  //console.log(sql)

  larkin.query(sql, params, function(error, data) {
    if (error) {
      if (cb) {
        return cb(error);
      } else {
        return larkin.error(req, res, next, error);
      }
    }

    if (cb) {
      cb(null, data);
    } else {
      larkin.sendData(req, res, next, {
        format: (api.acceptedFormats.standard[req.query.format]) ? req.query.format : "json",
        bare: (api.acceptedFormats.bare[req.query.format]) ? true : false
      }, {
        data: data
      });
    }


  });
}
