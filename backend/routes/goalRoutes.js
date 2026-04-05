const express = require('express');
const router  = express.Router();
const {
  getGoals,
  createGoal,
  getGoalAnalysis,
  updateGoal,
  deleteGoal,
} = require('../controllers/goalController');
const { protect, authorize } = require('../middleware/auth');

// All goal routes are protected
router.use(protect);

router.get('/',              getGoals);
router.post('/',             authorize('admin'), createGoal);
router.get('/:id/analysis',  getGoalAnalysis);
router.put('/:id',           authorize('admin'), updateGoal);
router.delete('/:id',        authorize('admin'), deleteGoal);

module.exports = router;