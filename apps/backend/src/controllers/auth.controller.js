// =============================================================================
// HackET — Auth Controller
// =============================================================================

const authService = require('../services/auth/auth.service');
const catchAsync = require('../utils/catchAsync');

exports.register = catchAsync(async (req, res) => {
  const {
    email, password, role, firstName, lastName,
    organizationName, representativeName, verificationDocUrl,
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
      verificationDocUrl,
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

exports.logout = catchAsync(async (req, res) => {
  // Attempt to read token from Authorization header
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  await authService.logout(req.user.id, token);

  res.status(200).json({
    success: true,
    message: 'Logged out successfully.',
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
