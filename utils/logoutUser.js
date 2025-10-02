// utils/logoutUser.js
module.exports = function logoutUser(req, res) {
  const isProd = process.env.NODE_ENV === 'production';

  const cookieOpts = {
    httpOnly: true,
    path: '/',
    sameSite: 'none',
    secure: true,
    // domain: '.auravestfinedge.com', // Only if set during login
  };

  if (!isProd && process.env.SAME_ORIGIN_DEV === '1') {
    cookieOpts.sameSite = 'lax';
    cookieOpts.secure = false;
  }

  res.clearCookie('sid', cookieOpts);

  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
    Pragma: 'no-cache',
  });
};
