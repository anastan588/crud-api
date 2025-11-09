import { database } from '../database';
import { v4 as uuidv4 } from 'uuid';


export const createUser = (request, response) => {
  let body = '';
  request.on('data', (chunk) => {
    body += chunk;
  });
  request.on('end', () => {
    try {
      const requestBody = JSON.parse(body);
      const { username, age, hobbies } = requestBody;

      if (!username || !age || !hobbies) {
        response.statusCode = 400;
        response.setHeader('Content-Type', 'application/json');
        return response.end(JSON.stringify({
          message: 'Username, age, and hobbies are required fields',
        }));
      }

      const user = { id: uuidv4(), username, age, hobbies };
      database.push(user);

      response.statusCode = 201;
      response.setHeader('Content-Type', 'application/json');
      response.end(JSON.stringify(user));

    } catch (error) {
      response.statusCode = 400;
      response.setHeader('Content-Type', 'application/json');
      response.end(JSON.stringify({
        message: 'Invalid JSON',
      }));
    }
  });
};
