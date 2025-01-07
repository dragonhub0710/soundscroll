const express = require("express");
const multer = require("multer");
const router = express.Router();
const messageController = require("../controllers/message.controller");

// Configure Multer for memory storage
const upload = multer({ storage: multer.memoryStorage() });

// Define article routes
router.post("/", upload.single("file"), messageController.handleQuestions);

module.exports = router;
