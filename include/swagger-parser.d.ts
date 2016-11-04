declare module 'swagger-parser' {

  import { Spec as SwaggerSpec } from 'Swagger';

  class SwaggerParser {

    validate(api: any): Promise<SwaggerSpec>;

  }

  var parser: SwaggerParser;

  export = parser;

}
