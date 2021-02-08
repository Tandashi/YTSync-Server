import express from 'express';


const router = express.Router();

router.get('/', (_, res) => {
  res.status(200).json({
    uptime: process.uptime().toFixed(0),
    version: process.env.npm_package_version
  });
});

export default router;