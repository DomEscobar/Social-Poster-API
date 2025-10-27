import { InstagramAPIServer } from './app';

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

const server = new InstagramAPIServer(PORT);
server.start();

