# crud-api

## Description
The task is to implement simple CRUD API.

## To run an application
npm run start:dev - development mode 
npm run start:prod - production mode

## Implemented endpoint api/users:
### GET api/users is used to get all persons
Server should answer with status code 200 and all users records

### GET api/users/{userId}
Server should answer with status code 200 and record with id === userId if it exists
Server should answer with status code 400 and corresponding message if userId is invalid (not uuid)
Server should answer with status code 404 and corresponding message if record with id === userId doesn't exist

### POST api/users is used to create record about new user and store it in database
Server should answer with status code 201 and newly created record
Server should answer with status code 400 and corresponding message if request body does not contain required fields

### PUT api/users/{userId} is used to update existing user
Server should answer with status code 200 and updated record
Server should answer with status code 400 and corresponding message if userId is invalid (not uuid)
Server should answer with status code 404 and corresponding message if record with id === userId doesn't exist

### DELETE api/users/{userId} is used to delete existing user from database
Server should answer with status code 204 if the record is found and deleted
Server should answer with status code 400 and corresponding message if userId is invalid (not uuid)
Server should answer with status code 404 and corresponding message if record with id === userId doesn't exist

### Users are stored as objects that have following properties:
id — unique identifier (string, uuid) generated on server side
username — user's name (string, required)
age — user's age (number, required)
hobbies — user's hobbies (array of strings or empty array, required)