import { Router } from 'express';
import { BrowserController } from '../controllers/BrowserController';

const router = Router();
const browserController = new BrowserController();

router.post('/config', (req, res) => browserController.setConfig(req, res));

router.get('/config', (req, res) => browserController.getConfig(req, res));

router.delete('/config', (req, res) => browserController.clearConfig(req, res));

export default router;

