import { Router, type IRouter } from "express";
import { requireAuth } from "../middleware/requireAuth";
import healthRouter from "./health";
import liftsRouter from "./lifts";
import authRouter from "./auth";
import usersRouter from "./users";
import setupRouter from "./setup";
import settingsRouter from "./settings";
import emailRouter from "./email";
import forecastRouter from "./forecast";
import periodComparisonRouter from "./period-comparison";

const router: IRouter = Router();

router.use(requireAuth);
router.use(authRouter);
router.use(healthRouter);
router.use(liftsRouter);
router.use(usersRouter);
router.use(setupRouter);
router.use(settingsRouter);
router.use(emailRouter);
router.use(forecastRouter);
router.use(periodComparisonRouter);

export default router;
