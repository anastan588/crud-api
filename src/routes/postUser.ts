import { User } from 'types';
import { v4 as uuidv4 } from 'uuid';

export let database: User[] = [];

export function setDatabase(data) {
  database = data;
}

export const createUser = (request, response) => {
  let body = '';
  request.on('data', (chunk) => {
    body += chunk;
  });
  request.on('end', () => {
    const requestBody = JSON.parse(body);
    const { username, age, hobbies } = requestBody;

    if (!username || !age || !hobbies) {
      request.statusCode = 400;
      request.setHeader('Content-Type', 'application/json');
      request.end(
        JSON.stringify({
          message: 'Username, age, and hobbies are required fields',
        })
      );
    } else {
      const user = { id: uuidv4(), username, age, hobbies };
      database.push(user);

      response.statusCode = 201;
      response.setHeader('Content-Type', 'application/json');
      response.end(JSON.stringify(user));
    }
  });
};
