var larkin = require("../larkin");
//not using require(api). section.ts does not use this file for sections endpoint execution. It uses /v2/sections.ts Pointed to PG Maria db anyways.
//can probably remove this file.
module.exports = function (req, res, next) {
  if (!req.query.section_id) {
    res.json("Need a section_id");
  } else {
    larkin.queryPg(
      "burwell",
      `SELECT ub.id, 
       u1.strat_name AS below, 
       u2.strat_name AS above, 
       ub.t1_prop, 
       i.interval_name,
       i.age_bottom - ((i.age_bottom - i.age_top)*ub.t1_prop) as peg, 
       i.age_bottom, i.age_top, i.interval_color 
FROM macrostrat.unit_boundaries ub 
    LEFT JOIN macrostrat.units u1 ON u1.id = ub.unit_id 
    LEFT JOIN macrostrat.units u2 ON u2.id = ub.unit_id_2 
    JOIN macrostrat.intervals i ON i.id = ub.t1 
    LEFT JOIN macrostrat.units u ON u.id = ub.unit_id WHERE ub.section_id = :section_id`,
      req.query.section_id,
      function (error, result) {
        if (error) {
          larkin.error(req, res, next, "Something went wrong");
        } else {
          larkin.sendData(result, res, null, next);
        }
      },
    );
  }
};
