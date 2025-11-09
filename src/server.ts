import process from 'process';
import dotenv from 'dotenv';
import { getUsers } from './routes/getUsers';
import { getUserById } from './routes/getUserById';
import { createUser } from './routes/postUser';
import http from 'http';
import { updateUser } from './routes/upDateUser';
import { deleteUser } from './routes/delete.User';

dotenv.config();

export const port = process.env.PORT || 3000;
console.log(process.env.PORT);

export const server = http.createServer((req, res) => {
  const userId = getUserIdFromUrl(req.url);
  try {
    if (req.method === 'POST' && req.url.startsWith('/api/users')) {
      createUser(req, res);
    } else if (req.method === 'GET' && req.url.startsWith('/api/users')) {
      if (req.url === '/api/users' || req.url === '/api/users/') {
        getUsers(req, res);
      } else {
        getUserById(req, res, userId);
      }
    } else if (req.method === 'PUT' && req.url.startsWith('/api/users/')) {
      updateUser(req, res, userId);
    } else if (req.method === 'DELETE' && req.url.startsWith('/api/users/')) {
      deleteUser(req, res, userId);
    } else {
      res.statusCode = 404;
      res.end('Not Found');
    }
  } catch (error) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ message: 'Internal Server Error' }));
  }
});

function getUserIdFromUrl(url) {
  const urlArray = url.split('/');
  const userId = urlArray[urlArray.length - 1];
  return userId;
}
