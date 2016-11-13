import { curry, mapObjIndexed, merge, omit, keys } from 'ramda';
import {
  Server, IReply, Request, IRouteConfiguration, IJoi, IValidationFunction,
  IRouteFailFunction, IRouteAdditionalConfigurationOptions,
} from 'hapi';
import Boom = require('boom');
import { Schema } from './swagger';
import { Route, ValidateParams, Response } from './types';
import { loadRoutes } from './core';
import { validate, ValidationError } from './validate';

function mergeFn<T1, T2>(onto: T1, from: T2): T1 & T2 {
  Object.keys(from).forEach(key => onto[key] = from[key]);
  return onto as T1 & T2;
}

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

function failAction(request: Request, reply: IReply, source: string, boomError: any) {
  const error: Error = boomError.data;

  request.server.log(['error', 'validation'], error);

  if (error instanceof ValidationError) {
    boomError.output.payload.validation = {
      errors: error.errors,
      source,
    };
  } else {
    boomError.output.payload.validation = {
      source,
    };
  }

  reply(boomError);
}

function makeHapiValidate(params: ValidateParams): HapiValidateParms {
  const hapiParams = { failAction } as HapiValidateParms;

  if (params.query !== undefined) {
    hapiParams.query = (value: any, options: any, next: any) => validate(params.query as Schema, value, next);
  }

  if (params.params !== undefined) {
    hapiParams.params = (value: any, options: any, next: any) => validate(params.params as Schema, value, next);
  }

  if (params.headers !== undefined) {
    hapiParams.headers = (value: any, options: any, next: any) => validate(params.headers as Schema, value, next);
  }

  if (params.payload !== undefined) {
    hapiParams.payload = (value: any, options: any, next: any) => validate(params.payload as Schema, value, next);
  }

  return hapiParams;
}

function makeHapiResponseValidate(response: Response): IValidationFunction {
  return (value: any, options: any, next: any) => validate(response.payload, value, next);
}

function makeHapiRoute(handlers: {[key: string]: any}, route: Route): IRouteConfiguration {
  const id = route.id;
  let handler: any;
  if (id) {
    handler = handlers[id];
  } else {
    handler = handlers[[route.method, route.uri].join(' ')];
  }
  if (!handler) {
    handler = notImplementedHandler;
  }

  // console.log(mapObjIndexed(makeHapiResponseValidate, route.validate.responses))

  let config: IRouteAdditionalConfigurationOptions = {

    validate: makeHapiValidate(route.validate),

  };

  const shouldHasPayload = route.method !== 'get' && route.method !== 'head';

  if (shouldHasPayload) {
    const hasFile = false;

    config = merge(config, {
      payload: {
        allow: route.consumes,
        parse: true,
        maxBytes: 1024 * 1024 * 32,
        output: hasFile ? 'stream' : 'data',
      },
    });
  }

  if (route.validate.responses.default) {
    config = merge(config, {

      response: {

        schema: makeHapiResponseValidate(route.validate.responses.default),

      },

    });
  }

  const responsesWithoutDefault = omit(['default'], route.validate.responses);
  const statuses = keys(responsesWithoutDefault);
  if (statuses.length) {
    config = merge(config, {

      response: {

        status: mapObjIndexed(makeHapiResponseValidate, responsesWithoutDefault),

      },

    });
  }

  return {

    method: route.method,

    path: route.uri,

    handler,

    config,

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
    return transformHandler((handler: any) => ({ [transform]: handler }), handler);
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

export interface RegisterFunction {
  (server: Server, options: Options, next: CallbackFunction): Promise<void>;
  attributes: Object;
}

export const register: RegisterFunction = mergeFn(
  async (server: Server, { schema, handlers = [], handlerTransform }: Options, next: CallbackFunction) => {
    try {
      const routes = await loadRoutes(schema);

      const transformedHandlers = mapObjIndexed(curry(transformHandler)(handlerTransform), handlers);

      const hapiRoutes = routes.map(curry(makeHapiRoute)(transformedHandlers));

      server.route(hapiRoutes);

      next();
    } catch (e) {
      next(e);
    }
  },
  {
    attributes: {
      name: 'overjoy-swag',
      version: '1.0.5',
    },
  },
);
