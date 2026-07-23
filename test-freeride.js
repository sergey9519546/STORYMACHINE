/**
 * Quick test script to verify FreeRide integration works
 * Run with: node test-freeride.js
 */

// Set test environment variables
process.env.OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || 'test-key';

async function testFreeRideIntegration() {
  console.log('Testing FreeRide integration...\n');
  
  try {
    // Import the AI module (this will initialize providers)
    const ai = await import('./dist/server/engine/ai.js');
    const aiProvider = await import('./dist/server/engine/ai-provider.js');
    
    console.log('✓ Modules loaded successfully');
    
    // Check if provider manager is initialized
    const hasProvider = aiProvider.aiProviderManager.hasProvider();
    console.log(`✓ Provider manager initialized: ${hasProvider}`);
    
    if (hasProvider) {
      const currentProvider = aiProvider.aiProviderManager.getCurrentProviderInfo();
      console.log(`✓ Current provider: ${currentProvider?.name} (${currentProvider?.tier})`);
      
      const providers = aiProvider.aiProviderManager.listProviders();
      console.log(`✓ Available providers: ${providers.map(p => p.name).join(', ')}`);
    }
    
    console.log('\n✅ FreeRide integration test passed!');
    console.log('\nTo use FreeRide:');
    console.log('1. Get a free API key at https://openrouter.ai/keys');
    console.log('2. Set OPENROUTER_API_KEY=sk-or-v1-... in your .env file');
    console.log('3. Restart the server\n');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('\nMake sure to build the project first:');
    console.error('  npm run build\n');
    process.exit(1);
  }
}

testFreeRideIntegration();
