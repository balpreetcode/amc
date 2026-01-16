/**
 * Test script for Composio integration
 * Run with: node test-composio.js
 */

require('dotenv').config();

const composioUtils = require('./utils/composio');

async function runTests() {
    console.log('\n=== Composio Integration Tests ===\n');

    // Test 1: Check if module loads correctly
    console.log('✓ Test 1: Module loaded successfully');
    console.log('  Exported functions:', Object.keys(composioUtils).join(', '));

    // Test 2: Check if Composio client is initialized
    if (composioUtils.composio) {
        console.log('✓ Test 2: Composio client initialized with API key');
    } else {
        console.log('✗ Test 2: Composio client NOT initialized - check COMPOSIO_KEY in .env');
        return;
    }

    // Test 3: Normalize toolkit names
    console.log('\n✓ Test 3: Toolkit name normalization:');
    const testNames = ['Google Drive', 'googledrive', 'Dropbox', 'dropbox'];
    testNames.forEach(name => {
        console.log(`  "${name}" → "${composioUtils.normalizeToolkit(name)}"`);
    });

    // Test 4: Try to get connected accounts (with a test user ID)
    const testUserId = 'test-user-' + Date.now();
    console.log(`\n✓ Test 4: Fetching connected accounts for test user "${testUserId}":`);
    try {
        const accounts = await composioUtils.getConnectedAccounts(testUserId);
        console.log(`  Found ${accounts.length} connected accounts`);
        if (accounts.length > 0) {
            accounts.forEach(acc => {
                console.log(`    - ${acc.toolkit}: ${acc.accountName} (${acc.status})`);
            });
        }
    } catch (error) {
        console.log(`  API call result: ${error.message}`);
        // This is expected for a new test user with no accounts
    }

    // Test 5: Try to initiate OAuth (just get the redirect URL)
    console.log('\n✓ Test 5: Testing OAuth initiation (Google Drive):');
    try {
        const result = await composioUtils.initiateOAuthFlow(
            testUserId,
            'GOOGLEDRIVE',
            'http://localhost:3002/composio/callback'
        );
        console.log(`  Redirect URL generated: ${result.redirectUrl ? 'Yes' : 'No'}`);
        if (result.redirectUrl) {
            console.log(`  URL preview: ${result.redirectUrl.substring(0, 80)}...`);
        }
        console.log(`  Connection Request ID: ${result.connectionRequestId || 'N/A'}`);
    } catch (error) {
        console.log(`  Result: ${error.message}`);
        // Check if it's a "toolkit not connected" error vs other errors
        if (error.message.includes('auth') || error.message.includes('integration')) {
            console.log('  ⚠️  You may need to set up Auth Config for GOOGLEDRIVE in Composio Dashboard');
        }
    }

    console.log('\n=== Tests Complete ===\n');
}

runTests().catch(err => {
    console.error('Test suite failed:', err);
    process.exit(1);
});
