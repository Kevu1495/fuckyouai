const http = require('http');
const fs = require('fs');
const path = require('path');
const port = Number(process.env.PORT || 4173);
const root = path.resolve(__dirname, '..', 'public');
const types = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.json':'application/json; charset=utf-8', '.svg':'image/svg+xml', '.png':'image/png', '.jpg':'image/jpeg', '.webp':'image/webp' };
const server = http.createServer((req,res)=>{
  let pathname; try { pathname = decodeURIComponent(new URL(req.url, `http://${req.headers.host || '127.0.0.1'}`).pathname); } catch { res.writeHead(400); return res.end('Bad request'); }
  if (pathname.startsWith('/api/')) { res.writeHead(404, {'Content-Type':'application/json'}); return res.end(JSON.stringify({error:'API unavailable in static smoke server'})); }
  const rel = pathname === '/' ? '/index.html' : pathname;
  const file = path.resolve(root, '.' + rel);
  if (!file.startsWith(root + path.sep) && file !== root) { res.writeHead(403); return res.end('Forbidden'); }
  fs.stat(file,(err,st)=>{ if(err || !st.isFile()){ res.writeHead(404); return res.end('Not found'); } const ext=path.extname(file); res.writeHead(200, {'Content-Type':types[ext] || 'application/octet-stream'}); fs.createReadStream(file).pipe(res); });
});
server.listen(port,'127.0.0.1',()=>console.log(`Static test server listening on http://127.0.0.1:${port}`));
process.on('SIGTERM',()=>server.close(()=>process.exit(0)));
process.on('SIGINT',()=>server.close(()=>process.exit(0)));
