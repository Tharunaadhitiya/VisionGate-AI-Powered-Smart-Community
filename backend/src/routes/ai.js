const express = require('express');
const { body } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const aiService = require('../services/aiService');

const router = express.Router();

router.post('/chatbot', authenticate, [
  body('query').trim().notEmpty().withMessage('Query is required'),
], validate, async (req, res) => {
  try {
    const { query, context } = req.body;
    const response = await aiService.getChatbotResponse(query, context || []);
    res.json({ success: true, data: response });
  } catch (error) {
    res.json({
      success: true,
      data: {
        reply: "I can help you with visitor management, complaints, maintenance, amenities, and more. How can I assist?",
        confidence: 0.5,
      },
    });
  }
});

router.post('/detect', authenticate, async (req, res) => {
  try {
    const result = await aiService.detectObjects(req.body.image);
    res.json({ success: true, data: result });
  } catch (error) {
    res.json({ success: true, data: { objects: [], message: 'Detection service unavailable' } });
  }
});

router.post('/predict-priority', authenticate, async (req, res) => {
  try {
    const result = await aiService.predictPriority(req.body);
    res.json({ success: true, data: result });
  } catch (error) {
    res.json({ success: true, data: { priority: 'medium', confidence: 0.5 } });
  }
});

module.exports = router;
