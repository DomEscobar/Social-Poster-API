import { InstagramAPIServer } from './app';
import * as dotenv from 'dotenv';
dotenv.config();

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

const server = new InstagramAPIServer(PORT);
server.start();

