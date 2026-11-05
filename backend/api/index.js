const app = require('../app');
const { connectDB } = require('../shared/db');

module.exports = async (req, res) => {
  await connectDB();
  app(req, res);
};
