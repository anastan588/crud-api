import { User } from "types";

export let database: User[] = [];

export function getDatabase(): User[] {
  return database;
}

export function setDatabase(data: User[]): void {
  database = data;
}