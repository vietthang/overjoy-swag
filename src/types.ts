import { Schema } from "Swagger";

export type MethodType = "get"|"post"|"put"|"delete"|"options"|"head"|"patch";

export interface Response {

  readonly headers: Schema;

  readonly payload: Schema;

};

export interface ResponseHash {

  readonly [status: string]: Response;

}

export interface ValidateParams {

  readonly params: Schema;

  readonly query: Schema;

  readonly headers: Schema;

  readonly payload: Schema;

  readonly responses: ResponseHash;

};

export interface Route {

  readonly uri: string;

  readonly method: MethodType;

  readonly consumes: string[];

  readonly produces: string[];

  readonly validate: ValidateParams;

}
