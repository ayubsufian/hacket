const jwt = require('jsonwebtoken');

const DEFAULT_TTL_SECONDS = 10 * 60;
const SECRET = process.env.SIGNED_URL_SECRET || process.env.JWT_SECRET || 'dev_secret_change_me';

function signDownloadToken(payload, expiresInSeconds = DEFAULT_TTL_SECONDS) {
  return jwt.sign(
    {
      ...payload,
      purpose: payload.purpose || 'download',
    },
    SECRET,
    {
      expiresIn: expiresInSeconds,
      issuer: 'hacket-api',
      audience: 'hacket-download',
    }
  );
}

function verifyDownloadToken(token, expected = {}) {
  const decoded = jwt.verify(token, SECRET, {
    issuer: 'hacket-api',
    audience: 'hacket-download',
  });

  for (const [key, value] of Object.entries(expected)) {
    if (value !== undefined && decoded[key] !== value) {
      return null;
    }
  }

  return decoded;
}

module.exports = {
  signDownloadToken,
  verifyDownloadToken,
};
