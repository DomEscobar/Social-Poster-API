import { Router } from 'express';
import multer from 'multer';
import * as path from 'path';
import { TwitterController } from '../controllers/TwitterController';

const router = Router();
const twitterController = new TwitterController();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'twitter-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (jpeg, jpg, png, gif, webp) are allowed'));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

router.post('/post', upload.single('image'), (req, res) => twitterController.post(req, res));

router.post('/post-with-url', (req, res) => twitterController.postWithUrl(req, res));

export default router;

