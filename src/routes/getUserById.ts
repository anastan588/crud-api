import { database } from './postUser';
import validate from 'uuid';


export const getUserById = (request, response, userId) => {
  if (!validate(userId)) {
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


