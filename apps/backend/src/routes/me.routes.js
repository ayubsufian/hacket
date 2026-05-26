const { Router } = require('express');
const teamsController = require('../controllers/teams.controller');
const authenticate = require('../middleware/auth');

const router = Router();

router.use(authenticate);

router.get('/teams', teamsController.getMine);

module.exports = router;
