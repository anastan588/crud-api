import request from 'supertest';
import server from '../server.ts';
import port from '../server.ts';

const BASE_URL = port;

describe('API Tests', () => {
  let createdUserId;

  it('should return an empty array when retrieving all user records', async () => {
    request(server).get(`${BASE_URL}/api/users`).expect(200).expect([], done);
  });

  it('should create a new user successfully', async () => {
    const userData = {
      username: 'Lusia',
      age: 18,
      hobbies: ['reading', 'football'],
    };
    request(server)
      .post(BASE_URL)
      .send(userData)
      .expect(201)
      .expect((response) => {
        assert.strictEqual(response.body.username, userData.username);
        createdUserId = response.body.id;
      })
      .end(done);
  });

  it('should delete an existing user successfully', async () => {
    request(server).delete(`${BASE_URL}/api/users/${createdUserId}`).expect(204, done);
  });
});
