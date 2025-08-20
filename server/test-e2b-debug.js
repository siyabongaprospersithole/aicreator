
const { Sandbox } = require('@e2b/code-interpreter');

async function debugE2B() {
  console.log('=== E2B DEBUG TEST ===');
  
  const apiKey = process.env.E2B_API_KEY || process.env.E2B_KEY;
  console.log('API Key configured:', !!apiKey);
  
  if (!apiKey) {
    console.log('No API key found, exiting...');
    return;
  }

  try {
    console.log('Creating E2B sandbox...');
    const sandbox = await Sandbox.create({ 
      apiKey: apiKey,
      template: 'nodejs' 
    });

    console.log('Sandbox created:', sandbox.sandboxId);

    // Test basic commands
    console.log('Testing basic commands...');
    const nodeVersion = await sandbox.commands.run('node --version');
    console.log('Node version:', nodeVersion.stdout);

    const npmVersion = await sandbox.commands.run('npm --version');
    console.log('NPM version:', npmVersion.stdout);

    // Test Next.js installation
    console.log('Testing Next.js installation...');
    const nextInstall = await sandbox.commands.run('npm install next@latest react@latest react-dom@latest', {
      timeoutMs: 120000
    });
    console.log('Next.js install result:', nextInstall.stdout);

    // Test creating a simple Next.js file
    console.log('Creating test Next.js app...');
    await sandbox.files.write('package.json', JSON.stringify({
      "name": "test-next-app",
      "version": "0.1.0",
      "scripts": {
        "dev": "next dev --hostname 0.0.0.0 --port 3000"
      },
      "dependencies": {
        "next": "latest",
        "react": "latest", 
        "react-dom": "latest"
      }
    }, null, 2));

    await sandbox.files.write('app/page.tsx', `
export default function Page() {
  return <div>Hello E2B Test!</div>
}
    `);

    await sandbox.files.write('app/layout.tsx', `
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>{children}</body>
    </html>
  )
}
    `);

    // Test starting server
    console.log('Testing server start...');
    
    // Start server in background
    sandbox.commands.run('npm run dev', { timeoutMs: 60000 }).catch(err => {
      console.log('Server command completed/errored:', err.message);
    });

    // Wait and test
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Check if running
    const portCheck = await sandbox.commands.run('netstat -tlnp | grep :3000');
    console.log('Port check:', portCheck.stdout);

    console.log('Preview URL should be:', `https://${sandbox.sandboxId}.e2b.dev`);

    await sandbox.close();
    console.log('=== DEBUG COMPLETE ===');

  } catch (error) {
    console.error('E2B Debug Error:', error);
  }
}

debugE2B();
