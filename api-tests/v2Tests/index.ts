module.exports = function () {
  describe("root", require("./root"));
  describe("columns", require("./columns"));
  describe("sections", require("./sections"));
  describe("units", require("./units"));
  describe("fossils", require("./fossils"));
  describe("stats", require("./stats"));

  describe("defs", require("./defs"));
  describe("defs/lithologies", require("./defs_lithologies"));
  describe("defs/lithology_attributes", require("./defs_lithology_attributes"));
  describe("defs/columns", require("./defs_columns"));
  describe("defs/econs", require("./defs_econs"));
  describe("defs/environments", require("./defs_environments"));
  describe("defs/intervals", require("./defs_intervals"));
  describe("defs/measurements", require("./defs_measurements"));
  describe("defs/minerals", require("./defs_minerals"));
  describe("defs/timescales", require("./defs_timescales"));
  describe("defs/plates", require("./defs_plates"));
  describe("defs/projects", require("./defs_projects"));
  describe("defs/groups", require("./defs_groups"));
  describe("defs/strat_names", require("./defs_strat_names"));
  describe("defs/strat_name_concepts", require("./defs_strat_name_concepts"));
  describe("defs/structures", require("./defs_structures"));
  describe("defs/refs", require("./defs_refs"));
  describe("defs/sources", require("./defs_sources"));

  describe("paleogeography", require("./paleogeography"));
  describe("geologic_units/gmna", require("./geologic_units_gmna"));
  describe("geologic_units/gmus", require("./geologic_units_gmus"));
  describe("geologic_units/burwell", require("./geologic_units_burwell"));

  describe("carto/small", require("./carto_small"));

  describe("tiles", require("./tiles"));

  describe("mobile/point", require("./mobile_point"));
  describe("mobile/point_details", require("./mobile_point_details"));
  describe("mobile/fossil_collections", require("./mobile_fossil_collections"));
  describe("mobile/macro_summary", require("./mobile_macro_summary"));
  describe("mobile/map_query", require("./mobile_map_query"));
  describe("Mancos test cases", require("./mancos_test_cases"));
};
