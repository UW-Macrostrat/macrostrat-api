module.exports  = {
  port: 5550,
  get host() {
    return "http://localhost:" + this.port;
  },
};
//export {toExport};
