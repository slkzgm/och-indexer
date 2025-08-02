// File path: scripts/setup-hasura.js

const { execSync } = require('child_process');
const path = require('path');

console.log('🚀 Starting Hasura setup...');

const scripts = [
  'setup-relations.js', // Relations GraphQL (sans contraintes FK)
  'public-tables.js'           // Rendre les tables publiques
];

async function runScript(scriptName) {
  try {
    console.log(`\n📋 Running ${scriptName}...`);
    const scriptPath = path.join(__dirname, scriptName);
    
    // Exécute le script avec Node.js
    execSync(`node ${scriptPath}`, { 
      stdio: 'inherit',
      cwd: __dirname 
    });
    
    console.log(`✅ ${scriptName} completed successfully`);
  } catch (error) {
    console.error(`❌ Error running ${scriptName}:`, error.message);
    // Continue avec les autres scripts même si celui-ci échoue
  }
}

async function main() {
  console.log('🔧 Setting up Hasura configuration...');
  console.log('This will:');
  console.log('1. Create GraphQL relationships (without foreign key constraints)');
  console.log('2. Make tables publicly accessible');
  console.log('');
  console.log('Note: Foreign key constraints are not supported in this Hasura version');
  console.log('Relations will work without SQL constraints');
  
  for (const script of scripts) {
    await runScript(script);
  }
  
  console.log('\n🎉 Hasura setup completed!');
  console.log('Your GraphQL endpoint should now be fully configured.');
  console.log('');
  console.log('You can now query relations like:');
  console.log('- player.heroes');
  console.log('- hero.owner');
  console.log('- hero.equippedWeapon');
  console.log('- weapon.owner');
  console.log('- activity.hero');
}

main().catch(console.error); 