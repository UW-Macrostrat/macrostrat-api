module.exports = function () {
  var request = require("supertest"),
    validators = require("../validators"),
    settings = require("../settings");

  it("should return a tile for original", function (done) {
    request(settings.host)
      .get("/api/v2/maps/burwell/3/2/4/tile.png")
      .expect(validators.aSuccessfulRequest)
      .expect(validators.tile)
      .end(function (error, res) {
        if (error) return done(error);
        done();
      });
  });

  it("should return a tile for vanilla", function (done) {
    request(settings.host)
      .get("/api/v2/maps/burwell/vanilla/3/2/4/tile.png")
      .expect(validators.aSuccessfulRequest)
      .expect(validators.tile)
      .end(function (error, res) {
        if (error) return done(error);
        done();
      });
  });

  it("should return a tile for emphasized", function (done) {
    request(settings.host)
      .get("/api/v2/maps/burwell/emphasized/3/2/4/tile.png")
      .expect(validators.aSuccessfulRequest)
      .expect(validators.tile)
      .end(function (error, res) {
        if (error) return done(error);
        done();
      });
  });
};
