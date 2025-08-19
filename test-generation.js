// Simple test script for Azure OpenAI generation
const https = require('https');

const testData = {
  prompt: "Create a simple React todo app with add, delete, and mark complete functionality"
};

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/projects',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  }
};

console.log('Creating test project...');

const req = https.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    const project = JSON.parse(data);
    console.log('Project created:', project.id);
    
    // Now trigger generation
    setTimeout(() => {
      const generateOptions = {
        hostname: 'localhost',
        port: 5000,
        path: `/api/projects/${project.id}/generate`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      };
      
      const generateReq = https.request(generateOptions, (genRes) => {
        console.log('Generation started, status:', genRes.statusCode);
        
        // Check project status after 10 seconds
        setTimeout(() => {
          const statusOptions = {
            hostname: 'localhost',
            port: 5000,
            path: `/api/projects/${project.id}`,
            method: 'GET'
          };
          
          const statusReq = https.request(statusOptions, (statusRes) => {
            let statusData = '';
            statusRes.on('data', (chunk) => { statusData += chunk; });
            statusRes.on('end', () => {
              const status = JSON.parse(statusData);
              console.log('Final status:', status.status);
              console.log('Files generated:', status.files?.length || 0);
            });
          });
          
          statusReq.end();
        }, 10000);
      });
      
      generateReq.write(JSON.stringify(testData));
      generateReq.end();
      
    }, 1000);
  });
});

req.write(JSON.stringify({
  name: "Test Todo App",
  description: "Simple React todo application"
}));

req.end();