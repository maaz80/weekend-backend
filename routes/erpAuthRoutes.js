import express from "express";
import { loginErp, verifyToken } from "../controllers/erpAuthController.js";

const router = express.Router();

router.post("/login", loginErp);
router.get("/verify", verifyToken);

export default router;
