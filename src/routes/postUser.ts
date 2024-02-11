import { Request, Response } from 'express';

// Sample database to store user records
export const database: any[] = [];

export const createUser = (req: Request, res: Response) => {
  const { name, email } = req.body;

  // Check if required fields are present in the request body
  if (!name || !email) {
    return res.status(400).json({ message: 'Name and email are required fields' });
  }

  // Create a new user record
  const user = { id: database.length + 1, name, email };

  // Store the user record in the database
  database.push(user);

  // Respond with the newly created user record
  res.status(201).json(user);
};