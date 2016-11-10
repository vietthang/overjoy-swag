import sourceMapSupport = require('source-map-support');
sourceMapSupport.install();

export { loadRoutes } from './core';
export { register } from './hapiIntegration';
export * from './types';
