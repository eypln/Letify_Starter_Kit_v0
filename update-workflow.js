const fs = require('fs');
const https = require('https');

const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhYmQ5NDAzYi02N2Y0LTQ0YTYtYWUyNS05NGI3ZGMwNjU4ZGUiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiYWMwMmMxMWEtOGM0Ny00NzI3LWI5MzItNWFjZDExNGY4OTM3IiwiaWF0IjoxNzc1MzQ0NjgwfQ.fFmPQgsv8yj20fOMrkt8jKvaUQ3dJjxcz1nKIc7r4Gc';
const WF_ID = 'jjy5YjRBUkkPpNRc';
const VERSION_ID = '6afa38b0-8ce4-4320-9724-71712c92b116';

// Read the PUT json
const putData = JSON.parse(fs.readFileSync('sm-brain-put.json', 'utf8'));
// versionId is read-only, don't set it

const body = JSON.stringify(putData);
console.log(`Body size: ${body.length} bytes`);

const options = {
  hostname: 'n8n.letify.cloud',
  path: `/api/v1/workflows/${WF_ID}`,
  method: 'PUT',
  headers: {
    'X-N8N-API-KEY': API_KEY,
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body)
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const result = JSON.parse(data);
    console.log(`Status: ${res.statusCode}`);
    console.log(`Nodes: ${result.nodes ? result.nodes.length : 'N/A'}`);
    console.log(`URL: https://n8n.letify.cloud/workflow/${WF_ID}`);
    if (result.message) console.log(`Message: ${result.message}`);
  });
});

req.on('error', e => console.error(`Error: ${e.message}`));
req.write(body);
req.end();
