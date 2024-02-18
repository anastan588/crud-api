import { database } from './postUser';
import { validate as uuidValidate } from 'uuid';

export const getUserById = (request, response, userId) => {
  if (!uuidValidate(userId)) {
    response.statusCode = 400;
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify({ message: 'Invalid user ID' }));
  } else {
    const user = database.find((user) => user.id === userId);
    if (user) {
      response.statusCode = 200;
      response.setHeader('Content-Type', 'application/json');
      response.end(JSON.stringify(user));
    } else {
      response.statusCode = 404;
      response.setHeader('Content-Type', 'application/json');
      response.end(JSON.stringify({ message: 'User not found' }));
    }
  }
};

