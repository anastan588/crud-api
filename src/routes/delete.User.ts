import { database, setDatabase } from './postUser';
import { validate as uuidValidate } from 'uuid';

export const deleteUser = (request, response, userId) => {
  if (!uuidValidate(userId)) {
    response.statusCode = 400;
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify({ message: 'Invalid user ID' }));
  } else {
    const userIndex = database.findIndex((user) => user.id === userId);

    if (userIndex === -1) {
      response.statusCode = 404;
      response.setHeader('Content-Type', 'application/json');
      response.end(JSON.stringify({ message: 'User not found' }));
      return;
    }

    const data = database.filter((item) => item.id !== userId);
    setDatabase(data);

    response.statusCode = 204;
    response.end(JSON.stringify({ message: 'User was deleted' }));
  }
};
