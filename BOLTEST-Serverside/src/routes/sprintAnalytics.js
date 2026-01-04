const express = require('express');
const router = express.Router();

// Static sample data based on provided examples
const sampleBugs = {
  total: 280,
  byTeam: {
    "Epos\\Product Team": 48,
    "Epos\\RnD\\Architecture": 3,
    "Epos\\Product Team\\Markets Product": 13,
    "Epos\\Analytics Team": 4,
    "Epos\\RnD\\Keren's Team": 38,
    "Epos\\RnD\\Architecture\\DevOps Infra": 3,
    "Epos\\RnD": 11,
    "Epos\\Professional Services": 7,
    "Epos\\RnD\\Alexandra's Team": 3,
    "Epos\\RnD\\Abigail's Team": 7,
    "Epos\\RnD\\Dmytro's Team": 35,
    "Epos\\RnD\\Automation Team": 6,
    "Epos\\RnD\\Architecture\\DevOps CICD": 3,
    "Epos\\Product Team\\Product PGR": 2,
    "Epos": 3,
    "Epos\\Paktolus": 11,
    "Epos\\RnD\\Markets Success": 13,
    "Epos\\RnD\\Rina's Team": 21,
    "Epos\\RnD\\Vighnesh's Team": 10,
    "Epos\\Security Analysts": 1,
    "Epos\\RnD\\Pavlo's Team": 34,
    "Epos\\RnD\\Standardization Team": 3,
    "Epos\\RnD\\Markets Success\\MS Production": 1
  },
  _metadata: {
    responseTime: '185ms',
    timestamp: new Date().toISOString(),
    endpoint: '/current-not-closed-bugs',
    optimized: false
  }
};

const sampleStoryPoints = {
  sprint: '2601',
  metrics: [],
  hierarchical: {},
  _metadata: {
    responseTime: '0ms',
    timestamp: new Date().toISOString(),
    endpoint: '/sprint-story-points',
    optimized: false
  }
};

const sampleCapacity = {
  sprint: '2601',
  metrics: [],
  summary: {
    totalEstimatedHours: 3185,
    totalCompletedHours: 2805,
    totalRemainingHours: 576
  },
  _metadata: {
    responseTime: '0ms',
    timestamp: new Date().toISOString(),
    endpoint: '/sprint-tasks',
    optimized: false
  }
};

// For large payloads, keep samples in separate JSON blobs
const storyPointsPayload = require('../../data/sample-sprint-story-points.json');
const capacityPayload = require('../../data/sample-sprint-tasks.json');

router.get('/current-not-closed-bugs', (req, res) => {
  return res.json(sampleBugs);
});

router.get('/sprint-summary', (req, res) => {
  // Backwards compatibility: reuse story points summary totals
  const payload = storyPointsPayload || sampleStoryPoints;
  return res.json(payload);
});

router.get('/sprint-story-points', (req, res) => {
  return res.json(storyPointsPayload || sampleStoryPoints);
});

router.get('/sprint-capacity', (req, res) => {
  return res.json(capacityPayload || sampleCapacity);
});

router.get('/sprint-tasks', (req, res) => {
  return res.json(capacityPayload || sampleCapacity);
});

module.exports = router;
