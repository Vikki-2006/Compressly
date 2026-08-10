const https = require('https');

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function main() {
  try {
    const html = await fetchUrl('https://compressly.vercel.app');
    console.log('HTML length:', html.length);
    console.log('HTML snippet:\n', html.slice(0, 1000));
    
    // Find all script tags
    const scripts = html.match(/src="([^"]+)"/g) || [];
    console.log('\nScripts found:', scripts);

    for (const scriptTag of scripts) {
      const src = scriptTag.replace('src="', '').replace('"', '');
      const fullUrl = src.startsWith('http') ? src : `https://compressly.vercel.app${src}`;
      console.log('\nFetching script:', fullUrl);
      const jsContent = await fetchUrl(fullUrl);
      console.log('Script length:', jsContent.length);

      // Search for localhost or backend url in script
      const matches = jsContent.match(/(localhost:8000|8000|\/api\/metadata|backend|VITE_BACKEND_URL|https?:\/\/[^\s"',]+)/gi) || [];
      console.log('Interesting tokens sample:', matches.slice(0, 20));

      const apiMetadata = jsContent.indexOf('/api/metadata');
      if (apiMetadata !== -1) {
        console.log('Found /api/metadata snippet context:\n', jsContent.slice(Math.max(0, apiMetadata - 200), apiMetadata + 200));
      }
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

main();
