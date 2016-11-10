declare module 'swagger-parser' {

  class SwaggerParser {

    validate(api: any): Promise<any>;

  }

  var parser: SwaggerParser;

  export = parser;

}
