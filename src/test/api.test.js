import request from 'supertest';
import { server as serverFortest } from '../server.ts';

const serverUrl = `http://localhost:${process.env.PORT || 3000}`;

console.log(serverUrl);
console.log(serverFortest);

describe('API Tests', () => {
  let serverTest;
  beforeAll((done) => {
    serverTest = serverFortest.listen(process.env.PORT, () => {
      const serverUrl = `http://localhost:${serverTest.address().port}`;
      console.log(serverUrl);
      done();
    });
  });
  afterAll((done) => {
    serverTest.close(() => {
      console.log('Server closed');
      done();
    });
  });

  let createdUserId;
  it('should return an empty array when retrieving all user records', async () => {
    const response = await request(serverTest).get(`/api/users`);
    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  it('should create a new user successfully', async () => {
    const userData = {
      username: 'Lusia',
      age: 18,
      hobbies: ['reading', 'football'],
    };
    request(serverTest)
      .post(`/api/users`)
      .send(userData)
      .expect(201)
      .expect((response) => {
        assert.strictEqual(response.body.username, userData.username);
        createdUserId = response.body.id;
      })
  });

  it('should delete an existing user successfully', async () => {
    request(serverTest)
      .delete(`/api/users/${createdUserId}`)
      .expect(204)
  });
});
