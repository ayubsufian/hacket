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

const updatePostSchema = Joi.object({
  title: Joi.string().max(255),
  body: Joi.string().max(10000),
  category: Joi.string().max(50).allow(null, ''),
}).min(1);

const updateCommentSchema = Joi.object({
  body: Joi.string().max(5000).required(),
});

const statusSchema = Joi.object({
  status: Joi.string().valid('PUBLISHED', 'UNDER_REVIEW').required(),
});

const flagSchema = Joi.object({
  reason: Joi.string().valid('spam', 'abuse', 'hate', 'harassment', 'unsafe', 'other').required(),
  details: Joi.string().max(1000).allow(null, ''),
});

router.use(authenticate);

router.get('/', discussionsController.list);
router.get('/:id', discussionsController.getById);

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

router.get('/:id/comments', discussionsController.listComments);

router.patch(
  '/:id',
  ensureVerified,
  ensureProfileComplete,
  validate(updatePostSchema),
  discussionsController.updatePost
);

router.delete('/:id', ensureVerified, ensureProfileComplete, discussionsController.deletePost);

router.patch(
  '/comments/:commentId',
  ensureVerified,
  ensureProfileComplete,
  validate(updateCommentSchema),
  discussionsController.updateComment
);

router.delete('/comments/:commentId', ensureVerified, ensureProfileComplete, discussionsController.deleteComment);

router.patch('/:id/status', validate(statusSchema), discussionsController.updateStatus);
router.post('/:id/pin', discussionsController.pin);
router.post('/:id/unpin', discussionsController.unpin);
router.post('/:id/flag', ensureVerified, ensureProfileComplete, validate(flagSchema), discussionsController.flagPost);
router.post('/comments/:commentId/flag', ensureVerified, ensureProfileComplete, validate(flagSchema), discussionsController.flagComment);

module.exports = router;
