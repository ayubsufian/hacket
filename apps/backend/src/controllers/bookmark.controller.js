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
  const bookmarks = await bookmarkService.getMyBookmarks(req.user.id);

  res.status(200).json({
    success: true,
    data: { bookmarks },
  });
});
