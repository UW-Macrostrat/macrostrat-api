var request = require("supertest"),
  validators = require("../validators"),
  settings = require("../settings");

//TODO need to figure out how to implement the alice db connection in larkin or
//merge the alice db into macrostrat.
it("should return metadata", function (done) {
  request(settings.host)
    .get("/defs/plates")
    .expect(validators.aSuccessfulRequest)
    .expect(validators.json)
    .expect(validators.metadata)
    .end(function (error: any, res: any) {
      if (error) return done(error);
      done();
    });
});

it("should return a sample", function (done) {
  this.timeout(5000);
  request(settings.host)
    .get("/defs/plates?sample")
    .expect(validators.aSuccessfulRequest)
    .expect(validators.json)
    .expect(validators.aSample)
    .end(function (error: any, res: any) {
      if (error) return done(error);
      done();
    });
});

it("should return all plates", function (done) {
  request(settings.host)
    .get("/defs/plates?all")
    .expect(validators.aSuccessfulRequest)
    .expect(validators.json)
    .expect(validators.atLeastOneResult)
    .end(function (error: any, res: any) {
      if (error) return done(error);
      done();
    });
});

it("should output CSV", function (done) {
  this.timeout(5000);
  request(settings.host)
    .get("/defs/plates?all&format=csv")
    .expect(validators.aSuccessfulRequest)
    .expect(validators.csv)
    .expect("Content-Type", "text/csv; charset=utf-8")
    .end(function (error: any, res: any) {
      if (error) return done(error);
      done();
    });
});
