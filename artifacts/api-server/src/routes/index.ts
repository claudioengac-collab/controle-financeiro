import { Router, type IRouter } from "express";
import healthRouter from "./health";
import emailRouter from "./email";
import authRouter from "./auth";
import usuariosRouter from "./usuarios";
import lancamentosRouter from "./lancamentos";

const router: IRouter = Router();

router.use(healthRouter);
router.use(emailRouter);
router.use(authRouter);
router.use(usuariosRouter);
router.use(lancamentosRouter);

export default router;
