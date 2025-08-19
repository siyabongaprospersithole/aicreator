// Debug script to test Azure OpenAI directly
import { AzureOpenAI } from 'openai';

async function testAzure() {
  const client = new AzureOpenAI({
    apiKey: process.env.AZURE_OPENAI_API_KEY,
    endpoint: process.env.AZURE_OPENAI_ENDPOINT,
    deployment: process.env.AZURE_OPENAI_DEPLOYMENT || "gpt-5-2025-08-07",
    apiVersion: "2024-04-01-preview"
  });

  try {
    console.log('Testing Azure OpenAI connection...');
    console.log('API Key set:', !!process.env.AZURE_OPENAI_API_KEY);
    console.log('Endpoint set:', !!process.env.AZURE_OPENAI_ENDPOINT);
    console.log('Using deployment:', process.env.AZURE_OPENAI_DEPLOYMENT || "gpt-5-2025-08-07");
    console.log('Using model:', process.env.AZURE_OPENAI_MODEL_NAME || "gpt-5-chat");

    const response = await client.chat.completions.create({
      messages: [
        { role: "system", content: "You are a helpful assistant. Respond with JSON only." },
        { role: "user", content: 'Respond with JSON: {"test": true, "message": "Hello from Azure OpenAI"}' }
      ],
      max_tokens: 100,
      temperature: 0.3,
      model: process.env.AZURE_OPENAI_MODEL_NAME || "gpt-5-chat",
      response_format: { type: "json_object" }
    });

    console.log('Success! Response:', response.choices[0].message.content);
  } catch (error) {
    console.error('Azure OpenAI test failed:', error.message);
    if (error.code) console.error('Error code:', error.code);
    if (error.status) console.error('Status:', error.status);
  }
}

testAzure();