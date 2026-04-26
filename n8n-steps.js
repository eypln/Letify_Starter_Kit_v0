const https = require('https');

const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhYmQ5NDAzYi02N2Y0LTQ0YTYtYWUyNS05NGI3ZGMwNjU4ZGUiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiYWMwMmMxMWEtOGM0Ny00NzI3LWI5MzItNWFjZDExNGY4OTM3IiwiaWF0IjoxNzc1MzQ0NjgwfQ.fFmPQgsv8yj20fOMrkt8jKvaUQ3dJjxcz1nKIc7r4Gc';

function apiCall(method, path, body) {
  return new Promise((resolve, reject) => {
    const bodyStr = body ? JSON.stringify(body) : null;
    const options = {
      hostname: 'n8n.letify.cloud',
      path,
      method,
      headers: {
        'X-N8N-API-KEY': API_KEY,
        'Content-Type': 'application/json; charset=utf-8'
      }
    };
    if (bodyStr) options.headers['Content-Length'] = Buffer.byteLength(bodyStr);
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, data }); }
      });
    });
    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

async function main() {
  const step = parseInt(process.argv[2] || '1');
  const wfId = process.argv[3] || null;
  
  if (step === 0) {
    // Delete old workflow
    if (!wfId) { console.log('Usage: node n8n-steps.js 0 <workflowId>'); return; }
    const r = await apiCall('DELETE', `/api/v1/workflows/${wfId}`);
    console.log(`Deleted ${wfId}: ${r.status}`);
    return;
  }
  
  if (step === 1) {
    // Step 1: Create with 2 nodes (trigger + notion)
    const body = {
      name: "SM Brain - Derin Analiz",
      nodes: [
        {
          parameters: { rule: { interval: [{ field: "minutes", minutesInterval: 5 }] } },
          id: "d85d974f-0001-4a65-8730-2e57fd8b6001",
          name: "Her 5 Dakika",
          type: "n8n-nodes-base.scheduleTrigger",
          typeVersion: 1.2,
          position: [0, 300]
        },
        {
          parameters: {
            resource: "databasePage",
            operation: "getAll",
            databaseId: { __rl: true, value: "a66165cd-5be6-43ac-a2dc-4b370e85de9c", mode: "list", cachedResultName: "Links for AI Agent Brain", cachedResultUrl: "https://www.notion.so/a66165cd5be643aca2dc4b370e85de9c" },
            limit: 1,
            filterType: "manual",
            filters: { conditions: [{ key: "Status|status", condition: "equals", statusValue: "Done" }, { key: "Tags|multi_select", condition: "contains", multiSelectValue: "Social Media" }], combinator: "and" },
            options: { downloadFiles: false }
          },
          id: "d85d974f-0002-4a65-8730-2e57fd8b6002",
          name: "Notion SM Icerik Al",
          type: "n8n-nodes-base.notion",
          typeVersion: 2.2,
          position: [260, 300],
          credentials: { notionApi: { id: "e4tmmqbaPyONZSTY", name: "Notion account" } }
        }
      ],
      connections: {
        "Her 5 Dakika": { main: [[{ node: "Notion SM Icerik Al", type: "main", index: 0 }]] }
      },
      settings: { executionOrder: "v1" }
    };
    const r = await apiCall('POST', '/api/v1/workflows', body);
    console.log(`Created: ${r.data.id}`);
    console.log(`Nodes: ${r.data.nodes?.length}`);
    console.log(`URL: https://n8n.letify.cloud/workflow/${r.data.id}`);
    return;
  }
  
  if (step === 2) {
    // Step 2: Add node 3 (Status Deep Analysis - Notion update)
    if (!wfId) { console.log('Usage: node n8n-steps.js 2 <workflowId>'); return; }
    // First GET current workflow
    const current = await apiCall('GET', `/api/v1/workflows/${wfId}`);
    const wf = current.data;
    
    // Add new node
    wf.nodes.push({
      parameters: {
        resource: "databasePage",
        operation: "update",
        pageId: { __rl: true, value: "={{ $('Notion SM Icerik Al').item.json.id }}", mode: "id" },
        propertiesUi: { propertyValues: [{ key: "Status|status", statusValue: "In progress" }] },
        options: {}
      },
      id: "d85d974f-0003-4a65-8730-2e57fd8b6003",
      name: "Status Deep Analysis",
      type: "n8n-nodes-base.notion",
      typeVersion: 2.2,
      position: [520, 300],
      credentials: { notionApi: { id: "e4tmmqbaPyONZSTY", name: "Notion account" } }
    });
    
    // Update connections
    wf.connections["Notion SM Icerik Al"] = { main: [[{ node: "Status Deep Analysis", type: "main", index: 0 }]] };
    
    // Remove read-only fields
    delete wf.versionId;
    delete wf.updatedAt;
    delete wf.createdAt;
    delete wf.id;
    delete wf.activeVersionId;
    delete wf.versionCounter;
    delete wf.triggerCount;
    delete wf.shared;
    delete wf.activeVersion;
    delete wf.isArchived;
    delete wf.description;
    
    const r = await apiCall('PUT', `/api/v1/workflows/${wfId}`, wf);
    console.log(`Updated: status=${r.status}`);
    console.log(`Nodes: ${r.data.nodes?.length}`);
    if (r.data.message) console.log(`Error: ${r.data.message}`);
    return;
  }
  
  if (step === 3) {
    // Step 3: Add Platform Tespit (Code node)
    if (!wfId) { console.log('Usage: node n8n-steps.js 3 <workflowId>'); return; }
    const current = await apiCall('GET', `/api/v1/workflows/${wfId}`);
    const wf = current.data;
    
    wf.nodes.push({
      parameters: { jsCode: "return [{ json: { test: true } }];" },
      id: "d85d974f-0004-4a65-8730-2e57fd8b6004",
      name: "Platform Tespit",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [780, 300]
    });
    
    wf.connections["Status Deep Analysis"] = { main: [[{ node: "Platform Tespit", type: "main", index: 0 }]] };
    
    delete wf.versionId; delete wf.updatedAt; delete wf.createdAt; delete wf.id;
    delete wf.activeVersionId; delete wf.versionCounter; delete wf.triggerCount;
    delete wf.shared; delete wf.activeVersion; delete wf.isArchived; delete wf.description;
    
    const r = await apiCall('PUT', `/api/v1/workflows/${wfId}`, wf);
    console.log(`Updated: status=${r.status}`);
    console.log(`Nodes: ${r.data.nodes?.length}`);
    if (r.data.message) console.log(`Error: ${r.data.message}`);
    return;
  }
}

main().catch(console.error);
