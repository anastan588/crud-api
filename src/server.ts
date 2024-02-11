import express, { Request, Response } from 'express';
import process from 'process';
import dotenv from 'dotenv';
import path from 'path';
import { getUsers } from './routes/getUsers';
import { createUser } from './routes/postUser';

dotenv.config();

const port = process.env.PORT || 3000;
console.log(process.env.PORT);

const app = express();

app.get('/users', getUsers);
app.post('/users', createUser);

export function startServer() {
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
}
