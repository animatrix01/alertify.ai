// Vercel serverless function entry point
import serverHandler from '../dist/server/server.js';

export default async function handler(req, res) {
  try {
    // Convert Vercel request to Web Request
    const url = `https://${req.headers.host}${req.url}`;
    const request = new Request(url, {
      method: req.method,
      headers: req.headers,
      body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined,
    });

    // Call the TanStack Start handler
    const response = await serverHandler(request);

    // Convert Web Response to Vercel response
    res.status(response.status);
    
    // Set headers
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });

    // Send body
    const body = await response.text();
    res.send(body);
  } catch (error) {
    console.error('Vercel handler error:', error);
    res.status(500).send('Internal Server Error');
  }
}

