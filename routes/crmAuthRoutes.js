import express from "express";
import { loginCrm, verifyToken } from "../controllers/crmAuthController.js";

const router = express.Router();

router.post("/login", loginCrm);
router.get("/verify", verifyToken);

export default router;
