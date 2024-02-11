import { Request, Response } from 'express';
import { database } from './postUser';

export const getUsers = (req: Request, res: Response) => {
  res.status(200).json(database);
};