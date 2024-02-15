import { database } from './postUser';
import { validate as uuidValidate } from 'uuid';

export const updateUser = (request, response, userId) => {
  if (!uuidValidate(userId)) {
    response.statusCode = 400;
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify({ message: 'Invalid user ID' }));
  } else {
    const userToUpdate = database.find((user) => user.id === userId);

    if (!userToUpdate) {
      response.statusCode = 404;
      response.setHeader('Content-Type', 'application/json');
      response.end(JSON.stringify({ message: 'User not found' }));
      return;
    }
    let body = '';
    request.on('data', (chunk) => {
      body += chunk;
    });
    request.on('end', () => {
      try {
        const data = JSON.parse(body);
        userToUpdate.username = data.username || userToUpdate.username;
        userToUpdate.age = data.age || userToUpdate.age;
        userToUpdate.hobbies = data.hobbies || userToUpdate.hobbies;
        response.statusCode = 200;
        response.setHeader('Content-Type', 'application/json');
        response.end(JSON.stringify(userToUpdate));
      } catch (error) {
        response.statusCode = 400;
        response.setHeader('Content-Type', 'application/json');
        response.end(JSON.stringify({ message: 'Invalid request body' }));
      }
    });
  }
};
