const http = require('http');

function fetchPath(pathStr) {
  return new Promise((resolve) => {
    http.get(`http://127.0.0.1:8000${pathStr}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ path: pathStr, status: res.statusCode, body: data.slice(0, 100) }));
    }).on('error', err => resolve({ path: pathStr, error: err.message }));
  });
}

async function main() {
  const paths = ['/', '/healthz', '/api/health', '/docs', '/openapi.json', '/api/settings'];
  for (const p of paths) {
    const res = await fetchPath(p);
    console.log(JSON.stringify(res));
  }
}

main();
