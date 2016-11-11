export interface Info {
  title: string;
  version: string;
  description?: string;
  termsOfService?: string;
  contact?: Contact;
  license?: License;
}

export interface Contact {
  name?: string;
  email?: string;
  url?: string;
}

export interface License {
  name: string;
  url?: string;
}

export interface ExternalDocs {
  url: string;
  description?: string;
}

export interface Tag {
  name: string;
  description?: string;
  externalDocs?: ExternalDocs;
}

export interface Example {
  // Example type interface is intentionally loose
}

export interface Header extends BaseSchema {
  type: SchemaType;
}

// ----------------------------- Parameter -----------------------------------
export interface BaseParameter {
  name: string;
  in: string;
  required?: boolean;
  description?: string;
}

export interface BodyParameter extends BaseParameter {
  schema: Schema;
}

export interface NonBodyParameter extends BaseParameter, BaseSchema {
  type: SchemaType;
  collectionFormat?: ParameterCollectionFormat;
  allowEmptyValue?: boolean;
}

export type ParameterCollectionFormat = 'csv' | 'ssv' | 'tsv' | 'pipes' | 'multi';

export type Parameter =
  BodyParameter |
  NonBodyParameter;

// ------------------------------- Path --------------------------------------
export interface Path {
  get?: Operation;
  put?: Operation;
  post?: Operation;
  delete?: Operation;
  options?: Operation;
  head?: Operation;
  patch?: Operation;
  parameters?: [Parameter];
}

// ----------------------------- Operation -----------------------------------
export interface Operation {
  responses: { [responseName: string]: Response };
  summary?: string;
  description?: string;
  externalDocs?: ExternalDocs;
  operationId?: string;
  produces?: [string];
  consumes?: [string];
  parameters?: [Parameter];
  schemes?: [string];
  deprecated?: boolean;
  security?: [Security];
  tags?: [string];
}

// ----------------------------- Response ------------------------------------
export interface Response {
  description: string;
  schema?: Schema;
  headers?: { [headerName: string]: Header };
  examples?: { [exampleName: string]: Example };
}

// ------------------------------ Schema -------------------------------------
export type BaseSchemaType = 'string'|'boolean'|'number'|'integer'|'object'|'array'|'file';
export type SchemaType = BaseSchemaType|BaseSchemaType[]

export interface BaseSchema {
  format?: string;
  title?: string;
  description?: string;
  default?: string|boolean|number|Object;
  multipleOf?: number;
  maximum?: number;
  exclusiveMaximum?: number;
  minimum?: number;
  exclusiveMinimum?: number;
  maxLength?: number;
  minLength?: number;
  pattern?: string;
  maxItems?: number;
  minItems?: number;
  uniqueItems?: boolean;
  maxProperties?: number;
  minProperties?: number;
  enum?: [string|boolean|number|Object];
  type?: SchemaType;
  items?: Schema|Schema[];
}

export interface Schema extends BaseSchema {
  allOf?: Schema[];
  additionalProperties?: boolean;
  properties?: {[propertyName: string]: Schema};
  discriminator?: string;
  readOnly?: boolean;
  xml?: XML;
  externalDocs?: ExternalDocs;
  example?: {[exampleName: string]: Example};
  required?: string[];
}

export interface XML {
  type?: string;
  namespace?: string;
  prefix?: string;
  attribute?: string;
  wrapped?: boolean;
}

// ----------------------------- Security ------------------------------------
export interface BaseSecurity {
  type: string;
  description?: string;
}

export interface BasicAuthenticationSecurity extends BaseSecurity {
  // It's the exact same interface as BaseSecurity
}

export interface ApiKeySecurity extends BaseSecurity {
  name: string;
  in: string;
}

export interface BaseOAuthSecurity extends BaseSecurity {
  flow: string;
}

export interface OAuth2ImplicitSecurity extends BaseOAuthSecurity {
  authorizationUrl: string;
}

export interface OAuth2PasswordSecurity extends BaseOAuthSecurity {
  tokenUrl: string;
  scopes?: OAuthScope[];
}

export interface OAuth2ApplicationSecurity extends BaseOAuthSecurity {
  tokenUrl: string;
  scopes?: OAuthScope[];
}

export interface OAuth2AccessCodeSecurity extends BaseOAuthSecurity {
  tokenUrl: string;
  authorizationUrl: string;
  scopes?: OAuthScope[];
}

export interface OAuthScope {
  [scopeName: string]: string;
}

export type Security =
  BasicAuthenticationSecurity |
  OAuth2AccessCodeSecurity |
  OAuth2ApplicationSecurity |
  OAuth2ImplicitSecurity |
  OAuth2PasswordSecurity |
  ApiKeySecurity;

// --------------------------------- Spec ------------------------------------
export interface Spec {
  swagger: string;
  info: Info;
  externalDocs?: ExternalDocs;
  host?: string;
  basePath?: string;
  schemes?: string[];
  consumes?: string[];
  produces?: string[];
  paths: {[pathName: string]: Path};
  definitions?: {[definitionsName: string]: Schema };
  parameters?: {[parameterName: string]: Parameter};
  responses?: {[responseName: string]: Response };
  security?: Security[];
  securityDefinitions?: { [securityDefinitionName: string]: Security};
  tags?: Tag[];
}
