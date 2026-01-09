/**
 * Migration Script: Move templates from JSON file to PostgreSQL
 * Run this once to migrate existing templates
 */

const fs = require('fs');
const path = require('path');
const db = require('./db');

const TEMPLATES_FILE = path.join(__dirname, 'templates.json');

async function migrateTemplates() {
    console.log('🔄 Starting template migration from JSON to PostgreSQL...\n');

    try {
        // Initialize database
        await db.initializeDatabase();
        console.log('✅ Database initialized\n');

        // Check if JSON file exists
        if (!fs.existsSync(TEMPLATES_FILE)) {
            console.log('ℹ️  No templates.json file found. Nothing to migrate.');
            process.exit(0);
        }

        // Read templates from JSON file
        const data = fs.readFileSync(TEMPLATES_FILE, 'utf8');
        const templates = JSON.parse(data);

        if (templates.length === 0) {
            console.log('ℹ️  No templates found in JSON file.');
            process.exit(0);
        }

        console.log(`📋 Found ${templates.length} template(s) in JSON file:\n`);

        // Migrate each template
        let successCount = 0;
        let skipCount = 0;
        let errorCount = 0;

        for (const template of templates) {
            console.log(`Processing: ${template.name} (ID: ${template.id})`);

            try {
                // Check if template already exists in database
                const existing = await db.getTemplateById(template.id);

                if (existing) {
                    console.log(`  ⏭️  Skipped (already exists in database)`);
                    skipCount++;
                    continue;
                }

                // Insert into database
                await db.createTemplate(template);
                console.log(`  ✅ Migrated successfully`);
                successCount++;

            } catch (error) {
                console.log(`  ❌ Error: ${error.message}`);
                errorCount++;
            }

            console.log('');
        }

        // Print summary
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('Migration Summary:');
        console.log(`  ✅ Migrated: ${successCount}`);
        console.log(`  ⏭️  Skipped: ${skipCount}`);
        console.log(`  ❌ Errors: ${errorCount}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        if (successCount > 0) {
            // Create backup of JSON file
            const backupFile = TEMPLATES_FILE + '.backup';
            fs.copyFileSync(TEMPLATES_FILE, backupFile);
            console.log(`💾 Backup created: ${backupFile}`);
            console.log(`ℹ️  You can safely delete templates.json after verifying the migration.\n`);
        }

        console.log('✅ Migration completed!');
        process.exit(0);

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// Run migration
migrateTemplates();
