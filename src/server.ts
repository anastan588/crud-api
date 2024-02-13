import process from 'process';
import dotenv from 'dotenv';
import { getUsers } from './routes/getUsers';
import { createUser } from './routes/postUser';
import http from 'http';

dotenv.config();

export const port = process.env.PORT || 3000;
console.log(process.env.PORT);

export const server = http.createServer((req, res) => {
  try {
    if (req.method === 'POST' && req.url.startsWith('/api/users')) {
      createUser(req, res);
    } else if (req.method === 'GET' && req.url.startsWith('/api/users')) {
      getUsers(req, res);
    } else {
      // Handle other routes or methods
      res.statusCode = 404;
      res.end('Not Found');
    }
  } catch (error) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ message: 'Internal Server Error' }));
  }
});
