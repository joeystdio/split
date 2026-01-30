const https = require('https');
const http = require('http');

async function validateSession(cookie) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'auth.jdms.nl',
      port: 443,
      path: '/api/validate',
      method: 'GET',
      headers: {
        'Cookie': cookie
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            resolve(null);
          }
        } else {
          resolve(null);
        }
      });
    });

    req.on('error', (e) => {
      console.error('Auth validation error:', e);
      resolve(null);
    });

    req.end();
  });
}

module.exports = async (req, res, next) => {
  // Get all cookies as string
  const cookieHeader = req.headers.cookie || '';
  
  if (!cookieHeader) {
    return res.redirect('https://auth.jdms.nl/login?redirect=' + encodeURIComponent('https://split.jdms.nl' + req.originalUrl));
  }

  const user = await validateSession(cookieHeader);
  
  if (!user || !user.authenticated) {
    return res.redirect('https://auth.jdms.nl/login?redirect=' + encodeURIComponent('https://split.jdms.nl' + req.originalUrl));
  }

  req.user = user;
  next();
};
