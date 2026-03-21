const express = require('express');
const router  = express.Router();
const {
  getGoals,
  createGoal,
  getGoalAnalysis,
  updateGoal,
  deleteGoal,
} = require('../controllers/goalController');
const { protect } = require('../middleware/auth');

// All goal routes are protected
router.use(protect);

router.get('/',              getGoals);
router.post('/',             createGoal);
router.get('/:id/analysis',  getGoalAnalysis);
router.put('/:id',           updateGoal);
router.delete('/:id',        deleteGoal);

module.exports = router;