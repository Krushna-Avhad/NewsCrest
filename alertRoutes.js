import express from "express";
import { getAlerts, createAlert, deleteAlert, clearAllAlerts } from "../controllers/alertController.js";

const router = express.Router();

router.get("/", getAlerts);
router.post("/", createAlert);
router.delete("/:id", deleteAlert);
router.delete("/clear", clearAllAlerts);

export default router;