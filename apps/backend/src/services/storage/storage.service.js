const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const renameAsync = promisify(fs.rename);
const mkdirAsync = promisify(fs.mkdir);

class StorageService {
  /**
   * Moves a file from tmp to its final Blob Storage location.
   * @param {string} tmpPath - The current absolute path of the uploaded file.
   * @param {string} targetKey - The blob storage key pattern (e.g., '/submissions/123/video.mp4')
   * @returns {Promise<string>} The new public URI/path.
   */
  async moveToBlobStorage(tmpPath, targetKey) {
    if (!tmpPath || !targetKey) return null;

    const baseUploadsDir = path.join(__dirname, '../../../../uploads');
    const finalAbsolutePath = path.join(baseUploadsDir, targetKey);
    const finalDir = path.dirname(finalAbsolutePath);

    try {
      if (!fs.existsSync(finalDir)) {
        await mkdirAsync(finalDir, { recursive: true });
      }
      
      // Using rename handles atomic move on same filesystem
      await renameAsync(tmpPath, finalAbsolutePath);
      
      return targetKey;
    } catch (err) {
      console.error('[Storage] Failed to move file:', err.message);
      // Fallback: try copy + unlink if rename fails across devices
      try {
        fs.copyFileSync(tmpPath, finalAbsolutePath);
        fs.unlinkSync(tmpPath);
        return targetKey;
      } catch (fallbackErr) {
        throw new Error(`Blob Storage relocation failed: ${fallbackErr.message}`);
      }
    }
  }

  /**
   * Returns the absolute file system path for a given storage key.
   */
  getAbsolutePath(storageKey) {
    return path.join(__dirname, '../../../../uploads', storageKey);
  }
}

module.exports = new StorageService();
