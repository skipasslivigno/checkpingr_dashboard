import { Router, type IRouter } from "express";
import { requireAuth } from "../middleware/requireAuth";
import healthRouter from "./health";
import liftsRouter from "./lifts";
import authRouter from "./auth";

const router: IRouter = Router();

router.use(requireAuth);
router.use(authRouter);
router.use(healthRouter);
router.use(liftsRouter);

export default router;
