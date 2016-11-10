import { Schema } from './swagger';
import Ajv = require('ajv');
import { ErrorObject } from 'ajv';
import { memoize } from 'ramda';

const ajv = new Ajv();

const getValidateFunction = memoize((schema: Schema) => {
  return ajv.compile(schema);
});

export class ValidationError extends Error {

  public errors: ErrorObject[];

  constructor(errors: ErrorObject[]) {
    super('Validation Error');
    this.errors = errors;
  }

}

class UnknownError extends Error {

  constructor() {
    super('Unknown Error');
  }

}

export type ValidateCallback = (error: Error | null, output?: any) => void;

export function validate(schema: Schema, attributes: any, callback: ValidateCallback): void {
  const validate = getValidateFunction(schema);
  const result = validate(attributes);
  if (!result) {
    if (validate.errors) {
      callback(new ValidationError(validate.errors));
    } else {
      callback(new UnknownError());
    }
  } else {
    callback(null, attributes);
  }
}
