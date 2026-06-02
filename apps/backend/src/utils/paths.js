const path = require('path');

const projectRoot = path.resolve(__dirname, '../../../..');
const uploadsRoot = path.join(projectRoot, 'uploads');
const tmpUploadsRoot = path.join(uploadsRoot, 'tmp');
const archiveUploadsRoot = path.join(uploadsRoot, 'archives');

module.exports = {
  projectRoot,
  uploadsRoot,
  tmpUploadsRoot,
  archiveUploadsRoot,
};
