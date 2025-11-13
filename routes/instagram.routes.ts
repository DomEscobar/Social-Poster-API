import { Router } from 'express';
import multer from 'multer';
import * as path from 'path';
import { InstagramController } from '../controllers/InstagramController';

const router = Router();
const instagramController = new InstagramController();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'instagram-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (jpeg, jpg, png, webp) are allowed'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
});

router.post('/post', upload.single('image'), (req, res) => instagramController.post(req, res));

router.post('/post-with-path', (req, res) => instagramController.postWithUrl(req, res));

router.post('/post-with-url', (req, res) => instagramController.postWithExternalUrl(req, res));

export default router;

