// Vercel Edge Function entry point
export const config = {
  runtime: 'edge',
};

import serverHandler from '../dist/server/server.js';

export default serverHandler;

