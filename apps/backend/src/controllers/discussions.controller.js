const discussionsService = require('../services/discussions/discussions.service');
const catchAsync = require('../utils/catchAsync');

exports.list = catchAsync(async (req, res) => {
  const result = await discussionsService.list(req.query, req.user);

  res.status(200).json({
    success: true,
    data: { discussions: result.data },
    pagination: result.pagination,
  });
});

exports.getById = catchAsync(async (req, res) => {
  const discussion = await discussionsService.getById(req.params.id, req.query, req.user);

  res.status(200).json({
    success: true,
    data: { discussion },
  });
});

exports.createPost = catchAsync(async (req, res) => {
  const { hackathonId, title, body, category } = req.body;
  
  const { post, metadata } = await discussionsService.createPost(
    hackathonId,
    req.user.id,
    title,
    body,
    category
  );

  res.status(201).json({
    success: true,
    data: { post, metadata }
  });
});

exports.updatePost = catchAsync(async (req, res) => {
  const { post, metadata } = await discussionsService.updatePost(req.params.id, req.user.id, req.body);

  res.status(200).json({
    success: true,
    message: 'Discussion updated.',
    data: { post, metadata },
  });
});

exports.deletePost = catchAsync(async (req, res) => {
  const result = await discussionsService.deletePost(req.params.id, req.user);

  res.status(200).json({
    success: true,
    message: result.message,
  });
});

exports.createComment = catchAsync(async (req, res) => {
  const { parentId, body } = req.body;
  const discussionId = req.params.id;

  const { comment, metadata } = await discussionsService.createComment(
    discussionId,
    req.user.id,
    parentId,
    body
  );

  res.status(201).json({
    success: true,
    data: { comment, metadata }
  });
});

exports.listComments = catchAsync(async (req, res) => {
  const result = await discussionsService.listComments(req.params.id, req.query, req.user);

  res.status(200).json({
    success: true,
    data: { comments: result.data },
    pagination: result.pagination,
  });
});

exports.updateComment = catchAsync(async (req, res) => {
  const { comment, metadata } = await discussionsService.updateComment(
    req.params.commentId,
    req.user.id,
    req.body.body
  );

  res.status(200).json({
    success: true,
    message: 'Comment updated.',
    data: { comment, metadata },
  });
});

exports.deleteComment = catchAsync(async (req, res) => {
  const result = await discussionsService.deleteComment(req.params.commentId, req.user);

  res.status(200).json({
    success: true,
    message: result.message,
  });
});

exports.updateStatus = catchAsync(async (req, res) => {
  const discussion = await discussionsService.updateStatus(req.params.id, req.user, req.body.status);

  res.status(200).json({
    success: true,
    message: 'Discussion status updated.',
    data: { discussion },
  });
});

exports.pin = catchAsync(async (req, res) => {
  const discussion = await discussionsService.setPinned(req.params.id, req.user, true);

  res.status(200).json({
    success: true,
    message: 'Discussion pinned.',
    data: { discussion },
  });
});

exports.unpin = catchAsync(async (req, res) => {
  const discussion = await discussionsService.setPinned(req.params.id, req.user, false);

  res.status(200).json({
    success: true,
    message: 'Discussion unpinned.',
    data: { discussion },
  });
});

exports.flagPost = catchAsync(async (req, res) => {
  const flag = await discussionsService.flagPost(req.params.id, req.user.id, req.body);

  res.status(201).json({
    success: true,
    message: 'Discussion reported for moderation.',
    data: { flag },
  });
});

exports.flagComment = catchAsync(async (req, res) => {
  const flag = await discussionsService.flagComment(req.params.commentId, req.user.id, req.body);

  res.status(201).json({
    success: true,
    message: 'Comment reported for moderation.',
    data: { flag },
  });
});
