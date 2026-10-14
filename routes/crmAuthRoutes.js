import express from "express";
import {
  loginCrm,
  verifyToken,
  getCrmPermissions,
  updateCrmPermissions
} from "../controllers/crmAuthController.js";

const router = express.Router();

router.post("/login", loginCrm);
router.get("/verify", verifyToken);
router.get("/permissions", getCrmPermissions);
router.put("/permissions", updateCrmPermissions);

export default router;
