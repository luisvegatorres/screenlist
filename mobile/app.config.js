const config = require("./app.json");
module.exports = {
  ...config.expo,
  experiments: { baseUrl: process.env.SCREENLIST_WEB_BASE_PATH || "" },
};
