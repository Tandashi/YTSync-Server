import express from 'express';

import healthRouter from './health/router';

const router = express.Router();

router.use('/health', healthRouter);

export default router;