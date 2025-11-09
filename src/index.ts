import { server, port } from './server';

server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
