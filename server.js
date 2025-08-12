#!/usr/bin/env node

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const WEBVIEW_DIR = path.join(__dirname, 'src', 'webview');

// MIME types
const mimeTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml'
};

const server = http.createServer((req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  let filePath = req.url === '/' ? '/standalone.html' : req.url;
  filePath = path.join(WEBVIEW_DIR, filePath);

  // Security check - ensure file is within webview directory
  if (!filePath.startsWith(WEBVIEW_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  // Check if file exists
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      res.writeHead(404);
      res.end('File not found');
      return;
    }

    // Get file extension and set content type
    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || 'application/octet-stream';

    // Read and serve file
    fs.readFile(filePath, (err, content) => {
      if (err) {
        res.writeHead(500);
        res.end('Server error');
        return;
      }

      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    });
  });
});

server.listen(PORT, () => {
  console.log(`\n🌟 Cline Supreme Dashboard Server Started!`);
  console.log(`🚀 Server running at: http://localhost:${PORT}`);
  console.log(`📁 Serving files from: ${WEBVIEW_DIR}`);
  console.log(`\n🎯 Open your browser and navigate to the URL above to see the dashboard!`);
  console.log(`\n💡 Features you can test:`);
  console.log(`   • Multi-Agent Dashboard`);
  console.log(`   • Real-time Agent Status`);
  console.log(`   • Task Management Interface`);
  console.log(`   • Performance Metrics`);
  console.log(`   • Modern Glassmorphism UI`);
  console.log(`\n🛑 Press Ctrl+C to stop the server\n`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n🛑 Shutting down Cline Supreme Dashboard Server...');
  server.close(() => {
    console.log('✅ Server stopped successfully!');
    process.exit(0);
  });
});