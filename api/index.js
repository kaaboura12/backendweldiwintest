const vercelModule = require('../dist/vercel.js');
const handler = vercelModule.default || vercelModule;
module.exports = handler;


