import { map, keys, filter, isNil, find, reduce, assoc, mapObjIndexed, chain, has } from "ramda";
import swaggerParser = require("swagger-parser");
import * as Swagger from "Swagger";
import { MethodType, Response, ResponseHash, Route, ValidateParams } from "./types";

const supportedMethods: MethodType[] = ["get", "post", "put", "delete", "options", "head", "patch"];

const anyType: Swagger.SchemaType = ["string", "boolean", "number", "integer", "object", "array", "file"];

function createSchema(
  parameters: Swagger.Parameter[],
  type: string,
  additionalProperties: boolean,
): Swagger.Schema {
  const filteredParams = filter(param => param.in === type, parameters);

  const baseSchema: Swagger.Schema = {
    type: "object",
    additionalProperties,
    properties: {},
  };

  if (filteredParams.length) {
    return reduce(
      (prevValue, param) => assoc(`properties.${param.name}`, param, prevValue),
      baseSchema,
      filteredParams,
    );
  } else {
    return assoc("additionalProperties", true, baseSchema);
  }
}

function createPayloadValidateSchema(parameters: Swagger.Parameter[]): Swagger.Schema {
  const bodyParameter = find(param => param.in === "body", parameters) as Swagger.BodyParameter;
  if (isNil(bodyParameter)) {
    return createSchema(parameters, "formData", false);
  } else {
    return bodyParameter.schema;
  }
}

function swaggerResponseToAPIResponse(response: Swagger.Response): Response {
  let payloadSchema: Swagger.Schema;

  if (response.schema) {
    payloadSchema = response.schema;
  } else {
    payloadSchema = {
      type: anyType,
      additionalProperties: true,
    };
  }

  let headersSchema: Swagger.Schema;

  if (response.headers) {
    headersSchema = response.headers;
  } else {
    headersSchema = {
      type: "object",
      additionalProperties: true,
    };
  }

  return {

    payload: payloadSchema,

    headers: headersSchema,

  };
}

function operationToValidateParams(operation: Swagger.Operation): ValidateParams {
  const parameters: Swagger.Parameter[] = operation.parameters || [];

  const params = createSchema(parameters, "path", false);
  const query = createSchema(parameters, "query", false);
  const headers = createSchema(parameters, "header", true);
  const payload = createPayloadValidateSchema(parameters);

  let responses: ResponseHash = {};

  if (!isNil(operation.responses)) {
    responses = mapObjIndexed(
      (entry: Swagger.Response) => swaggerResponseToAPIResponse(entry),
      operation.responses,
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

export async function loadRoutes(schema: any): Promise<Route[]> {
  const spec = await swaggerParser.validate(schema);
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
        uri: `${spec.basePath}/${pathUri}`,
        method,
        consumes: operation.consumes || spec.consumes || [],
        produces: operation.produces || spec.produces || [],
        validate: operationToValidateParams(operation),
      }),
      pathMethodOperations,
    );

    return routeConfigs;
  }, pathConfigPairs);

  return routes;
}
