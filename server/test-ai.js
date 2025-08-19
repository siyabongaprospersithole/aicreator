// Quick test script to verify AI providers are working
const { azureOpenAIService } = require('./services/azure-openai.ts');

async function testAzureOpenAI() {
  try {
    console.log('Testing Azure OpenAI integration...');
    
    const result = await azureOpenAIService.generateProject(
      'Create a simple Hello World React app with a button',
      (progress) => {
        console.log(`Progress: ${progress.progress}% - ${progress.step}: ${progress.message}`);
      }
    );
    
    console.log('✅ Azure OpenAI test successful');
    console.log('Project name:', result.name);
    console.log('Files generated:', result.files.length);
    
  } catch (error) {
    console.log('❌ Azure OpenAI test failed:', error.message);
  }
}

// Only run if called directly
if (require.main === module) {
  testAzureOpenAI();
}