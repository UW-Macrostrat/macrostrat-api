'use strict'
const api = require('./api')
const larkin = require('./larkin')
const credentials = require('./credentials')
const async = require('async')
const fs = require('fs')
const json2csv = require('json2csv')
const rimraf = require('rimraf')
const exec = require('child_process').exec

module.exports = (req, res, next) => {
  if (Object.keys(req.query).length < 1) {
    return larkin.info(req, res, next);
  }
  if (!req.query.min_lng || !req.query.min_lat || !req.query.max_lat || !req.query.max_lng) {
    return larkin.error(req, res, next, 'Please provide all required parameters', 401)
  }
  // Need min_lat, min_lng, max_lat, max_lng
  req.query.min_lng = larkin.normalizeLng(parseFloat(req.query.min_lng).toFixed(4))
  req.query.min_lat = parseFloat(req.query.min_lat).toFixed(4)
  req.query.max_lng = larkin.normalizeLng(parseFloat(req.query.max_lng).toFixed(4))
  req.query.max_lat = parseFloat(req.query.max_lat).toFixed(4)

  let datasetName = Math.random().toString(36).substring(5)
  fs.mkdirSync(`${__dirname}/${datasetName}`)

  async.parallel({
    elevation: (callback) => {
      larkin.queryPg('elevation', `
        SELECT ST_AsTIFF(ST_Union(rast)) AS rast
        FROM sources.srtm1
        WHERE ST_Intersects(rast, ST_SetSRID(ST_MakeBox2D(ST_MakePoint($1, $2), ST_MakePoint($3, $4)), 4326))
      `, [req.query.min_lng, req.query.min_lat, req.query.max_lng, req.query.max_lat], (error, data) => {
        if (error) return callback(error)

        let result = Buffer.concat(data.rows.map(d => { return new Buffer(d.rast.buffer) }))
        fs.writeFile(`${__dirname}/${datasetName}/srtm1.tiff`, result, 'binary', function(error) {
          if (error) {
            console.log(error)
          }
          callback(null)
        })
      })
    },
    geology_shapefile: (callback) => {
      exec(`pgsql2shp -u ${credentials.pg.user} -h ${credentials.pg.host} -p ${credentials.pg.port} -f ${__dirname}/${datasetName}/geology.shp burwell "SELECT map_id, ST_Intersection(geom, ST_SetSRID(ST_MakeBox2D(ST_MakePoint(${req.query.min_lng}, ${req.query.min_lat}), ST_MakePoint(${req.query.max_lng}, ${req.query.max_lat})), 4326)) AS geom FROM carto.large WHERE ST_Intersects(geom, ST_SetSRID(ST_MakeBox2D(ST_MakePoint(${req.query.min_lng}, ${req.query.min_lat}), ST_MakePoint(${req.query.max_lng}, ${req.query.max_lat})), 4326))"`, (error) => {
        if (error) {
          console.log(error)
        }
        callback(null)
      })
    },
    geology_attributes: (callback) => {
      larkin.queryPg('burwell', `
        SELECT map_id, source_id, scale, name, strat_name, age, lith, descrip, comments, t_int_id, t_int, best_age_top, b_int_id, b_int, best_age_bottom, color
        FROM carto.large
        WHERE ST_Intersects(geom, ST_SetSRID(ST_MakeBox2D(ST_MakePoint($1, $2), ST_MakePoint($3, $4)), 4326))
      `, [req.query.min_lng, req.query.min_lat, req.query.max_lng, req.query.max_lat], function(error, result) {
        if (error) {
          console.log(error)
        }
        var csv = json2csv({
          data: result.rows
        })
        fs.writeFile(`${__dirname}/${datasetName}/attributes.csv`, csv, function(error, result) {
          if (error) {
            console.log(error)
          }
          callback(null)
        })

      })
    },
  }, (error, result) => {
    if (error) {
      return larkin.error(req, res, next, 'Something went wrong', 500)
    }
    // Zip the resultant files
    exec(`zip -rj ${__dirname}/${datasetName}.zip ${__dirname}/${datasetName}/*`, (error, stderror, stdout) => {
      // Send the zip archive to the client
      res.sendFile(`${__dirname}/${datasetName}.zip`)
      // Delete the original files
      rimraf(`${__dirname}/${datasetName}`, () => {
        fs.unlinkSync(`${__dirname}/${datasetName}.zip`)
      })
    })
  })
}
