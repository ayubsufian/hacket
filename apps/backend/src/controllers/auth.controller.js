// =============================================================================
// HackET — Auth Controller
// =============================================================================

const authService = require('../services/auth/auth.service');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

exports.register = catchAsync(async (req, res) => {
  const {
    email, password, role, firstName, lastName,
    organizationName, representativeName,
  } = req.body;

  const result = await authService.register(
    {
      email,
      password,
      role,
      firstName,
      lastName,
      organizationName,
      representativeName,
    },
    {
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    },
  );

  res.status(201).json({
    success: true,
    message: 'Registration successful.',
    data: result,
  });
});

exports.verifyEmail = catchAsync(async (req, res) => {
  const { token } = req.body;
  
  const result = await authService.verifyEmail(token);
  
  res.status(200).json({
    success: true,
    message: result.message,
    data: { status: result.status },
  });
});

exports.resendVerificationEmail = catchAsync(async (req, res) => {
  const { email } = req.body;
  
  const result = await authService.resendVerificationEmail(email);
  
  res.status(200).json({
    success: true,
    message: result.message,
    ...(process.env.NODE_ENV !== 'production' && { data: result }),
  });
});

exports.login = catchAsync(async (req, res) => {
  const { email, password } = req.body;

  const result = await authService.login(
    { email, password },
    {
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    },
  );

  res.status(200).json({
    success: true,
    message: 'Login successful.',
    data: result,
  });
});

exports.googleOAuth = catchAsync(async (req, res) => {
  const { code, redirectUri, codeVerifier } = req.body;
  
  if (!code) {
    throw new AppError('Authorization code is required', 400);
  }

  const result = await authService.googleOAuthLogin(
    {
      code,
      redirectUri,
      codeVerifier,
    },
    {
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    },
  );

  res.status(200).json({
    success: true,
    message: 'Google OAuth login successful.',
    data: result,
  });
});

exports.googleOrganizerOAuth = catchAsync(async (req, res) => {
  const {
    code,
    redirectUri,
    codeVerifier,
    organizationName,
    representativeName,
  } = req.body;
  
  if (!code) {
    throw new AppError('Authorization code is required', 400);
  }

  const result = await authService.googleOrganizerOAuthRegister(
    {
      code,
      redirectUri,
      codeVerifier,
      organizationName,
      representativeName,
    },
    {
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    },
  );
  const { statusCode = 200, ...responseData } = result;

  res.status(statusCode).json({
    success: true,
    message: responseData.message,
    data: responseData,
  });
});

exports.githubOAuth = catchAsync(async (req, res) => {
  const { code } = req.body;
  
  if (!code) {
    throw new AppError('Authorization code is required', 400);
  }

  const result = await authService.githubOAuthLogin(
    code,
    {
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    },
  );

  res.status(200).json({
    success: true,
    message: 'GitHub OAuth login successful.',
    data: result,
  });
});

exports.githubOrganizerOAuth = catchAsync(async (req, res) => {
  const { code, organizationName, representativeName } = req.body;
  
  if (!code) {
    throw new AppError('Authorization code is required', 400);
  }

  const result = await authService.githubOrganizerOAuthRegister(
    {
      code,
      organizationName,
      representativeName,
    },
    {
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    },
  );
  const { statusCode = 200, ...responseData } = result;

  res.status(statusCode).json({
    success: true,
    message: responseData.message,
    data: responseData,
  });
});

exports.logout = catchAsync(async (req, res) => {
  // Attempt to read token from Authorization header
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  const isGlobal = req.query.global === 'true';

  await authService.logout(req.user.id, isGlobal ? null : token);

  res.status(200).json({
    success: true,
    message: isGlobal ? 'Logged out of all devices successfully.' : 'Logged out successfully.',
  });
});

exports.getMe = catchAsync(async (req, res) => {
  const user = await authService.getMe(req.user.id);

  res.status(200).json({
    success: true,
    data: { user },
  });
});

exports.forgotPassword = catchAsync(async (req, res) => {
  const { email } = req.body;

  const result = await authService.forgotPassword(email);

  res.status(200).json({
    success: true,
    ...result,
  });
});

exports.resetPassword = catchAsync(async (req, res) => {
  const { token, newPassword } = req.body;

  const result = await authService.resetPassword(token, newPassword);

  res.status(200).json({
    success: true,
    ...result,
  });
});

exports.extendSession = catchAsync(async (req, res) => {
  // The 'authenticate' middleware has already handled extending the Redis TTL
  // and updating 'lastActiveAt' in the database.
  res.status(200).json({
    success: true,
    message: 'Session extended successfully.',
  });
});

exports.submitVerification = catchAsync(async (req, res) => {
  const { verificationDocUrl } = req.body;
  const result = await authService.submitVerification(req.user.id, verificationDocUrl);

  res.status(200).json({
    success: true,
    ...result,
  });
});

exports.requestOrganizerUpgrade = catchAsync(async (req, res) => {
  const { organizationName, representativeName } = req.body;

  const result = await authService.requestOrganizerUpgrade(req.user.id, {
    organizationName,
    representativeName,
  });

  res.status(200).json({
    success: true,
    ...result,
  });
});
