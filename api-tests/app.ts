var settings = require("./settings");
//import { toExport as settings } from "./settings";
//var app = require("../../server.ts");
//import { app } from "../../server";
var request = require("supertest");

import * as fs from 'fs';
import * as path from 'path';

// List of all the test files you want to import
const testFiles = [
    'carto_small.ts',
    'columns.ts',
    'defs.ts',
    'defs_columns.ts',
    'defs_econs.ts',
    'defs_environments.ts',
    'defs_groups.ts',
    'defs_intervals.ts',
    'defs_lithologies.ts',
    'defs_lithology_attributes.ts',
    'defs_measurements.ts',
    'defs_minerals.ts',
    'defs_plates.ts',
    'defs_projects.ts',
    'defs_refs.ts',
    'defs_sources.ts',
    'defs_strat_name_concepts.ts',
    'defs_strat_names.ts',
    'defs_structures.ts',
    'defs_timescales.ts',
    'fossils.ts',
    'geologic_units_burwell.ts',
    'geologic_units_gmna.ts',
    'geologic_units_gmus.ts',
    'index.ts',
    'mancos_test_cases.ts',
    'mobile_fossil_collections.ts',
    'mobile_macro_summary.ts',
    'mobile_map_query.ts',
    'mobile_point.ts',
    'mobile_point_details.ts',
    'paleogeography.ts',
    'root.ts',
    'sections.ts',
    'stats.ts',
    'tiles.ts',
    'units.ts'
];

// Path to the v2Tests directory
const testDir = path.join(__dirname, 'v2Tests');

// Mocha `describe` block to group all tests
describe('API Tests', function () {
    // Iterate through the test files and require each one
    testFiles.forEach((file) => {
        console.log(`Loading test file: ${file}`);
        require(path.join(testDir, file)); // Dynamically require each test file
    });
});
