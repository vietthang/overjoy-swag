import { map, keys, filter, isNil, find, reduce, assocPath, mapObjIndexed, chain, has, omit, merge } from 'ramda';
import * as Swagger from './swagger';
import { MethodType, Response, ResponseHash, Route, ValidateParams } from './types';

const supportedMethods: MethodType[] = ['get', 'post', 'put', 'delete', 'options', 'head', 'patch'];

const defaultResponse: Response = {

  payload: {},

  headers: {},

};

function generateRandomString(): string {
  return Math.random().toString(36).substr(2);
}

function createSchema(
  parameters: Swagger.Parameter[],
  type: Swagger.ParameterLocationForm,
  additionalProperties: boolean,
): Swagger.Schema {
  const filteredParams = map(
    param => param as Swagger.NonBodyParameter,
    filter(
      param => param.in === type,
      parameters,
    ),
  );

  const requiredParams = filter(param => param.required === true, filteredParams);

  if (filteredParams.length) {
    const baseSchema: Swagger.Schema = {
      type: 'object',
      additionalProperties,
      properties: {},
      required: requiredParams.length ? map(param => param.name, requiredParams) : undefined,
    };

    return reduce(
      (prevValue, param) => {
        const schema: Swagger.BaseSchema = omit(['in', 'name', 'required'], param);
        const propertiesPath = ['properties', param.name];

        return assocPath(
          propertiesPath,
          schema,
          prevValue
        );
      },
      baseSchema,
      filteredParams,
    );
  } else {
    return {};
  }
}

function createPayloadValidateSchema(parameters: Swagger.Parameter[]): Swagger.Schema {
  const bodyParameter = find(param => param.in === 'body', parameters) as Swagger.BodyParameter;
  if (isNil(bodyParameter)) {
    return createSchema(parameters, 'formData', false);
  } else {
    return bodyParameter.schema;
  }
}

function swaggerResponseToAPIResponse(response: Swagger.Response): Response {
  let payloadSchema: Swagger.Schema;

  if (response.schema) {
    payloadSchema = response.schema;
  } else {
    payloadSchema = {};
  }

  let headersSchema: Swagger.Schema;

  if (response.headers) {
    headersSchema = response.headers;
  } else {
    headersSchema = {
      type: 'object',
      additionalProperties: true,
    };
  }

  return {

    payload: payloadSchema,

    headers: headersSchema,

  };
}

function operationToValidateParams(method: MethodType, operation: Swagger.Operation): ValidateParams {
  const parameters: Swagger.Parameter[] = operation.parameters || [];

  const params = createSchema(parameters, 'path', false);
  const query = createSchema(parameters, 'query', false);
  const headers = createSchema(parameters, 'header', true);
  const payload = createPayloadValidateSchema(parameters);

  let responses: ResponseHash = { default: defaultResponse };

  if (!isNil(operation.responses)) {
    responses = merge(
      responses,
      mapObjIndexed(
        (entry: Swagger.Response) => swaggerResponseToAPIResponse(entry),
        operation.responses,
      ),
    );
  }

  return {
    params,
    query,
    headers,
    payload,
    responses,
  };
}

export async function loadRoutes(spec: Swagger.Spec): Promise<Route[]> {
  const pathNames = keys(spec.paths);
  const pathConfigPairs = map(pathUri => ({ pathUri, pathConfig: spec.paths[pathUri] }), pathNames);
  const routes = chain(({ pathUri, pathConfig }) => {
    // filter only method that exists in pathConfig
    const pathMethods = filter(method => has(method, pathConfig), supportedMethods);

    // transform pathMethods to method-operation object
    const pathMethodOperations = map(
      method => ({ method, operation: pathConfig[method] as Swagger.Operation }),
      pathMethods,
    );

    // transform method-operation object to routeConfig
    const routeConfigs = map(
      ({ method, operation }) => ({
        uri: `${spec.basePath}${pathUri}`,
        method,
        consumes: operation.consumes || spec.consumes || [],
        produces: operation.produces || spec.produces || [],
        validate: operationToValidateParams(method, operation),
        description: operation.description || '',
        tags: operation.tags || [],
        id: operation.operationId || `operation_${generateRandomString()}`,
      }),
      pathMethodOperations,
    );

    return routeConfigs;
  }, pathConfigPairs);

  return routes;
}
