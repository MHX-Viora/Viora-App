const { getDefaultConfig } = require('expo/metro-config');
const { createDeveloperHandler } = require('./server/developer/handler.cjs');

const config = getDefaultConfig(__dirname);
const originalEnhanceMiddleware = config.server.enhanceMiddleware;
config.server.enhanceMiddleware = (middleware, server) => {
  const next = originalEnhanceMiddleware ? originalEnhanceMiddleware(middleware, server) : middleware;
  const developer = createDeveloperHandler();
  return (request, response, fallback) => {
    if (request.url?.startsWith('/developers/api/')) return developer(request, response);
    return next(request, response, fallback);
  };
};
module.exports = config;
