import { Router, type IRouter } from "express";
import healthRouter from "./health";
import liftsRouter from "./lifts";

const router: IRouter = Router();

router.use(healthRouter);
router.use(liftsRouter);

export default router;
