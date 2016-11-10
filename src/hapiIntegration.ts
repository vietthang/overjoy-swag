import { curry, mapObjIndexed } from 'ramda';
import { Server, IReply, Request, IRouteConfiguration, IJoi, IValidationFunction, IRouteFailFunction } from 'hapi';
import Boom = require('boom');
import { Route, ValidateParams } from './types';
import { loadRoutes } from './core';
import { validate, ValidationError } from './validate';

export type CallbackFunction = (error?: Error) => void;

function notImplementedHandler(req: Request, reply: IReply): void {
  reply(Boom.notImplemented());
}

interface HapiValidateParms {
	headers?: boolean | IJoi | IValidationFunction;
	params?: boolean | IJoi | IValidationFunction;
	query?: boolean | IJoi | IValidationFunction;
	payload?: boolean | IJoi | IValidationFunction;
	errorFields?: any;
	failAction?: string | IRouteFailFunction;
	options?: any;
}

function makeHapiValidate(params: ValidateParams): HapiValidateParms {
  return {

    query(value, options, next) {
      validate(params.query, value, next);
    },

    params(value, options, next) {
      validate(params.params, value, next);
    },

    headers(value, options, next) {
      validate(params.headers, value, next);
    },

    payload(value, options, next) {
      validate(params.payload, value, next);
    },

    failAction(request: Request, reply: IReply, source: string, error: any) {
      request.server.log(['error', 'validation'], error);

      if (error instanceof ValidationError) {
        reply({
          source,
          errors: error.errors,
        }).code(400);
      } else {
        reply(Boom.badImplementation());
      }
    },

  };
}

function makeHapiRoute(handlers: {[key: string]: any}, route: Route): IRouteConfiguration {
  const id = route.id;
  let handler;
  if (id) {
    handler = handlers[id];
  } else {
    handler = handlers[[route.method, route.uri].join(' ')];
  }
  if (!handler) {
    handler = notImplementedHandler;
  }

  return {

    method: route.method,

    path: route.uri,

    handler,

    config: {

      validate: makeHapiValidate(route.validate),

    },

  };

}

function transformHandler(transform: string | Function | undefined, handler: any): any {
  if (!handler) {
    return handler;
  }

  if (!transform) {
    return handler;
  }

  if (typeof transform === 'string') {
    return transformHandler(handler, handler => ({ [transform]: handler }));
  }

  if (typeof transform === 'function') {
    return transform(handler);
  }

  throw new Error('Invalid transform typeof');
}

export interface Options {

  schema: any;

  handlers: { [key: string]: any };

  handlerTransform: string | Function | undefined;

}

export async function register(server: any, { schema, handlers, handlerTransform }: Options, next: CallbackFunction) {
  try {
    const $server: Server = server;

    const routes = await loadRoutes(schema);

    const transformedHandlers = mapObjIndexed(curry(transformHandler)(handlerTransform), handlers);

    const hapiRoutes = routes.map(curry(makeHapiRoute)(transformedHandlers));

    $server.route(hapiRoutes);

    next();
  } catch (e) {
    next(e);
  }
}