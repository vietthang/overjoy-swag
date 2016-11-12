import 'source-map-support/register';
import 'mocha';
import { Server, Request, IReply } from 'hapi';
import { merge, omit } from 'ramda';
import qs = require('querystring');
import Boom = require('boom');
import fs = require('fs');

import { assert } from './common/assert';
import * as apiLoader from '../src/index';

const api = JSON.parse(fs.readFileSync('./test/data/swagger/petstore-expanded.json', 'utf8'));

const routes = {

  findPets(req: Request, reply: IReply) {
    const { limit } = req.query;

    if (+limit === 1) {
      return reply({ name: 'abc' });
    } else {
      return reply([]);
    }
  },

  addPet(req: Request, reply: IReply) {
    reply(
      merge(
        { id: 1 },
        req.payload,
      )
    );
  },

  'find pet by id': (req: Request, reply: IReply) => {
    const { id } = req.params;

    if (+id === 2) {
      reply({
        id: 2,
        name: 'Chicky',
        tag: 'chiken',
      });
    } else {
      reply(Boom.notFound());
    }
  },

};

const server = new Server();

server.connection({
  port: 0,
  router: {
    stripTrailingSlash: true,
    isCaseSensitive: true,
  },
});

describe('Test Swagger Loader module with Swagger pet store sample', () => {
  // clean up and re-create
  before(() => server.register({
    register: apiLoader,
    options: {
      schema: api,
      handlers: routes,
    },
  }));

  describe('Find pets', () => {
    const validRequest = {
      method: 'GET',
      url: '/api/pets',
      headers: {
        'Content-Type': 'application/json',
      },
    };

    it('Should success and return an valid array', async () => {
      const response = await server.inject(validRequest);

      assert.equal(response.statusCode, 200);
    });

    it('Should reject if include limit is not a number in query', async () => {
      const response = await server.inject(merge(
        validRequest,
        { url: `/api/pets?${qs.stringify({ limit: 'random' })}` },
      ));

      assert.equal(response.statusCode, 400);
    });

    it('Should reject if response value does not match schema', async () => {
      const response = await server.inject(merge(
        validRequest,
        { url: `/api/pets?${qs.stringify({ limit: 1 })}` },
      ));

      assert.equal(response.statusCode, 500);
    });

    it('Should success if include limit is a number in query', async () => {
      const response = await server.inject(merge(
        validRequest,
        { url: `/api/pets?${qs.stringify({ limit: 3 })}` },
      ));

      assert.equal(response.statusCode, 200);
    });

    it('Should success if include tags is a single string in query', async () => {
      const response = await server.inject(merge(
        { url: `/api/pets?${qs.stringify({ tags: 'random' })}` },
        validRequest,
      ));

      assert.equal(response.statusCode, 200);
    });

    it('Should success if include tags is an array of string in query', async () => {
      const response = await server.inject(merge(
        { url: `/api/pets?${qs.stringify({ tags: ['a', 'b', 'c'] })}` },
        validRequest,
      ));

      assert.equal(response.statusCode, 200);
    });
  });

  describe('Add pet', () => {
    const validPayload = {
      id: 100,
      name: 'Awesome',
      tag: 'awesome',
    };

    const validRequest = {
      method: 'POST',
      url: '/api/pets',
      headers: {
        'Content-Type': 'application/json',
      },
      payload: validPayload,
    };

    it('Should reject if body is missing', async () => {
      const response = await server.inject(
        omit(['payload'], validRequest)
      );

      assert.equal(response.statusCode, 400);
    });

    it('Should reject if Content-Type is invalid', async () => {
      const response = await server.inject(merge(
        validRequest,
        {
          headers: {
            'Content-Type': 'text/html',
          },
        }
      ));

      assert.equal(response.statusCode, 415);
    });

    it('Should reject if body is not valid', async () => {
      const response = await server.inject(merge(
        validRequest,
        {
          payload: {
            foo: 'bar',
          },
        }
      ));

      assert.equal(response.statusCode, 400);
    });

    it('Should success if body is valid', async () => {
      const response = await server.inject(validRequest);

      assert.equal(response.statusCode, 200);
    });
  });
  //
  describe('Get pet by ID', () => {
    it('Should reject if id is not a number', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/pets/ok',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      assert.equal(response.statusCode, 400);
    });

    it('Should success if id is a non-existing number', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/pets/1',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      assert.equal(response.statusCode, 404);
    });

    it('Should success if id is an existing number', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/pets/2',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      assert.equal(response.statusCode, 200);
    });
  });

  describe('Delete pet', () => {
    it('Should reject if id is not a number', async () => {
      const response = await server.inject({
        method: 'DELETE',
        url: '/api/pets/ok',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      assert.equal(response.statusCode, 400);
    });

    it('Should reject because the route is not implemented', async () => {
      const response = await server.inject({
        method: 'DELETE',
        url: '/api/pets/1',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      assert.equal(response.statusCode, 501);
    });
  });
});
