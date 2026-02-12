#!/usr/bin/env node

/**
 * Code Tutor Discord Bot - Interactive Setup Script
 * 
 * This script helps you configure your Discord bot with your own credentials
 * without needing to edit the code directly.
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Color codes for terminal
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    red: '\x1b[31m',
};

const log = {
    info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
    success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
    warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
    error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
    title: (msg) => console.log(`\n${colors.bright}${colors.blue}${msg}${colors.reset}\n`),
};

function question(prompt) {
    return new Promise((resolve) => {
        rl.question(prompt, resolve);
    });
}

async function main() {
    console.clear();
    
    log.title('🤖 Code Tutor Discord Bot Setup');
    
    log.info('Welkom! Dit script helpt je je Discord bot in te stellen.');
    log.info('Je hebt twee dingen nodig:');
    console.log('  1. Discord Bot Token (van Discord Developer Portal)');
    console.log('  2. Client ID / Application ID (van Discord Developer Portal)\n');
    
    // Check if .env already exists
    const envPath = path.join(__dirname, '.env');
    let existingConfig = {};
    
    if (fs.existsSync(envPath)) {
        log.warn('.env bestand bestaat al. Bestaande waarden laden...\n');
        const envContent = fs.readFileSync(envPath, 'utf-8');
        envContent.split('\n').forEach(line => {
            const [key, value] = line.split('=').map(s => s.trim());
            if (key && !key.startsWith('#') && value) {
                existingConfig[key] = value;
            }
        });
    }
    
    // Ask for Discord Token
    log.info('Stap 1: Discord Bot Token');
    console.log('  Hoe krijg je je token:');
    console.log('  1. Ga naar https://discord.com/developers/applications');
    console.log('  2. Klik op je applicatie');
    console.log('  3. Ga naar "Bot" in het menu');
    console.log('  4. Klik "Reset Token" en kopieer het\n');
    
    let token = '';
    while (!token) {
        token = await question(`${colors.bright}Discord Bot Token:${colors.reset} `);
        if (!token) {
            log.error('Token is verplicht!');
            token = '';
        } else if (token.length < 50) {
            log.error('Dit ziet niet uit als een geldig Discord token. Probeer opnieuw.');
            token = '';
        }
    }
    
    // Ask for Client ID
    log.info('\nStap 2: Client ID / Application ID');
    console.log('  Hoe krijg je je Client ID:');
    console.log('  1. Ga naar https://discord.com/developers/applications');
    console.log('  2. Klik op je applicatie');
    console.log('  3. Ga naar "General Information"');
    console.log('  4. Kopieer de "Application ID" (dit is je Client ID)\n');
    
    let clientId = '';
    while (!clientId) {
        clientId = await question(`${colors.bright}Client ID:${colors.reset} `);
        if (!clientId) {
            log.error('Client ID is verplicht!');
            clientId = '';
        } else if (!/^\d+$/.test(clientId)) {
            log.error('Client ID moet alleen uit getallen bestaan. Probeer opnieuw.');
            clientId = '';
        }
    }
    
    // Ask for API URL
    log.info('\nStap 3: Code Tutor API URL (optioneel)');
    const defaultApiUrl = 'http://localhost:51987/api/discord';
    const apiUrl = await question(`API URL [${defaultApiUrl}]: `);
    const finalApiUrl = apiUrl || defaultApiUrl;
    
    // Ask for Guild ID (optional)
    log.info('\nStap 4: Guild ID (optioneel - voor testing)');
    const guildId = await question('Guild ID (laat leeg voor global commands): ');
    
    // Create .env content
    const envContent = `# Discord Bot Configuration
# Gegenereerd door setup script

DISCORD_TOKEN=${token}
CLIENT_ID=${clientId}
TUTOR_API_URL=${finalApiUrl}
${guildId ? `GUILD_ID=${guildId}` : '# GUILD_ID='}
`;
    
    // Write .env file
    try {
        fs.writeFileSync(envPath, envContent);
        log.success('.env bestand aangemaakt!\n');
    } catch (error) {
        log.error(`Kon .env bestand niet aanmaken: ${error.message}`);
        rl.close();
        process.exit(1);
    }
    
    // Summary
    log.title('✓ Setup compleet!');
    
    console.log('Configuratie samenvatting:');
    console.log(`  Bot Token: ${token.substring(0, 20)}...`);
    console.log(`  Client ID: ${clientId}`);
    console.log(`  API URL: ${finalApiUrl}`);
    if (guildId) {
        console.log(`  Guild ID: ${guildId}`);
    }
    console.log();
    
    log.info('Volgende stappen:');
    console.log('  1. Start de bot: npm start');
    console.log('  2. Bekijk de logs voor eventuele fouten');
    console.log('  3. Probeer /progress command in Discord\n');
    
    log.warn('Belangrijk:');
    console.log('  • Deel je .env bestand NOOIT publiekelijk!');
    console.log('  • Het bevat gevoelige credentials');
    console.log('  • Voeg .env toe aan .gitignore als je git gebruikt\n');
    
    rl.close();
}

main().catch(error => {
    log.error(`Setup fout: ${error.message}`);
    rl.close();
    process.exit(1);
});
