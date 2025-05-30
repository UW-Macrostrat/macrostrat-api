var api = require("../api"),
  larkin = require("../larkin");

module.exports = function (req, res, next, cb) {
  if (Object.keys(req.query).length < 1) {
    return larkin.info(req, res, next);
  }

  //TODO need to figure out how to implement the alice db connection in larkin or
  //merge the alice db into macrostrat.
  var sql = "SELECT plateid AS plate_id, names AS name FROM public.name_lookup",
    params = [];

  if (req.query.plate_id) {
    sql += " WHERE plateid = ANY(:plate_id)";
    params.push(larkin.parseMultipleIds(req.query.plate_id));
  }

  if ("sample" in req.query) {
    sql += " LIMIT 5";
  }

  larkin.queryPg("alice", sql, params, function (error, result) {
    if (error) {
      if (cb) {
        return cb(error);
      } else {
        return larkin.error(req, res, next, error);
      }
    } else {
      if (cb) {
        cb(null, result.rows);
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
          },
          {
            data: result.rows,
          },
        );
      }
    }
  });
};
