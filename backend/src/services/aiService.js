const axios = require('axios');
const config = require('../config');
const logger = require('../utils/logger');

class AIService {
  constructor() {
    this.baseUrl = config.aiServiceUrl;
    this.enabled = true;
  }

  async detectObjects(imageBuffer) {
    try {
      const response = await axios.post(`${this.baseUrl}/detect`, { image: imageBuffer.toString('base64') }, { timeout: 10000 });
      return response.data;
    } catch (error) {
      logger.error('AI detection error:', error);
      return this.getFallbackDetection();
    }
  }

  async recognizeFace(imageBuffer) {
    try {
      const response = await axios.post(`${this.baseUrl}/recognize-face`, { image: imageBuffer.toString('base64') }, { timeout: 10000 });
      return response.data;
    } catch (error) {
      logger.warn('Face recognition unavailable, using fallback');
      return { matches: [], confidence: 0 };
    }
  }

  async detectAnomaly(data) {
    try {
      const response = await axios.post(`${this.baseUrl}/detect-anomaly`, data, { timeout: 10000 });
      return response.data;
    } catch (error) {
      return { isAnomaly: false, score: 0, reason: 'AI service unavailable' };
    }
  }

  async predictPriority(complaintData) {
    try {
      const response = await axios.post(`${this.baseUrl}/predict-priority`, complaintData, { timeout: 5000 });
      return response.data;
    } catch (error) {
      return { priority: 'medium', confidence: 0.5 };
    }
  }

  async getChatbotResponse(query, context) {
    try {
      const response = await axios.post(`${this.baseUrl}/chatbot`, { query, context }, { timeout: 15000 });
      return response.data;
    } catch (error) {
      return {
        reply: "I'm a smart assistant for VisionGate. I can help with visitor info, complaints, maintenance, and amenity bookings. Please try again later if AI service is unavailable.",
        confidence: 0,
      };
    }
  }

  async classifyComplaint({ title, description, category }) {
    try {
      const response = await axios.post(`${this.baseUrl}/classify-complaint`, { title, description, category }, { timeout: 5000 });
      return response.data;
    } catch (error) {
      return this.getFallbackClassification(title, description, category);
    }
  }

  getFallbackClassification(title, description, category) {
    const text = `${title} ${description}`.toLowerCase();

    const categoryMap = {
      plumbing: ['water', 'leak', 'pipe', 'drain', 'tap', 'toilet', 'sink', 'plumbing', 'sewage', 'overflow'],
      electrical: ['power', 'light', 'switch', 'electrical', 'wiring', 'circuit', 'fuse', 'socket', 'electricity', 'voltage', 'short circuit', 'tripping'],
      security: ['security', 'suspicious', 'intrusion', 'theft', 'unauthorized', 'trespassing', 'gate', 'fence', 'alarm', 'camera', 'break in'],
      cleaning: ['cleaning', 'garbage', 'trash', 'waste', 'dirty', 'litter', 'sweep', 'sanitation', 'hygiene', 'cleanliness', 'unclean'],
      noise: ['noise', 'loud', 'music', 'party', 'disturbance', 'shouting', 'construction noise', 'barking'],
      parking: ['parking', 'vehicle', 'car', 'bike', 'parked', 'blocking', 'parking spot', 'garage', 'two wheeler'],
      pest_control: ['pest', 'cockroach', 'rat', 'mouse', 'termite', 'insect', 'mosquito', 'ant', 'bug', 'infestation'],
      structural: ['crack', 'wall', 'ceiling', 'floor', 'structural', 'damage', 'paint', 'plaster', 'foundation', 'roof', 'leaking roof'],
    };

    let bestCategory = category || 'other';
    let bestScore = 0;
    for (const [cat, keywords] of Object.entries(categoryMap)) {
      const score = keywords.reduce((acc, kw) => acc + (text.includes(kw) ? 1 : 0), 0);
      if (score > bestScore) { bestScore = score; bestCategory = cat; }
    }

    const priorityKeywords = { critical: ['emergency', 'urgent', 'fire', 'flood', 'gas', 'immediate', 'burst'], high: ['severe', 'serious', 'major', 'dangerous', 'unsafe', 'broken', 'not working', 'complete'], medium: ['moderate', 'annoying', 'inconvenience', 'partial'], low: ['minor', 'slight', 'cosmetic', 'small', 'aesthetic'] };
    let bestPriority = 'medium';
    let bestPrioScore = 0;
    for (const [prio, kws] of Object.entries(priorityKeywords)) {
      const score = kws.reduce((acc, kw) => acc + (text.includes(kw) ? 1 : 0), 0);
      if (score > bestPrioScore) { bestPrioScore = score; bestPriority = prio; }
    }

    const departmentMap = {
      'plumbing': 'Plumbing & Sanitation Team',
      'electrical': 'Electrical Maintenance Team',
      'security': 'Security & Surveillance Team',
      'cleaning': 'Housekeeping & Sanitation Team',
      'noise': 'Community Relations Team',
      'parking': 'Parking & Traffic Management',
      'pest_control': 'Pest Control Services',
      'structural': 'Building Maintenance Team',
      'other': 'General Services Team',
    };

    const summary = `${title.length > 60 ? title.substring(0, 60) + '...' : title} — ${bestPriority} priority issue categorized as ${bestCategory.replace('_', ' ')}.`;

    return {
      category: bestCategory,
      priority: bestPriority,
      department: departmentMap[bestCategory] || 'General Services Team',
      summary,
      confidence: bestScore > 0 ? Math.min(0.5 + bestScore * 0.1, 0.95) : 0.4,
    };
  }

  getFallbackDetection() {
    return { objects: [], detections: [], message: 'Using fallback detection' };
  }

  async checkHealth() {
    try {
      const response = await axios.get(`${this.baseUrl}/health`, { timeout: 5000 });
      return response.data;
    } catch (error) {
      return { status: 'unavailable' };
    }
  }
}

module.exports = new AIService();
