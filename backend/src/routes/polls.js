const express = require('express');
const { body } = require('express-validator');
const Poll = require('../models/Poll');
const PollVote = require('../models/PollVote');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const logger = require('../utils/logger');
const { notifyRole } = require('../services/notificationHelper');

const router = express.Router();

const emitUpdate = (io, poll) => {
  io.to('all').emit('poll:updated', poll);
};

router.get('/', authenticate, async (req, res) => {
  try {
    const now = new Date();
    const polls = await Poll.find({ isActive: true }, { sort: { startDate: -1 } });
    const active = polls.filter((p) => new Date(p.endDate) > now || new Date(p.startDate) <= now);
    for (const p of active) {
      const votes = await PollVote.countByPoll(p._id);
      p.totalVotes = votes.reduce((sum, v) => sum + v.count, 0);
      p.voteDistribution = {};
      for (const v of votes) p.voteDistribution[v.optionIndex] = v.count;
      const myVotes = await PollVote.findByPollAndUser(p._id, req.userId);
      p.myVotes = myVotes.map((v) => v.optionIndex);
    }
    res.json({ success: true, data: { polls: active } });
  } catch (error) {
    logger.error('Get polls error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch polls' });
  }
});

router.post('/', authenticate, authorize('admin'), [
  body('title').trim().notEmpty(),
  body('options').isArray({ min: 2 }).withMessage('At least 2 options required'),
  body('startDate').notEmpty(),
  body('endDate').notEmpty(),
  body('allowMultipleVotes').optional().isBoolean(),
], validate, async (req, res) => {
  try {
    const poll = await Poll.create({
      title: req.body.title,
      description: req.body.description || '',
      category: req.body.category || 'general',
      startDate: req.body.startDate,
      endDate: req.body.endDate,
      options: req.body.options,
      allowMultipleVotes: req.body.allowMultipleVotes || false,
      createdBy: req.userId,
    });
    const io = req.app.get('io');
    await notifyRole(io, 'resident', { type: 'new_poll', title: 'New Poll: ' + req.body.title, body: req.body.description || 'A new poll is available for voting.', data: { severity: 'info', pollId: poll._id?.toString() } });
    res.status(201).json({ success: true, message: 'Poll created', data: { poll } });
  } catch (error) {
    logger.error('Create poll error:', error);
    res.status(500).json({ success: false, message: 'Failed to create poll' });
  }
});

router.post('/:id/vote', authenticate, [
  body('optionIndex').isInt({ min: 0 }),
], validate, async (req, res) => {
  try {
    const poll = await Poll.findById(req.params.id);
    if (!poll) return res.status(404).json({ success: false, message: 'Poll not found' });
    if (new Date(poll.endDate) < new Date()) return res.status(400).json({ success: false, message: 'Poll has ended' });
    if (new Date(poll.startDate) > new Date()) return res.status(400).json({ success: false, message: 'Poll has not started' });
    if (req.body.optionIndex >= (poll.options || []).length) return res.status(400).json({ success: false, message: 'Invalid option' });

    const pollId = parseInt(req.params.id);
    const userId = req.userId;
    const optionIndex = req.body.optionIndex;
    const io = req.app.get('io');

    if (poll.allowMultipleVotes) {
      const existing = await PollVote.findOne({ pollId, userId, optionIndex });
      if (existing) {
        await PollVote.deleteByPollUserAndOption(pollId, userId, optionIndex);
      } else {
        await PollVote.create({ pollId, userId, optionIndex });
      }
    } else {
      const myVotes = await PollVote.findByPollAndUser(pollId, userId);
      const alreadySelected = myVotes.find((v) => v.optionIndex === optionIndex);
      if (alreadySelected) {
        await PollVote.deleteByPollAndUser(pollId, userId);
      } else {
        if (myVotes.length > 0) await PollVote.deleteByPollAndUser(pollId, userId);
        await PollVote.create({ pollId, userId, optionIndex });
      }
    }

    const votes = await PollVote.countByPoll(pollId);
    poll.totalVotes = votes.reduce((sum, v) => sum + v.count, 0);
    poll.voteDistribution = {};
    for (const v of votes) poll.voteDistribution[v.optionIndex] = v.count;
    emitUpdate(io, poll);
    res.json({ success: true, message: 'Vote updated', data: { poll } });
  } catch (error) {
    logger.error('Vote error:', error);
    res.status(500).json({ success: false, message: 'Failed to cast vote' });
  }
});

router.get('/:id/results', authenticate, async (req, res) => {
  try {
    const poll = await Poll.findById(req.params.id);
    if (!poll) return res.status(404).json({ success: false, message: 'Poll not found' });
    const votes = await PollVote.countByPoll(poll._id);
    const totalVotes = votes.reduce((sum, v) => sum + v.count, 0);
    const distribution = {};
    for (const v of votes) distribution[v.optionIndex] = v.count;
    const uniqueVoters = (await PollVote.find({ pollId: parseInt(req.params.id) })).length;
    res.json({ success: true, data: { poll, distribution, totalVotes, totalVoters: uniqueVoters } });
  } catch (error) {
    logger.error('Poll results error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch results' });
  }
});

router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    await Poll.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true, message: 'Poll removed' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to remove poll' });
  }
});

module.exports = router;
