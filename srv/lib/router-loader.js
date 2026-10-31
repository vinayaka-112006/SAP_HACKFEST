const fs = require('node:fs');
const path = require('node:path');
const contract = require('../routes/_stubs/contract.json');
const key = (method, route) => `${method.toUpperCase()} ${route.replace(/:[^/]+/g, ':param').replace(/\/$/, '')}`;
function loadRouters(app, directory = path.join(__dirname, '../routes')) {
  const registry = new Map();
  for (const filename of fs.readdirSync(directory).filter(x => x.endsWith('.router.js')).sort()) {
    const {mount, router, owner} = require(path.join(directory, filename));
    if (typeof mount !== 'string' || !router || !owner) throw new Error(`Invalid router export: ${filename}`);
    // Express 4 public Router API; inspect installed stack to enumerate direct routes.
    for (const layer of router.stack) {
      if (!layer.route) throw new Error(`Use direct route handlers, not nested routers/use middleware: ${filename}`);
      if (typeof layer.route.path !== 'string') throw new Error('Router paths must be strings');
      for (const method of Object.keys(layer.route.methods)) {
        const routeKey = key(method, mount + layer.route.path);
        if (registry.has(routeKey)) throw new Error(`Duplicate route: ${routeKey}`);
        registry.set(routeKey, {owner, stub:false});
      }
    }
    app.use(mount, router);
  }
  for (const endpoint of contract) {
    const url = '/api' + endpoint.path;
    const routeKey = key(endpoint.method, url);
    if (registry.has(routeKey)) continue;
    const example = require(path.join(__dirname, '../../docs/examples', endpoint.example));
    app[endpoint.method.toLowerCase()](url, (_req,res) => res.json(example));
    registry.set(routeKey, {owner:endpoint.owner, stub:true});
  }
  return registry;
}
module.exports = {loadRouters, key};
