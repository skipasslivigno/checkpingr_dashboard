import { Router, type IRouter } from "express";
import { requireAuth } from "../middleware/requireAuth";
import healthRouter from "./health";
import liftsRouter from "./lifts";
import authRouter from "./auth";
import usersRouter from "./users";
import setupRouter from "./setup";
import settingsRouter from "./settings";

const router: IRouter = Router();

router.use(requireAuth);
router.use(authRouter);
router.use(healthRouter);
router.use(liftsRouter);
router.use(usersRouter);
router.use(setupRouter);
router.use(settingsRouter);

export default router;
