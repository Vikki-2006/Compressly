const https = require('https');

function checkUrl(urlStr) {
  return new Promise((resolve) => {
    try {
      const req = https.get(urlStr, (res) => {
        resolve({ url: urlStr, status: res.statusCode, statusText: res.statusMessage, headers: res.headers });
      });
      req.on('error', (err) => resolve({ url: urlStr, error: err.message }));
      req.setTimeout(5000, () => { req.destroy(); resolve({ url: urlStr, error: 'Timeout' }); });
    } catch(e) {
      resolve({ url: urlStr, error: e.message });
    }
  });
}

async function main() {
  const urls = [
    'https://compressly-kwxcmcnh82-vikki-2006s-projects.vercel.app/app',
    'https://compressly-kwxcmcnh82-vikki-2006s-projects.vercel.app',
    'https://compressly-vikki-2006s-projects.vercel.app/app',
    'https://compressly-vikki-2006s-projects.vercel.app',
    'https://compressly-vikki-2006.vercel.app',
    'https://compressly-gamma.vercel.app',
    'https://video-compressor-compressly.vercel.app'
  ];

  for (const u of urls) {
    const res = await checkUrl(u);
    console.log(JSON.stringify(res, null, 2));
  }
}

main();
