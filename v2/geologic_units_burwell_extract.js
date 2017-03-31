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

  const datasetName = Math.random().toString(36).substring(5)
  fs.mkdirSync(`${__dirname}/${datasetName}`)

  async.parallel({
    /*
    You could also use gdal
    gdal_translate -of GTiff PG:'host=localhost port=5439 dbname=elevation user=john schema=sources table=srtm1 where="ST_Intersects(rast, ST_SetSRID(ST_MakeBox2D(ST_MakePoint(-117.5, 44.5), ST_MakePoint(-115.5, 46)), 4326))" mode=2' test.tiff
    */

    elevation: (callback) => {
      exec(`gdal_translate -of GTiff PG:'host=${credentials.pg.host} port=${credentials.pg.port} dbname=elevation user=${credentials.pg.user} schema=sources table=srtm1 where="ST_Intersects(rast, ST_SetSRID(ST_MakeBox2D(ST_MakePoint(-117.5, 44.5), ST_MakePoint(-115.5, 46)), 4326))" mode=2' ${__dirname}/${datasetName}/srtm1.tiff`, (error, stderror, stdout) => {
        if (error) return callback(error)
        callback(null)
      })
    },
    // elevation: (callback) => {
    //   larkin.queryPg('elevation', `
    //     SELECT ST_AsTIFF(ST_Union(rast)) AS rast
    //     FROM sources.srtm1
    //     WHERE ST_Intersects(rast, ST_SetSRID(ST_MakeBox2D(ST_MakePoint($1, $2), ST_MakePoint($3, $4)), 4326))
    //   `, [req.query.min_lng, req.query.min_lat, req.query.max_lng, req.query.max_lat], (error, data) => {
    //     if (error) return callback(error)
    //     console.log('got raster')
    //     const result = Buffer.concat(data.rows.map(d => { return new Buffer(d.rast.buffer) }))
    //     fs.writeFile(`${__dirname}/${datasetName}/srtm1.tiff`, result, 'binary', (error) => {
    //       if (error) {
    //         console.log(error)
    //       }
    //       console.log('wrote', `${__dirname}/${datasetName}/srtm1.tiff`)
    //       callback(null)
    //     })
    //   })
    // },
    geology_shapefile: (callback) => {
      exec(`pgsql2shp -u ${credentials.pg.user} -h ${credentials.pg.host} -p ${credentials.pg.port} -f ${__dirname}/${datasetName}/units.shp burwell "SELECT map_id, ST_Intersection(geom, ST_SetSRID(ST_MakeBox2D(ST_MakePoint(${req.query.min_lng}, ${req.query.min_lat}), ST_MakePoint(${req.query.max_lng}, ${req.query.max_lat})), 4326)) AS geom FROM carto.large WHERE ST_Intersects(geom, ST_SetSRID(ST_MakeBox2D(ST_MakePoint(${req.query.min_lng}, ${req.query.min_lat}), ST_MakePoint(${req.query.max_lng}, ${req.query.max_lat})), 4326))"`, (error) => {
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
      `, [req.query.min_lng, req.query.min_lat, req.query.max_lng, req.query.max_lat], (error, result) => {
        if (error) {
          console.log(error)
        }

        fs.writeFile(`${__dirname}/${datasetName}/unit_attributes.csv`, json2csv({
          data: result.rows
        }), (error, result) => {
          if (error) {
            console.log(error)
          }
          callback(null)
        })

      })
    },
    line_shapefile: (callback) => {
      exec(`pgsql2shp -u ${credentials.pg.user} -h ${credentials.pg.host} -p ${credentials.pg.port} -f ${__dirname}/${datasetName}/lines.shp burwell "SELECT line_id, ST_Intersection(geom, ST_SetSRID(ST_MakeBox2D(ST_MakePoint(${req.query.min_lng}, ${req.query.min_lat}), ST_MakePoint(${req.query.max_lng}, ${req.query.max_lat})), 4326)) AS geom FROM carto.lines_large WHERE ST_Intersects(geom, ST_SetSRID(ST_MakeBox2D(ST_MakePoint(${req.query.min_lng}, ${req.query.min_lat}), ST_MakePoint(${req.query.max_lng}, ${req.query.max_lat})), 4326))"`, (error) => {
        if (error) {
          console.log(error)
        }
        callback(null)
      })
    },
    line_attributes: (callback) => {
      larkin.queryPg('burwell', `
        SELECT line_id, scale, source_id, name, type, direction, descrip
        FROM carto.lines_large
        WHERE ST_Intersects(geom, ST_SetSRID(ST_MakeBox2D(ST_MakePoint($1, $2), ST_MakePoint($3, $4)), 4326))
      `, [req.query.min_lng, req.query.min_lat, req.query.max_lng, req.query.max_lat], (error, result) => {
        if (error) {
          console.log(error)
        }

        fs.writeFile(`${__dirname}/${datasetName}/line_attributes.csv`, json2csv({
          data: result.rows
        }), (error, result) => {
          if (error) {
            console.log(error)
          }
          callback(null)
        })

      })
    },
    metadata: (callback) => {
      let text = `
        Date: ${new Date().toISOString().slice(0, 10)}
        Source: https://macrostrat.org/api/v2/geologic_units/burwell/extract?min_lng=${req.query.min_lng}&min_lat=${req.query.min_lat}&max_lng=${req.query.max_lng}&max_lat=${req.query.max_lat}
        License: CC-BY-4.0 International
        Sources can be found at https://macrostrat.org/api/v2/defs/sources?all
      `
      fs.writeFile(`${__dirname}/${datasetName}/metadata.txt`, text, (error) => {
        if (error) {
          console.log(error)
        }
        callback(null)
      })
    }
  }, (error, result) => {
    if (error) {
      return larkin.error(req, res, next, 'Something went wrong', 500)
    }
    // Zip the resultant files
    exec(`zip -rj ${__dirname}/${datasetName}.zip ${__dirname}/${datasetName}`, (error, stderror, stdout) => {
      // Send the zip archive to the client
      res.sendFile(`${__dirname}/${datasetName}.zip`, (error) => {
        if (error) {
          console.log(error)
        }
        // Delete the original files
        rimraf(`${__dirname}/${datasetName}`, () => {
          fs.unlinkSync(`${__dirname}/${datasetName}.zip`)
        })
      })
    })
  })
}
