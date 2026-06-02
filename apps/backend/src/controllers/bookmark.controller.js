// =============================================================================
// HackET — Bookmark Controller
// =============================================================================

const bookmarkService = require('../services/bookmark/bookmark.service');
const catchAsync = require('../utils/catchAsync');

exports.addBookmark = catchAsync(async (req, res) => {
  const { organizationId } = req.params;
  
  const bookmark = await bookmarkService.addBookmark(req.user.id, organizationId);

  res.status(201).json({
    success: true,
    message: 'Bookmark added successfully.',
    data: { bookmark },
  });
});

exports.removeBookmark = catchAsync(async (req, res) => {
  const { organizationId } = req.params;
  
  await bookmarkService.removeBookmark(req.user.id, organizationId);

  res.status(200).json({
    success: true,
    message: 'Bookmark removed successfully.',
  });
});

exports.getMyBookmarks = catchAsync(async (req, res) => {
  const result = await bookmarkService.getMyBookmarks(req.user.id, req.query);

  res.status(200).json({
    success: true,
    data: { bookmarks: result.data },
    pagination: result.pagination,
  });
});

exports.checkBookmark = catchAsync(async (req, res) => {
  const bookmark = await bookmarkService.checkBookmark(req.user.id, req.params.organizationId);

  res.status(200).json({
    success: true,
    data: {
      bookmarked: Boolean(bookmark),
      id: bookmark?.id || null,
    },
  });
});

exports.bulkAddBookmarks = catchAsync(async (req, res) => {
  const result = await bookmarkService.bulkAddBookmarks(req.user.id, req.body.organizationIds);

  res.status(201).json({
    success: true,
    message: `Added ${result.createdCount} bookmark(s).`,
    data: result,
  });
});
