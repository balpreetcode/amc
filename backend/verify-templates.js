/**
 * Verification Script: Check templates in PostgreSQL
 */

const db = require('./db');

async function verifyTemplates() {
    console.log('🔍 Verifying templates in PostgreSQL database...\n');

    try {
        const templates = await db.getAllTemplates();

        console.log(`Found ${templates.length} template(s) in database:\n`);

        templates.forEach((template, index) => {
            console.log(`${index + 1}. ${template.name}`);
            console.log(`   ID: ${template.id}`);
            console.log(`   Nodes: ${template.nodeCount}`);
            console.log(`   Video Preview: ${template.videoPreview || '(none)'}`);
            console.log(`   Created: ${new Date(template.createdAt).toLocaleString()}`);
            console.log(`   Last Modified: ${new Date(template.lastModified).toLocaleString()}`);
            console.log('');
        });

        console.log('✅ Verification complete!');
        process.exit(0);

    } catch (error) {
        console.error('❌ Verification failed:', error.message);
        process.exit(1);
    }
}

verifyTemplates();
