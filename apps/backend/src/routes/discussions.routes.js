const { Router } = require('express');
const Joi = require('joi');
const discussionsController = require('../controllers/discussions.controller');
const authenticate = require('../middleware/auth');
const ensureVerified = require('../middleware/ensureVerified');
const ensureProfileComplete = require('../middleware/ensureProfileComplete');
const validate = require('../middleware/validate');

const router = Router();

const postSchema = Joi.object({
  hackathonId: Joi.string().uuid().required(),
  title: Joi.string().max(255).required(),
  body: Joi.string().max(10000).required(),
  category: Joi.string().max(50).allow(null, ''),
});

const commentSchema = Joi.object({
  parentId: Joi.string().uuid().allow(null, ''),
  body: Joi.string().max(5000).required(),
});

router.use(authenticate);

router.post(
  '/',
  ensureVerified,
  ensureProfileComplete,
  validate(postSchema),
  discussionsController.createPost
);

router.post(
  '/:id/comments',
  ensureVerified,
  ensureProfileComplete,
  validate(commentSchema),
  discussionsController.createComment
);

module.exports = router;
