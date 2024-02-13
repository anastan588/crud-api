import { Request, Response } from 'express';
import { database } from './postUser';

export const getUsers = (request, response) => {
    response.statusCode = 200;
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify(database));
  }

