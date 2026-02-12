// Discord Bot for Code Tutor Progress
// This bot fetches your VS Code Code Tutor progress and displays it in Discord

const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, EmbedBuilder, SlashCommandBuilder, REST, Routes, GuildScheduledEventEntityType, GuildScheduledEventPrivacyLevel, ChannelType, PermissionFlagsBits } = require('discord.js');

// Load .env file if it exists
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
        const [key, value] = line.split('=').map(s => s.trim());
        if (key && !key.startsWith('#') && value && !process.env[key]) {
            process.env[key] = value;
        }
    });
}

// Configuration
const CONFIG = {
    // Your Discord Bot Token (get from Discord Developer Portal)
    DISCORD_TOKEN: process.env.DISCORD_TOKEN,
    
    // Your Discord Application ID
    CLIENT_ID: process.env.CLIENT_ID,
    
    // Code Tutor Dashboard URL (default local)
    TUTOR_API_URL: process.env.TUTOR_API_URL || 'http://localhost:51987/api/discord',
    
    // Guild ID for testing (optional, remove for global commands)
    GUILD_ID: process.env.GUILD_ID || null
};

// Validate configuration
if (!CONFIG.DISCORD_TOKEN) {
    console.error('\n❌ ERROR: DISCORD_TOKEN is niet ingesteld!');
    console.error('   Voer uit: npm run setup\n');
    process.exit(1);
}

if (!CONFIG.CLIENT_ID) {
    console.error('\n❌ ERROR: CLIENT_ID is niet ingesteld!');
    console.error('   Voer uit: npm run setup\n');
    process.exit(1);
}

console.log('✓ Configuratie geladen');
console.log(`  Bot Token: ${CONFIG.DISCORD_TOKEN.substring(0, 20)}...`);
console.log(`  Client ID: ${CONFIG.CLIENT_ID}`);
console.log(`  API URL: ${CONFIG.TUTOR_API_URL}\n`);

// Create Discord client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildScheduledEvents,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMembers
    ]
});

// In-memory storage for study groups and user profiles
const studyGroups = new Map(); // groupId -> { name, topic, members, voiceChannel, role, createdBy, createdAt }
const userProfiles = new Map(); // oderId -> { xp, level, badges, studyHours, pairSessions }
const pairQueue = []; // Queue of users looking for pair programming partners

// Slash commands
const commands = [
    new SlashCommandBuilder()
        .setName('progress')
        .setDescription('Bekijk je Code Tutor voortgang'),
    new SlashCommandBuilder()
        .setName('achievements')
        .setDescription('Bekijk je behaalde achievements'),
    new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('Bekijk de leaderboard (als meerdere users connected zijn)'),
    new SlashCommandBuilder()
        .setName('tip')
        .setDescription('Krijg een willekeurige programmeertip'),
    new SlashCommandBuilder()
        .setName('dashboard')
        .setDescription('Open het Code Tutor dashboard in VS Code'),
    new SlashCommandBuilder()
        .setName('jam')
        .setDescription('Maak een Code Jam event aan')
        .addStringOption(option =>
            option.setName('naam')
                .setDescription('Naam van de jam')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('beschrijving')
                .setDescription('Beschrijving van de jam')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('uren')
                .setDescription('Over hoeveel uur begint de jam? (standaard: 24)')
                .setRequired(false))
        .addIntegerOption(option =>
            option.setName('duur')
                .setDescription('Hoe lang duurt de jam in uren? (standaard: 4)')
                .setRequired(false)),
    new SlashCommandBuilder()
        .setName('events')
        .setDescription('Bekijk aankomende Code Jam events'),
    new SlashCommandBuilder()
        .setName('canceljam')
        .setDescription('Annuleer een Code Jam event')
        .addStringOption(option =>
            option.setName('event_id')
                .setDescription('Event ID (te vinden in /events of bij het aanmaken)')
                .setRequired(true)),
    new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Check de bot latency'),
    new SlashCommandBuilder()
        .setName('meme')
        .setDescription('Krijg een random programming meme/joke'),
    new SlashCommandBuilder()
        .setName('reset')
        .setDescription('Reset je Code Tutor voortgang (kan niet ongedaan worden!)')
        .addStringOption(option =>
            option.setName('bevestig')
                .setDescription('Type "RESET" om te bevestigen')
                .setRequired(true)),
    new SlashCommandBuilder()
        .setName('help')
        .setDescription('Bekijk alle beschikbare commands'),
    new SlashCommandBuilder()
        .setName('challenge')
        .setDescription('Krijg een dagelijkse coding challenge'),
    new SlashCommandBuilder()
        .setName('quote')
        .setDescription('Krijg een inspirerende programming quote'),
    new SlashCommandBuilder()
        .setName('stats')
        .setDescription('Bekijk gedetailleerde statistieken per command'),
    new SlashCommandBuilder()
        .setName('poll')
        .setDescription('Maak een poll voor de community')
        .addStringOption(option =>
            option.setName('vraag')
                .setDescription('De poll vraag')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('optie1')
                .setDescription('Eerste optie')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('optie2')
                .setDescription('Tweede optie')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('optie3')
                .setDescription('Derde optie (optioneel)')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('optie4')
                .setDescription('Vierde optie (optioneel)')
                .setRequired(false)),
    new SlashCommandBuilder()
        .setName('8ball')
        .setDescription('Vraag de magische 8-ball')
        .addStringOption(option =>
            option.setName('vraag')
                .setDescription('Je vraag aan de 8-ball')
                .setRequired(true)),
    new SlashCommandBuilder()
        .setName('coinflip')
        .setDescription('Gooi een muntje'),
    new SlashCommandBuilder()
        .setName('roll')
        .setDescription('Rol een dobbelsteen')
        .addIntegerOption(option =>
            option.setName('zijden')
                .setDescription('Aantal zijden (standaard: 6)')
                .setRequired(false)),
    // Study Groups & Pair Programming
    new SlashCommandBuilder()
        .setName('studygroup')
        .setDescription('Maak een study group met tijdelijk voice channel')
        .addStringOption(option =>
            option.setName('naam')
                .setDescription('Naam van de study group')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('topic')
                .setDescription('Onderwerp (bijv: Python, JavaScript, Algoritmen)')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('max_members')
                .setDescription('Maximum aantal leden (2-10, standaard: 5)')
                .setRequired(false)),
    new SlashCommandBuilder()
        .setName('joinstudy')
        .setDescription('Join een bestaande study group')
        .addStringOption(option =>
            option.setName('groep_id')
                .setDescription('ID van de study group')
                .setRequired(true)),
    new SlashCommandBuilder()
        .setName('leavestudy')
        .setDescription('Verlaat je huidige study group'),
    new SlashCommandBuilder()
        .setName('studygroups')
        .setDescription('Bekijk alle actieve study groups'),
    new SlashCommandBuilder()
        .setName('closestudy')
        .setDescription('Sluit je study group (alleen voor de maker)'),
    new SlashCommandBuilder()
        .setName('pair')
        .setDescription('Zoek een pair programming partner')
        .addStringOption(option =>
            option.setName('taal')
                .setDescription('Programmeertaal (bijv: Python, JavaScript)')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('niveau')
                .setDescription('Je niveau')
                .setRequired(true)
                .addChoices(
                    { name: 'Beginner', value: 'beginner' },
                    { name: 'Intermediate', value: 'intermediate' },
                    { name: 'Advanced', value: 'advanced' }
                )),
    new SlashCommandBuilder()
        .setName('unpair')
        .setDescription('Stop met zoeken naar een pair partner'),
    // Profiles & Badges
    new SlashCommandBuilder()
        .setName('profile')
        .setDescription('Bekijk je profiel of dat van iemand anders')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Bekijk het profiel van deze gebruiker')
                .setRequired(false)),
    new SlashCommandBuilder()
        .setName('badges')
        .setDescription('Bekijk alle beschikbare badges en welke je hebt'),
    new SlashCommandBuilder()
        .setName('topstudents')
        .setDescription('Bekijk de top studenten'),
    // Server Management - Channels, Voice, Roles
    new SlashCommandBuilder()
        .setName('createchannel')
        .setDescription('Maak een nieuwe text channel aan')
        .addStringOption(option =>
            option.setName('naam')
                .setDescription('Naam van de channel')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('beschrijving')
                .setDescription('Beschrijving/topic van de channel')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('categorie')
                .setDescription('Categorie (bijv: learning, projects, general)')
                .setRequired(false)),
    new SlashCommandBuilder()
        .setName('createvoice')
        .setDescription('Maak een nieuwe voice channel aan')
        .addStringOption(option =>
            option.setName('naam')
                .setDescription('Naam van de voice channel')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('userlimit')
                .setDescription('Maximaal aantal gebruikers (0 = onbeperkt, standaard: 0)')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('categorie')
                .setDescription('Categorie voor de voice channel')
                .setRequired(false)),
    new SlashCommandBuilder()
        .setName('createrole')
        .setDescription('Maak een nieuwe role aan')
        .addStringOption(option =>
            option.setName('naam')
                .setDescription('Naam van de role')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('kleur')
                .setDescription('Kleur in hex (bijv: #FF5733, standaard: blauw)')
                .setRequired(false))
        .addBooleanOption(option =>
            option.setName('hoistable')
                .setDescription('Toon deze role apart in de memberlist?')
                .setRequired(false)),
    new SlashCommandBuilder()
        .setName('assignrole')
        .setDescription('Geef iemand een role')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('De gebruiker die de role krijgt')
                .setRequired(true))
        .addRoleOption(option =>
            option.setName('role')
                .setDescription('De role om toe te wijzen')
                .setRequired(true)),
    new SlashCommandBuilder()
        .setName('removerole')
        .setDescription('Verwijder een role van iemand')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('De gebruiker van wie de role verwijderd wordt')
                .setRequired(true))
        .addRoleOption(option =>
            option.setName('role')
                .setDescription('De role om te verwijderen')
                .setRequired(true)),
    new SlashCommandBuilder()
        .setName('setuproles')
        .setDescription('Automatisch standaard roles aanmaken (Python, JavaScript, etc)'),
    new SlashCommandBuilder()
        .setName('setupchannels')
        .setDescription('Automatisch standaard channels aanmaken voor leren'),
    new SlashCommandBuilder()
        .setName('shutdown')
        .setDescription('Zet de bot uit (alleen voor server eigenaar)'),
    new SlashCommandBuilder()
        .setName('list')
        .setDescription('Bekijk alle beschikbare commands'),
].map(command => command.toJSON());

// Fetch progress from Code Tutor API
async function fetchProgress() {
    try {
        const response = await fetch(CONFIG.TUTOR_API_URL);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Failed to fetch progress:', error.message);
        return null;
    }
}

// Send command to VS Code extension
async function sendCommand(command) {
    try {
        const baseUrl = CONFIG.TUTOR_API_URL.replace('/api/discord', '');
        const response = await fetch(`${baseUrl}/api/command`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ command })
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Failed to send command:', error.message);
        return null;
    }
}

// Programming tips
const TIPS = [
    '💡 Gebruik descriptieve variabele namen - `userAge` is beter dan `x`',
    '💡 Schrijf kleine functies die één ding goed doen',
    '💡 Comment je code, maar laat de code zelf ook leesbaar zijn',
    '💡 Test je code regelmatig tijdens het schrijven, niet alleen aan het eind',
    '💡 Gebruik version control (Git) - zelfs voor kleine projecten',
    '💡 Lees de error messages goed - ze vertellen je vaak precies wat er mis is',
    '💡 Neem pauzes! Een frisse blik lost vaak problemen sneller op',
    '💡 Leer keyboard shortcuts - het bespaart veel tijd',
    '💡 Debuggen met console.log/print is prima, maar leer ook de debugger gebruiken',
    '💡 Kopieer geen code die je niet begrijpt',
    '💡 Refactor regelmatig - perfecte code schrijf je niet in één keer',
    '💡 Lees documentatie - het is de beste bron van informatie',
    '💡 Maak eerst iets dat werkt, optimaliseer daarna',
    '💡 Gebruik een linter om consistente code te schrijven',
    '💡 Slaap er een nachtje over bij moeilijke bugs'
];

// Programming memes/jokes
const MEMES = [
    { joke: 'Waarom houden programmeurs van dark mode?', punchline: 'Omdat licht bugs aantrekt! 🪲' },
    { joke: 'Hoeveel programmeurs heb je nodig om een lamp te vervangen?', punchline: 'Geen, dat is een hardware probleem! 💡' },
    { joke: 'Waarom was de JavaScript developer verdrietig?', punchline: 'Omdat hij niet wist hoe hij null moest handlen! 😢' },
    { joke: 'Wat is het favoriete drankje van een programmeur?', punchline: 'Java! ☕' },
    { joke: 'Waarom doen programmeurs Halloween en Kerst door elkaar?', punchline: 'Omdat Oct 31 = Dec 25! 🎃🎄' },
    { joke: '"Ik heb geen bugs in mijn code"', punchline: '- Niemand ooit 🤡' },
    { joke: 'Wat zei de array tegen de loop?', punchline: 'Stop met me te pushen! 👋' },
    { joke: 'Waarom gebruiken programmeurs geen tandpasta?', punchline: 'Omdat ze bang zijn voor recursion! 🔄' },
    { joke: 'Er zijn 10 soorten mensen in de wereld:', punchline: 'Zij die binair begrijpen en zij die dat niet doen! 🤓' },
    { joke: 'Wat is het gevaarlijkste op een computer?', punchline: 'Een while(true) loop op vrijdagmiddag! 💥' },
    { joke: 'Hoe noem je een programmeur zonder vriendin?', punchline: 'Homeless, want hij heeft geen this.home 🏠' },
    { joke: 'Waarom zijn CSS grappen niet grappig?', punchline: 'Omdat ze nooit uitlijnen! 📐' },
    { joke: 'Mijn code werkt en ik weet niet waarom.', punchline: 'Mijn code werkt niet en ik weet niet waarom. 🤷' },
    { joke: '"Het werkt op mijn machine!"', punchline: '- Beroemde laatste woorden 💀' },
    { joke: 'Waarom zijn programmeurs slechte lovers?', punchline: 'Ze denken dat foreplay een for-loop is! 🔄' },
    { joke: 'Een SQL query loopt een bar binnen...', punchline: 'Loopt naar 2 tafels en vraagt: "Mag ik joinen?" 🍻' },
    { joke: 'Programmeren is 10% code schrijven', punchline: 'En 90% uitzoeken waarom het niet werkt 🔍' },
    { joke: 'Mijn grootste talent?', punchline: 'Bugs maken die niemand kan reproduceren 🐛' }
];

// Inspirational programming quotes
const QUOTES = [
    { quote: 'First, solve the problem. Then, write the code.', author: 'John Johnson' },
    { quote: 'Code is like humor. When you have to explain it, it\'s bad.', author: 'Cory House' },
    { quote: 'Make it work, make it right, make it fast.', author: 'Kent Beck' },
    { quote: 'Clean code always looks like it was written by someone who cares.', author: 'Robert C. Martin' },
    { quote: 'Programming isn\'t about what you know; it\'s about what you can figure out.', author: 'Chris Pine' },
    { quote: 'The best error message is the one that never shows up.', author: 'Thomas Fuchs' },
    { quote: 'Simplicity is the soul of efficiency.', author: 'Austin Freeman' },
    { quote: 'Any fool can write code that a computer can understand. Good programmers write code that humans can understand.', author: 'Martin Fowler' },
    { quote: 'Experience is the name everyone gives to their mistakes.', author: 'Oscar Wilde' },
    { quote: 'The only way to learn a new programming language is by writing programs in it.', author: 'Dennis Ritchie' },
    { quote: 'Sometimes it pays to stay in bed on Monday, rather than spending the rest of the week debugging Monday\'s code.', author: 'Dan Salomon' },
    { quote: 'Deleted code is debugged code.', author: 'Jeff Sickel' },
    { quote: 'If debugging is the process of removing bugs, then programming must be the process of putting them in.', author: 'Edsger W. Dijkstra' },
    { quote: 'The most disastrous thing that you can ever learn is your first programming language.', author: 'Alan Kay' },
    { quote: 'Talk is cheap. Show me the code.', author: 'Linus Torvalds' }
];

// Daily coding challenges
const CHALLENGES = [
    { title: 'FizzBuzz Variant', description: 'Schrijf een programma dat getallen 1-100 print. Voor veelvouden van 3 print "Fizz", voor 5 "Buzz", voor beide "FizzBuzz". **Extra:** voeg "Jazz" toe voor veelvouden van 7!', difficulty: 'Beginner', time: '15 min' },
    { title: 'Palindroom Checker', description: 'Maak een functie die checkt of een string een palindroom is (hetzelfde vooruit en achteruit). **Extra:** negeer spaties en hoofdletters!', difficulty: 'Beginner', time: '20 min' },
    { title: 'Array Sorteren', description: 'Implementeer je eigen bubble sort algoritme zonder built-in sort functies te gebruiken.', difficulty: 'Gemiddeld', time: '30 min' },
    { title: 'Fibonacci Generator', description: 'Schrijf een functie die de eerste N Fibonacci getallen genereert. **Extra:** maak het iteratief EN recursief!', difficulty: 'Beginner', time: '25 min' },
    { title: 'Anagram Detector', description: 'Maak een functie die checkt of twee woorden anagrammen zijn van elkaar.', difficulty: 'Beginner', time: '20 min' },
    { title: 'ToDo List CLI', description: 'Bouw een simpele command-line todo applicatie met add, remove, en list functies.', difficulty: 'Gemiddeld', time: '45 min' },
    { title: 'Password Generator', description: 'Maak een random password generator met opties voor lengte, cijfers, en speciale tekens.', difficulty: 'Beginner', time: '25 min' },
    { title: 'Binary Search', description: 'Implementeer het binary search algoritme. **Extra:** maak zowel iteratieve als recursieve versie!', difficulty: 'Gemiddeld', time: '30 min' },
    { title: 'Word Counter', description: 'Schrijf een programma dat het aantal woorden, zinnen, en karakters in een tekst telt.', difficulty: 'Beginner', time: '20 min' },
    { title: 'Caesar Cipher', description: 'Implementeer een Caesar cipher voor encryptie en decryptie van tekst.', difficulty: 'Gemiddeld', time: '35 min' },
    { title: 'Linked List', description: 'Bouw je eigen linked list data structuur met insert, delete, en search operaties.', difficulty: 'Gevorderd', time: '60 min' },
    { title: 'Calculator', description: 'Maak een calculator die +, -, *, / ondersteunt. **Extra:** voeg haakjes prioriteit toe!', difficulty: 'Gemiddeld', time: '40 min' },
    { title: 'Rock Paper Scissors', description: 'Bouw een rock-paper-scissors game tegen de computer met score tracking.', difficulty: 'Beginner', time: '30 min' },
    { title: 'Prime Finder', description: 'Schrijf een efficiënte functie die alle priemgetallen tot N vindt (Sieve of Eratosthenes).', difficulty: 'Gemiddeld', time: '35 min' },
    { title: 'JSON Parser', description: 'Bouw een simpele JSON parser die strings kan omzetten naar objecten.', difficulty: 'Gevorderd', time: '90 min' }
];

// 8-ball answers
const EIGHTBALL_ANSWERS = [
    { answer: 'Ja, absoluut!', type: 'positive' },
    { answer: 'Het is zeker.', type: 'positive' },
    { answer: 'Zonder twijfel.', type: 'positive' },
    { answer: 'Ja, zeker weten!', type: 'positive' },
    { answer: 'Je kunt erop rekenen.', type: 'positive' },
    { answer: 'Zeer waarschijnlijk.', type: 'positive' },
    { answer: 'Vooruitzichten zijn goed.', type: 'positive' },
    { answer: 'Tekenen wijzen naar ja.', type: 'positive' },
    { answer: 'Antwoord is wazig, probeer opnieuw.', type: 'neutral' },
    { answer: 'Vraag later opnieuw.', type: 'neutral' },
    { answer: 'Beter om nu niet te zeggen.', type: 'neutral' },
    { answer: 'Kan het nu niet voorspellen.', type: 'neutral' },
    { answer: 'Concentreer en vraag opnieuw.', type: 'neutral' },
    { answer: 'Reken er niet op.', type: 'negative' },
    { answer: 'Mijn antwoord is nee.', type: 'negative' },
    { answer: 'Mijn bronnen zeggen nee.', type: 'negative' },
    { answer: 'Vooruitzichten zijn niet goed.', type: 'negative' },
    { answer: 'Zeer twijfelachtig.', type: 'negative' }
];

// Badge definitions
const BADGES = [
    { id: 'newcomer', icon: '🌱', name: 'Newcomer', description: 'Joined Code Tutor', requirement: 'Join de bot', auto: true },
    { id: 'social', icon: '👋', name: 'Social Butterfly', description: 'Join je eerste study group', requirement: 'Join 1 study group' },
    { id: 'leader', icon: '👑', name: 'Leader', description: 'Maak een study group', requirement: 'Maak 1 study group' },
    { id: 'pair_programmer', icon: '👥', name: 'Pair Programmer', description: 'Voltooi een pair programming sessie', requirement: '1 pair sessie' },
    { id: 'study_addict', icon: '📚', name: 'Study Addict', description: 'Besteed 10 uur aan studeren', requirement: '10 uur in study groups' },
    { id: 'helper', icon: '🤝', name: 'Helper', description: 'Help 5 mensen met pair programming', requirement: '5 pair sessies' },
    { id: 'rising_star', icon: '⭐', name: 'Rising Star', description: 'Bereik level 5', requirement: 'Level 5' },
    { id: 'dedicated', icon: '💎', name: 'Dedicated', description: 'Bereik level 10', requirement: 'Level 10' },
    { id: 'master', icon: '🏆', name: 'Master', description: 'Bereik level 20', requirement: 'Level 20' },
    { id: 'night_owl', icon: '🦉', name: 'Night Owl', description: 'Studeer na middernacht', requirement: 'Actief na 00:00' },
    { id: 'early_bird', icon: '🐦', name: 'Early Bird', description: 'Studeer voor 7 uur', requirement: 'Actief voor 07:00' },
    { id: 'streak_3', icon: '🔥', name: '3 Day Streak', description: '3 dagen achter elkaar actief', requirement: '3 dagen streak' },
    { id: 'streak_7', icon: '🔥', name: 'Week Warrior', description: '7 dagen achter elkaar actief', requirement: '7 dagen streak' },
    { id: 'polyglot', icon: '🌍', name: 'Polyglot', description: 'Studeer 3+ programmeertalen', requirement: '3 talen' },
    { id: 'collector', icon: '🎖️', name: 'Badge Collector', description: 'Verzamel 10 badges', requirement: '10 badges' }
];

// Helper function to get or create user profile
function getProfile(userId) {
    if (!userProfiles.has(userId)) {
        userProfiles.set(userId, {
            oderId: userId,
            xp: 0,
            level: 1,
            badges: ['newcomer'],
            studyHours: 0,
            pairSessions: 0,
            studyGroupsJoined: 0,
            studyGroupsCreated: 0,
            languages: new Set(),
            lastActive: new Date(),
            streak: 0,
            lastStreakDate: null
        });
    }
    return userProfiles.get(userId);
}

// Add XP and check for level up
function addXP(userId, amount) {
    const profile = getProfile(userId);
    profile.xp += amount;
    const newLevel = Math.floor(profile.xp / 100) + 1;
    const leveledUp = newLevel > profile.level;
    profile.level = newLevel;
    
    // Check for level badges
    if (profile.level >= 5 && !profile.badges.includes('rising_star')) profile.badges.push('rising_star');
    if (profile.level >= 10 && !profile.badges.includes('dedicated')) profile.badges.push('dedicated');
    if (profile.level >= 20 && !profile.badges.includes('master')) profile.badges.push('master');
    if (profile.badges.length >= 10 && !profile.badges.includes('collector')) profile.badges.push('collector');
    
    return leveledUp;
}

// Check time-based badges
function checkTimeBadges(userId) {
    const profile = getProfile(userId);
    const hour = new Date().getHours();
    if (hour >= 0 && hour < 5 && !profile.badges.includes('night_owl')) {
        profile.badges.push('night_owl');
    }
    if (hour >= 5 && hour < 7 && !profile.badges.includes('early_bird')) {
        profile.badges.push('early_bird');
    }
}

// Generate unique study group ID
function generateGroupId() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Create progress embed
function createProgressEmbed(data) {
    if (!data) {
        return new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle('❌ Verbinding Mislukt')
            .setDescription('Kon geen verbinding maken met VS Code.\n\nZorg ervoor dat:\n• VS Code is geopend\n• Code Tutor extensie actief is\n• Dashboard server draait (gebruik `/dashboard` in VS Code)')
            .setTimestamp();
    }

    const progressBar = (current, max) => {
        const filled = Math.round((current / max) * 10);
        const empty = 10 - filled;
        return '█'.repeat(filled) + '░'.repeat(empty);
    };

    // Calculate progress to next level
    let nextLevel = 20;
    let currentBase = 0;
    if (data.totalInteractions >= 100) {
        nextLevel = 100;
        currentBase = 100;
    } else if (data.totalInteractions >= 50) {
        nextLevel = 100;
        currentBase = 50;
    } else if (data.totalInteractions >= 20) {
        nextLevel = 50;
        currentBase = 20;
    }

    const embed = new EmbedBuilder()
        .setColor(0x60A5FA)
        .setTitle('🎓 Code Tutor Progress')
        .setDescription(`${data.skillEmoji} **${data.skillLevel}**`)
        .addFields(
            { 
                name: '📊 Statistieken', 
                value: `**Totaal Interacties:** ${data.totalInteractions}\n**Commands Gebruikt:** ${data.commandsUsed}\n**Achievements:** ${data.achievementCount}/10`,
                inline: true 
            },
            { 
                name: '📈 Voortgang', 
                value: `${progressBar(data.totalInteractions - currentBase, nextLevel - currentBase)} ${data.totalInteractions}/${nextLevel}`,
                inline: true 
            }
        )
        .setTimestamp()
        .setFooter({ text: 'Code Tutor • VS Code Extension' });

    if (data.topCommands && data.topCommands.length > 0) {
        embed.addFields({
            name: '🏆 Top Commands',
            value: data.topCommands.join('\n') || 'Nog geen commands gebruikt',
            inline: false
        });
    }

    return embed;
}

// Create achievements embed
function createAchievementsEmbed(data) {
    if (!data) {
        return new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle('❌ Verbinding Mislukt')
            .setDescription('Kon geen verbinding maken met VS Code.')
            .setTimestamp();
    }

    const allAchievements = [
        { id: 'first_step', icon: '👶', name: 'Eerste Stap', description: '1 interactie' },
        { id: 'active_student', icon: '🥉', name: 'Actieve Student', description: '20 interacties' },
        { id: 'dedicated', icon: '🥈', name: 'Gevorderde Leerling', description: '50 interacties' },
        { id: 'master', icon: '🏆', name: 'Code Meester', description: '100 interacties' },
        { id: 'debugger', icon: '🐛', name: 'Bug Hunter', description: '10x /debug' },
        { id: 'reviewer', icon: '👀', name: 'Code Reviewer', description: '10x /review' },
        { id: 'learner', icon: '📚', name: 'Eeuwige Leerling', description: '10x /explain' },
        { id: 'quiz_master', icon: '🧠', name: 'Quiz Master', description: '20x /quiz' },
        { id: 'exerciser', icon: '💪', name: 'Oefenaar', description: '15x /exercise' },
        { id: 'all_rounder', icon: '🌟', name: 'All-Rounder', description: 'Alle commands' }
    ];

    const achievementsList = allAchievements.map(ach => {
        const unlocked = data.achievements.some(a => a.includes(ach.name));
        return `${unlocked ? ach.icon : '🔒'} **${ach.name}** - ${ach.description} ${unlocked ? '✅' : ''}`;
    }).join('\n');

    return new EmbedBuilder()
        .setColor(0xFFD700)
        .setTitle('🏅 Achievements')
        .setDescription(`**Behaald:** ${data.achievementCount}/10\n\n${achievementsList}`)
        .setTimestamp()
        .setFooter({ text: 'Code Tutor • VS Code Extension' });
}

// Register slash commands
async function registerCommands() {
    const rest = new REST({ version: '10' }).setToken(CONFIG.DISCORD_TOKEN);

    try {
        console.log('🔄 Registering slash commands...');
        
        if (CONFIG.GUILD_ID) {
            // Guild-specific commands (instant)
            await rest.put(
                Routes.applicationGuildCommands(CONFIG.CLIENT_ID, CONFIG.GUILD_ID),
                { body: commands }
            );
        } else {
            // Global commands (can take up to an hour)
            await rest.put(
                Routes.applicationCommands(CONFIG.CLIENT_ID),
                { body: commands }
            );
        }
        
        console.log('✅ Slash commands registered!');
    } catch (error) {
        console.error('❌ Failed to register commands:', error);
    }
}

// Bot ready event
client.once('ready', () => {
    console.log(`✅ Bot logged in as ${client.user.tag}`);
    console.log(`📊 Monitoring Code Tutor at: ${CONFIG.TUTOR_API_URL}`);
    
    // Set bot status
    client.user.setActivity('je voortgang 📊', { type: 3 }); // "Watching"
});

// Handle slash commands
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName } = interaction;

    if (commandName === 'progress') {
        await interaction.deferReply();
        const data = await fetchProgress();
        const embed = createProgressEmbed(data);
        await interaction.editReply({ embeds: [embed] });
    }
    
    else if (commandName === 'achievements') {
        await interaction.deferReply();
        const data = await fetchProgress();
        const embed = createAchievementsEmbed(data);
        await interaction.editReply({ embeds: [embed] });
    }
    
    else if (commandName === 'leaderboard') {
        // For now, just show single user data
        // Could be expanded to store multiple users in a database
        await interaction.deferReply();
        const data = await fetchProgress();
        
        if (!data) {
            await interaction.editReply('❌ Kon geen verbinding maken met VS Code.');
            return;
        }

        const embed = new EmbedBuilder()
            .setColor(0x10B981)
            .setTitle('🏆 Leaderboard')
            .setDescription('*Momenteel alleen jouw voortgang*\n\n' +
                `🥇 **VS Code User** - ${data.totalInteractions} interacties (${data.skillLevel})`)
            .setFooter({ text: 'Tip: Verbind meerdere computers voor een echte leaderboard!' })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    }
    
    else if (commandName === 'dashboard') {
        await interaction.deferReply();
        const result = await sendCommand('openDashboard');
        
        if (result && result.success) {
            const embed = new EmbedBuilder()
                .setColor(0x10B981)
                .setTitle('✅ Dashboard Geopend')
                .setDescription('Het Code Tutor dashboard is geopend in VS Code!\n\n🌐 Je kunt het ook bekijken op:\nhttp://localhost:51987')
                .setTimestamp();
            await interaction.editReply({ embeds: [embed] });
        } else {
            const embed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('❌ Kon Dashboard Niet Openen')
                .setDescription('Zorg ervoor dat:\n• VS Code is geopend\n• Code Tutor extensie actief is\n\nProbeer `/dashboard` in VS Code te gebruiken.')
                .setTimestamp();
            await interaction.editReply({ embeds: [embed] });
        }
    }
    
    else if (commandName === 'tip') {
        const tip = TIPS[Math.floor(Math.random() * TIPS.length)];
        const embed = new EmbedBuilder()
            .setColor(0xFBBF24)
            .setTitle('📚 Programmeer Tip')
            .setDescription(tip)
            .setFooter({ text: 'Code Tutor • Gebruik /tip voor nog een tip!' })
            .setTimestamp();
        await interaction.reply({ embeds: [embed] });
    }
    
    else if (commandName === 'jam') {
        await interaction.deferReply();
        
        try {
            const naam = interaction.options.getString('naam');
            const beschrijving = interaction.options.getString('beschrijving');
            const urenVooraf = interaction.options.getInteger('uren') || 24;
            const duurUren = interaction.options.getInteger('duur') || 4;
            
            const startTime = new Date(Date.now() + urenVooraf * 60 * 60 * 1000);
            const endTime = new Date(startTime.getTime() + duurUren * 60 * 60 * 1000);
            
            const event = await interaction.guild.scheduledEvents.create({
                name: `🎮 ${naam}`,
                description: `${beschrijving}\n\n🎓 Georganiseerd via Code Tutor\n👤 Door: ${interaction.user.username}`,
                scheduledStartTime: startTime,
                scheduledEndTime: endTime,
                privacyLevel: GuildScheduledEventPrivacyLevel.GuildOnly,
                entityType: GuildScheduledEventEntityType.External,
                entityMetadata: {
                    location: 'VS Code / Online'
                }
            });
            
            const embed = new EmbedBuilder()
                .setColor(0x10B981)
                .setTitle('🎉 Code Jam Aangemaakt!')
                .setDescription(`**${naam}**\n\n${beschrijving}`)
                .addFields(
                    { name: '📅 Start', value: `<t:${Math.floor(startTime.getTime() / 1000)}:F>`, inline: true },
                    { name: '⏱️ Duur', value: `${duurUren} uur`, inline: true },
                    { name: '📍 Locatie', value: 'VS Code / Online', inline: true }
                )
                .setFooter({ text: `Event ID: ${event.id}` })
                .setTimestamp();
            
            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Failed to create event:', error);
            const embed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('❌ Kon Event Niet Aanmaken')
                .setDescription(`Er ging iets mis: ${error.message}\n\nZorg ervoor dat de bot de "Manage Events" permissie heeft!`)
                .setTimestamp();
            await interaction.editReply({ embeds: [embed] });
        }
    }
    
    else if (commandName === 'events') {
        await interaction.deferReply();
        
        try {
            const events = await interaction.guild.scheduledEvents.fetch();
            const codeJams = events.filter(e => e.name.includes('🎮') || e.description?.includes('Code Tutor'));
            
            if (codeJams.size === 0) {
                const embed = new EmbedBuilder()
                    .setColor(0xFBBF24)
                    .setTitle('📅 Aankomende Events')
                    .setDescription('Geen Code Jam events gepland.\n\nGebruik `/jam` om een nieuwe aan te maken!')
                    .setTimestamp();
                await interaction.editReply({ embeds: [embed] });
                return;
            }
            
            const eventList = codeJams.map(e => {
                const startTimestamp = Math.floor(e.scheduledStartTimestamp / 1000);
                return `**${e.name}** (ID: \`${e.id}\`)\n<t:${startTimestamp}:F> (<t:${startTimestamp}:R>)\n${e.description?.split('\n')[0] || ''}\n`;
            }).join('\n');
            
            const embed = new EmbedBuilder()
                .setColor(0x60A5FA)
                .setTitle('📅 Aankomende Code Jams')
                .setDescription(eventList)
                .setFooter({ text: `${codeJams.size} event(s) • Gebruik /canceljam <id> om te annuleren` })
                .setTimestamp();
            
            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Failed to fetch events:', error);
            await interaction.editReply('❌ Kon events niet ophalen.');
        }
    }
    
    else if (commandName === 'canceljam') {
        await interaction.deferReply();
        
        try {
            const eventId = interaction.options.getString('event_id');
            const events = await interaction.guild.scheduledEvents.fetch();
            const event = events.get(eventId);
            
            if (!event) {
                const embed = new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setTitle('❌ Event Niet Gevonden')
                    .setDescription(`Kon geen event vinden met ID: \`${eventId}\`\n\nGebruik \`/events\` om de event IDs te zien.`)
                    .setTimestamp();
                await interaction.editReply({ embeds: [embed] });
                return;
            }
            
            const eventName = event.name;
            await event.delete();
            
            const embed = new EmbedBuilder()
                .setColor(0x10B981)
                .setTitle('🗑️ Event Geannuleerd')
                .setDescription(`**${eventName}** is succesvol verwijderd.`)
                .setTimestamp();
            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Failed to delete event:', error);
            const embed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('❌ Kon Event Niet Verwijderen')
                .setDescription(`Er ging iets mis: ${error.message}`)
                .setTimestamp();
            await interaction.editReply({ embeds: [embed] });
        }
    }
    
    else if (commandName === 'ping') {
        const sent = await interaction.reply({ content: '🏓 Pingen...', fetchReply: true });
        const latency = sent.createdTimestamp - interaction.createdTimestamp;
        const apiLatency = Math.round(client.ws.ping);
        
        const embed = new EmbedBuilder()
            .setColor(latency < 200 ? 0x10B981 : latency < 500 ? 0xFBBF24 : 0xFF0000)
            .setTitle('🏓 Pong!')
            .addFields(
                { name: '📡 Bot Latency', value: `${latency}ms`, inline: true },
                { name: '🌐 API Latency', value: `${apiLatency}ms`, inline: true }
            )
            .setFooter({ text: latency < 200 ? '✅ Snelle verbinding!' : latency < 500 ? '⚠️ Gemiddelde verbinding' : '❌ Trage verbinding' })
            .setTimestamp();
        
        await interaction.editReply({ content: '', embeds: [embed] });
    }
    
    else if (commandName === 'meme') {
        const meme = MEMES[Math.floor(Math.random() * MEMES.length)];
        const embed = new EmbedBuilder()
            .setColor(0xE879F9)
            .setTitle('😂 Programming Humor')
            .setDescription(`**${meme.joke}**\n\n||${meme.punchline}||`)
            .setFooter({ text: 'Code Tutor • Gebruik /meme voor nog een grap!' })
            .setTimestamp();
        await interaction.reply({ embeds: [embed] });
    }
    
    else if (commandName === 'reset') {
        const bevestiging = interaction.options.getString('bevestig');
        
        if (bevestiging !== 'RESET') {
            const embed = new EmbedBuilder()
                .setColor(0xFBBF24)
                .setTitle('⚠️ Bevestiging Vereist')
                .setDescription('Om je voortgang te resetten, type exact `RESET` als bevestiging.\n\n**Let op:** Dit kan niet ongedaan worden gemaakt!')
                .setTimestamp();
            await interaction.reply({ embeds: [embed], ephemeral: true });
            return;
        }
        
        await interaction.deferReply();
        const result = await sendCommand('resetProgress');
        
        if (result && result.success) {
            const embed = new EmbedBuilder()
                .setColor(0x10B981)
                .setTitle('🗑️ Voortgang Gereset')
                .setDescription('Je Code Tutor voortgang is volledig gereset.\n\nJe begint weer vanaf 0. Succes met leren! 🌱')
                .setTimestamp();
            await interaction.editReply({ embeds: [embed] });
        } else {
            const embed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('❌ Reset Mislukt')
                .setDescription('Kon geen verbinding maken met VS Code.\n\nZorg ervoor dat VS Code is geopend en de extensie actief is.')
                .setTimestamp();
            await interaction.editReply({ embeds: [embed] });
        }
    }
    
    else if (commandName === 'help') {
        const embed = new EmbedBuilder()
            .setColor(0x60A5FA)
            .setTitle('📖 Code Tutor Bot - Commands')
            .setDescription('Alle beschikbare commands:')
            .addFields(
                { name: '📊 Progress & Stats', value: '`/progress` - Bekijk voortgang\n`/achievements` - Bekijk achievements\n`/stats` - Gedetailleerde statistieken\n`/leaderboard` - Bekijk leaderboard', inline: false },
                { name: '🎓 Leren', value: '`/tip` - Programmeertip\n`/challenge` - Coding challenge\n`/quote` - Inspirerende quote\n`/dashboard` - Open VS Code dashboard', inline: false },
                { name: '📚 Study Groups', value: '`/studygroup` - Maak study group met VC\n`/joinstudy` - Join een study group\n`/leavestudy` - Verlaat study group\n`/studygroups` - Bekijk alle groepen\n`/closestudy` - Sluit je groep', inline: false },
                { name: '👥 Pair Programming', value: '`/pair` - Zoek een pair partner\n`/unpair` - Stop met zoeken', inline: false },
                { name: '🏅 Profiles & Badges', value: '`/profile` - Bekijk je profiel\n`/badges` - Bekijk alle badges\n`/topstudents` - Top studenten leaderboard', inline: false },
                { name: '🎮 Events', value: '`/jam` - Maak Code Jam\n`/events` - Bekijk events\n`/canceljam` - Annuleer event', inline: false },
                { name: '🎲 Fun', value: '`/meme` - Programming joke\n`/8ball` - Magische 8-ball\n`/poll` - Maak een poll\n`/coinflip` - Gooi muntje\n`/roll` - Rol dobbelsteen', inline: false },
                { name: '⚙️ Overig', value: '`/ping` - Check latency\n`/reset` - Reset voortgang\n`/help` - Dit menu', inline: false }
            )
            .setFooter({ text: 'Code Tutor Bot • VS Code Extension' })
            .setTimestamp();
        await interaction.reply({ embeds: [embed] });
    }
    
    else if (commandName === 'challenge') {
        const challenge = CHALLENGES[Math.floor(Math.random() * CHALLENGES.length)];
        const difficultyColor = challenge.difficulty === 'Beginner' ? 0x10B981 : challenge.difficulty === 'Gemiddeld' ? 0xFBBF24 : 0xEF4444;
        
        const embed = new EmbedBuilder()
            .setColor(difficultyColor)
            .setTitle(`🎯 Daily Challenge: ${challenge.title}`)
            .setDescription(challenge.description)
            .addFields(
                { name: '📊 Moeilijkheid', value: challenge.difficulty, inline: true },
                { name: '⏱️ Geschatte tijd', value: challenge.time, inline: true }
            )
            .setFooter({ text: 'Code Tutor • Gebruik /challenge voor een nieuwe!' })
            .setTimestamp();
        await interaction.reply({ embeds: [embed] });
    }
    
    else if (commandName === 'quote') {
        const quote = QUOTES[Math.floor(Math.random() * QUOTES.length)];
        const embed = new EmbedBuilder()
            .setColor(0x8B5CF6)
            .setTitle('💭 Programming Wisdom')
            .setDescription(`*"${quote.quote}"*\n\n— **${quote.author}**`)
            .setFooter({ text: 'Code Tutor • Gebruik /quote voor nog een!' })
            .setTimestamp();
        await interaction.reply({ embeds: [embed] });
    }
    
    else if (commandName === 'stats') {
        await interaction.deferReply();
        const data = await fetchProgress();
        
        if (!data || !data.rawData) {
            await interaction.editReply('❌ Kon geen statistieken ophalen. Zorg dat VS Code draait.');
            return;
        }
        
        const rawData = data.rawData;
        const total = Object.values(rawData).reduce((a, b) => a + b, 0);
        
        // Create bar chart
        const maxCount = Math.max(...Object.values(rawData), 1);
        const statsLines = Object.entries(rawData)
            .sort((a, b) => b[1] - a[1])
            .map(([cmd, count]) => {
                const barLength = Math.round((count / maxCount) * 15);
                const bar = '█'.repeat(barLength) + '░'.repeat(15 - barLength);
                const percentage = ((count / total) * 100).toFixed(1);
                return `\`${cmd.padEnd(10)}\` ${bar} ${count}x (${percentage}%)`;
            }).join('\n');
        
        const embed = new EmbedBuilder()
            .setColor(0x60A5FA)
            .setTitle('📊 Gedetailleerde Statistieken')
            .setDescription(`**Totaal:** ${total} interacties\n**Commands gebruikt:** ${Object.keys(rawData).length}\n\n${statsLines || 'Nog geen data'}`)
            .setFooter({ text: 'Code Tutor • VS Code Extension' })
            .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
    }
    
    else if (commandName === 'poll') {
        const vraag = interaction.options.getString('vraag');
        const opties = [
            interaction.options.getString('optie1'),
            interaction.options.getString('optie2'),
            interaction.options.getString('optie3'),
            interaction.options.getString('optie4')
        ].filter(Boolean);
        
        const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣'];
        const optiesText = opties.map((opt, i) => `${emojis[i]} ${opt}`).join('\n');
        
        const embed = new EmbedBuilder()
            .setColor(0x3B82F6)
            .setTitle('📊 Poll')
            .setDescription(`**${vraag}**\n\n${optiesText}`)
            .setFooter({ text: `Poll door ${interaction.user.username} • Reageer om te stemmen!` })
            .setTimestamp();
        
        const message = await interaction.reply({ embeds: [embed], fetchReply: true });
        
        // Add reactions
        for (let i = 0; i < opties.length; i++) {
            await message.react(emojis[i]);
        }
    }
    
    else if (commandName === '8ball') {
        const vraag = interaction.options.getString('vraag');
        const answer = EIGHTBALL_ANSWERS[Math.floor(Math.random() * EIGHTBALL_ANSWERS.length)];
        const color = answer.type === 'positive' ? 0x10B981 : answer.type === 'negative' ? 0xEF4444 : 0xFBBF24;
        
        const embed = new EmbedBuilder()
            .setColor(color)
            .setTitle('🎱 Magic 8-Ball')
            .addFields(
                { name: '❓ Vraag', value: vraag, inline: false },
                { name: '🔮 Antwoord', value: `**${answer.answer}**`, inline: false }
            )
            .setFooter({ text: 'De 8-ball heeft gesproken!' })
            .setTimestamp();
        await interaction.reply({ embeds: [embed] });
    }
    
    else if (commandName === 'coinflip') {
        const result = Math.random() < 0.5 ? 'Kop' : 'Munt';
        const emoji = result === 'Kop' ? '👑' : '💰';
        
        const embed = new EmbedBuilder()
            .setColor(0xFBBF24)
            .setTitle('🪙 Coin Flip')
            .setDescription(`De munt draait...\n\n${emoji} **${result}!**`)
            .setTimestamp();
        await interaction.reply({ embeds: [embed] });
    }
    
    else if (commandName === 'roll') {
        const zijden = interaction.options.getInteger('zijden') || 6;
        const result = Math.floor(Math.random() * zijden) + 1;
        
        const embed = new EmbedBuilder()
            .setColor(0xEC4899)
            .setTitle('🎲 Dice Roll')
            .setDescription(`Je gooit een D${zijden}...\n\n🎯 **${result}!**`)
            .setTimestamp();
        await interaction.reply({ embeds: [embed] });
    }
    
    // ===== STUDY GROUPS =====
    else if (commandName === 'studygroup') {
        await interaction.deferReply();
        
        try {
            const naam = interaction.options.getString('naam');
            const topic = interaction.options.getString('topic');
            const maxMembers = Math.min(10, Math.max(2, interaction.options.getInteger('max_members') || 5));
            const groupId = generateGroupId();
            
            // Create role for the study group
            const role = await interaction.guild.roles.create({
                name: `📚 ${naam}`,
                color: 0x60A5FA,
                reason: `Study group created by ${interaction.user.username}`,
                mentionable: true
            });
            
            // Create voice channel with role-based permissions
            const voiceChannel = await interaction.guild.channels.create({
                name: `🎧 ${naam}`,
                type: ChannelType.GuildVoice,
                permissionOverwrites: [
                    {
                        id: interaction.guild.id, // @everyone
                        deny: [PermissionFlagsBits.Connect, PermissionFlagsBits.ViewChannel]
                    },
                    {
                        id: role.id,
                        allow: [PermissionFlagsBits.Connect, PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Speak]
                    },
                    {
                        id: client.user.id, // Bot
                        allow: [PermissionFlagsBits.Connect, PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ManageChannels]
                    }
                ],
                reason: `Voice channel for study group ${naam}`
            });
            
            // Add role to creator
            await interaction.member.roles.add(role);
            
            // Store group info
            studyGroups.set(groupId, {
                name: naam,
                topic,
                maxMembers,
                members: [interaction.user.id],
                voiceChannel: voiceChannel.id,
                role: role.id,
                createdBy: interaction.user.id,
                createdAt: new Date()
            });
            
            // Update user profile
            const profile = getProfile(interaction.user.id);
            profile.studyGroupsCreated++;
            profile.languages.add(topic.toLowerCase());
            if (!profile.badges.includes('leader')) profile.badges.push('leader');
            addXP(interaction.user.id, 25);
            checkTimeBadges(interaction.user.id);
            
            const embed = new EmbedBuilder()
                .setColor(0x10B981)
                .setTitle('📚 Study Group Aangemaakt!')
                .setDescription(`**${naam}**\n\n*${topic}*`)
                .addFields(
                    { name: '🆔 Group ID', value: `\`${groupId}\``, inline: true },
                    { name: '👥 Max Leden', value: `${maxMembers}`, inline: true },
                    { name: '🎧 Voice Channel', value: `<#${voiceChannel.id}>`, inline: true },
                    { name: '🏷️ Role', value: `<@&${role.id}>`, inline: true }
                )
                .setFooter({ text: `Anderen kunnen joinen met /joinstudy ${groupId}` })
                .setTimestamp();
            
            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Study group creation failed:', error);
            await interaction.editReply(`❌ Kon study group niet aanmaken: ${error.message}\n\nZorg dat de bot de juiste permissies heeft!`);
        }
    }
    
    else if (commandName === 'joinstudy') {
        await interaction.deferReply();
        
        const groupId = interaction.options.getString('groep_id').toUpperCase();
        const group = studyGroups.get(groupId);
        
        if (!group) {
            await interaction.editReply('❌ Study group niet gevonden. Gebruik `/studygroups` om beschikbare groepen te zien.');
            return;
        }
        
        if (group.members.includes(interaction.user.id)) {
            await interaction.editReply('❌ Je zit al in deze study group!');
            return;
        }
        
        if (group.members.length >= group.maxMembers) {
            await interaction.editReply('❌ Deze study group zit vol!');
            return;
        }
        
        try {
            const role = await interaction.guild.roles.fetch(group.role);
            await interaction.member.roles.add(role);
            group.members.push(interaction.user.id);
            
            // Update profile
            const profile = getProfile(interaction.user.id);
            profile.studyGroupsJoined++;
            profile.languages.add(group.topic.toLowerCase());
            if (!profile.badges.includes('social')) profile.badges.push('social');
            if (profile.languages.size >= 3 && !profile.badges.includes('polyglot')) profile.badges.push('polyglot');
            addXP(interaction.user.id, 10);
            checkTimeBadges(interaction.user.id);
            
            const embed = new EmbedBuilder()
                .setColor(0x10B981)
                .setTitle('✅ Joined Study Group!')
                .setDescription(`Je bent lid geworden van **${group.name}**!`)
                .addFields(
                    { name: '📖 Topic', value: group.topic, inline: true },
                    { name: '👥 Leden', value: `${group.members.length}/${group.maxMembers}`, inline: true },
                    { name: '🎧 Voice', value: `<#${group.voiceChannel}>`, inline: true }
                )
                .setTimestamp();
            
            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            await interaction.editReply(`❌ Kon niet joinen: ${error.message}`);
        }
    }
    
    else if (commandName === 'leavestudy') {
        await interaction.deferReply();
        
        // Find user's study group
        let userGroup = null;
        let userGroupId = null;
        for (const [id, group] of studyGroups) {
            if (group.members.includes(interaction.user.id)) {
                userGroup = group;
                userGroupId = id;
                break;
            }
        }
        
        if (!userGroup) {
            await interaction.editReply('❌ Je zit niet in een study group.');
            return;
        }
        
        try {
            const role = await interaction.guild.roles.fetch(userGroup.role);
            await interaction.member.roles.remove(role);
            userGroup.members = userGroup.members.filter(m => m !== interaction.user.id);
            
            await interaction.editReply(`✅ Je hebt **${userGroup.name}** verlaten.`);
        } catch (error) {
            await interaction.editReply(`❌ Kon niet verlaten: ${error.message}`);
        }
    }
    
    else if (commandName === 'studygroups') {
        const groupList = Array.from(studyGroups.entries())
            .map(([id, group]) => {
                const creator = `<@${group.createdBy}>`;
                return `**${group.name}** (\`${id}\`)\n📖 ${group.topic} • 👥 ${group.members.length}/${group.maxMembers} • Door: ${creator}`;
            }).join('\n\n');
        
        const embed = new EmbedBuilder()
            .setColor(0x60A5FA)
            .setTitle('📚 Actieve Study Groups')
            .setDescription(groupList || '*Geen actieve study groups. Maak er een met /studygroup!*')
            .setFooter({ text: 'Join met /joinstudy <ID>' })
            .setTimestamp();
        
        await interaction.reply({ embeds: [embed] });
    }
    
    else if (commandName === 'closestudy') {
        await interaction.deferReply();
        
        // Find user's created study group
        let userGroup = null;
        let userGroupId = null;
        for (const [id, group] of studyGroups) {
            if (group.createdBy === interaction.user.id) {
                userGroup = group;
                userGroupId = id;
                break;
            }
        }
        
        if (!userGroup) {
            await interaction.editReply('❌ Je hebt geen study group om te sluiten.');
            return;
        }
        
        try {
            // Delete voice channel
            const voiceChannel = await interaction.guild.channels.fetch(userGroup.voiceChannel);
            if (voiceChannel) await voiceChannel.delete('Study group closed');
            
            // Delete role
            const role = await interaction.guild.roles.fetch(userGroup.role);
            if (role) await role.delete('Study group closed');
            
            studyGroups.delete(userGroupId);
            
            const embed = new EmbedBuilder()
                .setColor(0xFBBF24)
                .setTitle('🗑️ Study Group Gesloten')
                .setDescription(`**${userGroup.name}** is gesloten en het voice channel is verwijderd.`)
                .setTimestamp();
            
            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            await interaction.editReply(`❌ Kon study group niet sluiten: ${error.message}`);
        }
    }
    
    // ===== PAIR PROGRAMMING =====
    else if (commandName === 'pair') {
        const taal = interaction.options.getString('taal');
        const niveau = interaction.options.getString('niveau');
        
        // Check if user is already in queue
        const existingIndex = pairQueue.findIndex(p => p.userId === interaction.user.id);
        if (existingIndex !== -1) {
            await interaction.reply({ content: '❌ Je staat al in de wachtrij! Gebruik `/unpair` om te stoppen.', ephemeral: true });
            return;
        }
        
        // Look for a match
        const matchIndex = pairQueue.findIndex(p => 
            p.taal.toLowerCase() === taal.toLowerCase() && 
            p.userId !== interaction.user.id
        );
        
        if (matchIndex !== -1) {
            // Found a match!
            const match = pairQueue.splice(matchIndex, 1)[0];
            
            // Update profiles for both users
            const profile1 = getProfile(interaction.user.id);
            const profile2 = getProfile(match.userId);
            profile1.pairSessions++;
            profile2.pairSessions++;
            profile1.languages.add(taal.toLowerCase());
            profile2.languages.add(taal.toLowerCase());
            
            if (!profile1.badges.includes('pair_programmer')) profile1.badges.push('pair_programmer');
            if (!profile2.badges.includes('pair_programmer')) profile2.badges.push('pair_programmer');
            if (profile1.pairSessions >= 5 && !profile1.badges.includes('helper')) profile1.badges.push('helper');
            if (profile2.pairSessions >= 5 && !profile2.badges.includes('helper')) profile2.badges.push('helper');
            
            addXP(interaction.user.id, 15);
            addXP(match.userId, 15);
            
            const embed = new EmbedBuilder()
                .setColor(0x10B981)
                .setTitle('🎉 Pair Programming Match!')
                .setDescription(`Perfect match gevonden voor **${taal}**!`)
                .addFields(
                    { name: '👤 Partner 1', value: `<@${interaction.user.id}> (${niveau})`, inline: true },
                    { name: '👤 Partner 2', value: `<@${match.userId}> (${match.niveau})`, inline: true }
                )
                .setFooter({ text: 'Start een DM of voice call om te beginnen!' })
                .setTimestamp();
            
            await interaction.reply({ embeds: [embed] });
            
            // Try to notify the matched user
            try {
                const matchUser = await client.users.fetch(match.userId);
                await matchUser.send(`🎉 Je hebt een pair programming match voor **${taal}**! Check de server.`);
            } catch (e) { /* User has DMs disabled */ }
        } else {
            // Add to queue
            pairQueue.push({
                userId: interaction.user.id,
                taal,
                niveau,
                timestamp: Date.now()
            });
            
            const embed = new EmbedBuilder()
                .setColor(0xFBBF24)
                .setTitle('🔍 Zoeken naar Partner...')
                .setDescription(`Je staat in de wachtrij voor **${taal}** (${niveau}).\n\nJe krijgt een melding zodra er een match is!`)
                .addFields({ name: '👥 In wachtrij', value: `${pairQueue.length} student(en)`, inline: true })
                .setFooter({ text: 'Gebruik /unpair om te stoppen met zoeken' })
                .setTimestamp();
            
            await interaction.reply({ embeds: [embed] });
        }
    }
    
    else if (commandName === 'unpair') {
        const index = pairQueue.findIndex(p => p.userId === interaction.user.id);
        if (index === -1) {
            await interaction.reply({ content: '❌ Je staat niet in de wachtrij.', ephemeral: true });
            return;
        }
        
        pairQueue.splice(index, 1);
        await interaction.reply({ content: '✅ Je bent verwijderd uit de pair programming wachtrij.', ephemeral: true });
    }
    
    // ===== PROFILES & BADGES =====
    else if (commandName === 'profile') {
        const targetUser = interaction.options.getUser('user') || interaction.user;
        const profile = getProfile(targetUser.id);
        
        // Also fetch VS Code data if available
        let vsCodeData = null;
        try {
            vsCodeData = await fetchProgress();
        } catch (e) {}
        
        const xpToNext = 100 - (profile.xp % 100);
        const progressBar = '█'.repeat(Math.floor((profile.xp % 100) / 10)) + '░'.repeat(10 - Math.floor((profile.xp % 100) / 10));
        
        const badgesDisplay = profile.badges.slice(0, 8).map(b => {
            const badge = BADGES.find(badge => badge.id === b);
            return badge ? badge.icon : '❓';
        }).join(' ') + (profile.badges.length > 8 ? ` +${profile.badges.length - 8}` : '');
        
        const embed = new EmbedBuilder()
            .setColor(0x60A5FA)
            .setTitle(`📋 Profiel: ${targetUser.username}`)
            .setThumbnail(targetUser.displayAvatarURL())
            .addFields(
                { name: '⭐ Level', value: `**${profile.level}**`, inline: true },
                { name: '✨ XP', value: `${profile.xp} XP`, inline: true },
                { name: '🏅 Badges', value: `${profile.badges.length}`, inline: true },
                { name: '📈 Voortgang', value: `[${progressBar}] ${xpToNext} XP tot level ${profile.level + 1}`, inline: false },
                { name: '🎖️ Badges', value: badgesDisplay || 'Geen badges', inline: false },
                { name: '📊 Statistieken', value: 
                    `📚 Study Groups Joined: ${profile.studyGroupsJoined}\n` +
                    `👑 Study Groups Created: ${profile.studyGroupsCreated}\n` +
                    `👥 Pair Sessions: ${profile.pairSessions}\n` +
                    `🌍 Talen: ${profile.languages.size > 0 ? Array.from(profile.languages).join(', ') : 'Geen'}`,
                    inline: false
                }
            )
            .setTimestamp();
        
        if (vsCodeData && targetUser.id === interaction.user.id) {
            embed.addFields({
                name: '💻 VS Code Progress',
                value: `${vsCodeData.skillEmoji} ${vsCodeData.skillLevel} • ${vsCodeData.totalInteractions} interacties`,
                inline: false
            });
        }
        
        await interaction.reply({ embeds: [embed] });
    }
    
    else if (commandName === 'badges') {
        const profile = getProfile(interaction.user.id);
        
        const badgesList = BADGES.map(badge => {
            const owned = profile.badges.includes(badge.id);
            return `${owned ? badge.icon : '🔒'} **${badge.name}** ${owned ? '✅' : ''}\n*${badge.description}* - ${badge.requirement}`;
        }).join('\n\n');
        
        const embed = new EmbedBuilder()
            .setColor(0xFFD700)
            .setTitle('🎖️ Badge Collectie')
            .setDescription(`**Je hebt:** ${profile.badges.length}/${BADGES.length} badges\n\n${badgesList}`)
            .setFooter({ text: 'Blijf actief om meer badges te verdienen!' })
            .setTimestamp();
        
        await interaction.reply({ embeds: [embed] });
    }
    
    else if (commandName === 'topstudents') {
        const sorted = Array.from(userProfiles.entries())
            .sort((a, b) => b[1].xp - a[1].xp)
            .slice(0, 10);
        
        if (sorted.length === 0) {
            await interaction.reply('❌ Nog geen studenten geregistreerd. Gebruik `/profile` om te beginnen!');
            return;
        }
        
        const medals = ['🥇', '🥈', '🥉'];
        const leaderboard = sorted.map(([userId, profile], i) => {
            const medal = medals[i] || `${i + 1}.`;
            return `${medal} <@${userId}> - Level **${profile.level}** (${profile.xp} XP) - ${profile.badges.length} 🎖️`;
        }).join('\n');
        
        const embed = new EmbedBuilder()
            .setColor(0xFFD700)
            .setTitle('🏆 Top Studenten')
            .setDescription(leaderboard)
            .setFooter({ text: 'Verdien XP door study groups te joinen en pair programming!' })
            .setTimestamp();
        
        await interaction.reply({ embeds: [embed] });
    }

    // Channel & Voice Management Commands
    else if (commandName === 'createchannel') {
        await interaction.deferReply();
        
        try {
            if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
                await interaction.editReply('❌ Je hebt geen toestemming om channels aan te maken!');
                return;
            }

            const naam = interaction.options.getString('naam').toLowerCase().replace(/\s+/g, '-');
            const beschrijving = interaction.options.getString('beschrijving') || `Channel: ${naam}`;
            const categorieName = interaction.options.getString('categorie') || null;

            let categoryId = null;

            // If category specified, find or create it
            if (categorieName) {
                // Fetch all channels to ensure we get all categories
                await interaction.guild.channels.fetch();
                
                // Try to find existing category
                let category = interaction.guild.channels.cache.find(
                    c => c.type === ChannelType.GuildCategory && c.name.toLowerCase() === categorieName.toLowerCase()
                );

                // If not found, create new category
                if (!category) {
                    category = await interaction.guild.channels.create({
                        name: categorieName,
                        type: ChannelType.GuildCategory,
                        reason: `Categorie aangemaakt door ${interaction.user.username}`
                    });
                }

                categoryId = category.id;
            }

            const channel = await interaction.guild.channels.create({
                name: naam,
                type: ChannelType.GuildText,
                topic: beschrijving,
                parent: categoryId,
                reason: `Channel aangemaakt door ${interaction.user.username}`
            });

            const embed = new EmbedBuilder()
                .setColor(0x10B981)
                .setTitle('✅ Channel Aangemaakt')
                .addFields(
                    { name: '📝 Naam', value: `<#${channel.id}>`, inline: true },
                    { name: '📌 Beschrijving', value: beschrijving, inline: true },
                    { name: '🏷️ Categorie', value: categorieName || 'Geen', inline: true }
                )
                .setFooter({ text: `Aangemaakt door ${interaction.user.username}` })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Error creating channel:', error);
            await interaction.editReply(`❌ Fout bij het aanmaken van channel: ${error.message}`);
        }
    }

    else if (commandName === 'createvoice') {
        await interaction.deferReply();
        
        try {
            if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
                await interaction.editReply('❌ Je hebt geen toestemming om voice channels aan te maken!');
                return;
            }

            const naam = interaction.options.getString('naam');
            const userLimit = interaction.options.getInteger('userlimit') || 0;
            const categorieName = interaction.options.getString('categorie') || null;

            let categoryId = null;

            // If category specified, find or create it
            if (categorieName) {
                // Fetch all channels to ensure we get all categories
                await interaction.guild.channels.fetch();
                
                // Try to find existing category
                let category = interaction.guild.channels.cache.find(
                    c => c.type === ChannelType.GuildCategory && c.name.toLowerCase() === categorieName.toLowerCase()
                );

                // If not found, create new category
                if (!category) {
                    category = await interaction.guild.channels.create({
                        name: categorieName,
                        type: ChannelType.GuildCategory,
                        reason: `Categorie aangemaakt door ${interaction.user.username}`
                    });
                }

                categoryId = category.id;
            }

            const channel = await interaction.guild.channels.create({
                name: naam,
                type: ChannelType.GuildVoice,
                userLimit: userLimit > 0 ? userLimit : 0,
                parent: categoryId,
                reason: `Voice channel aangemaakt door ${interaction.user.username}`
            });

            const limitText = userLimit > 0 ? `${userLimit} personen` : 'Onbeperkt';

            const embed = new EmbedBuilder()
                .setColor(0x6366F1)
                .setTitle('✅ Voice Channel Aangemaakt')
                .addFields(
                    { name: '🎤 Naam', value: `${channel.name}`, inline: true },
                    { name: '👥 Limiet', value: limitText, inline: true },
                    { name: '🏷️ Categorie', value: categorieName || 'Geen', inline: true }
                )
                .setFooter({ text: `Aangemaakt door ${interaction.user.username}` })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Error creating voice channel:', error);
            await interaction.editReply(`❌ Fout bij het aanmaken van voice channel: ${error.message}`);
        }
    }

    else if (commandName === 'createrole') {
        await interaction.deferReply();
        
        try {
            if (!interaction.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
                await interaction.editReply('❌ Je hebt geen toestemming om rollen aan te maken!');
                return;
            }

            const naam = interaction.options.getString('naam');
            let kleur = interaction.options.getString('kleur') || '#0099FF';
            
            // Validate color format
            if (!kleur.startsWith('#')) {
                kleur = '#' + kleur;
            }

            // Check if color is valid hex
            if (!/^#[0-9A-F]{6}$/i.test(kleur)) {
                await interaction.editReply('❌ Ongeldige kleur. Gebruik hex format: #FF5733');
                return;
            }

            const hoistable = interaction.options.getBoolean('hoistable') || false;

            const role = await interaction.guild.roles.create({
                name: naam,
                color: kleur,
                hoist: hoistable,
                reason: `Rol aangemaakt door ${interaction.user.username}`
            });

            const embed = new EmbedBuilder()
                .setColor(kleur)
                .setTitle('✅ Rol Aangemaakt')
                .addFields(
                    { name: '🏷️ Naam', value: `<@&${role.id}>`, inline: true },
                    { name: '🎨 Kleur', value: kleur, inline: true },
                    { name: '⭐ Apart Weergeven', value: hoistable ? 'Ja' : 'Nee', inline: true }
                )
                .setFooter({ text: `Aangemaakt door ${interaction.user.username}` })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Error creating role:', error);
            await interaction.editReply(`❌ Fout bij het aanmaken van rol: ${error.message}`);
        }
    }

    else if (commandName === 'assignrole') {
        await interaction.deferReply();
        
        try {
            if (!interaction.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
                await interaction.editReply('❌ Je hebt geen toestemming om rollen toe te wijzen!');
                return;
            }

            const user = interaction.options.getUser('user');
            const role = interaction.options.getRole('role');
            const member = await interaction.guild.members.fetch(user.id);

            if (member.roles.cache.has(role.id)) {
                await interaction.editReply(`⚠️ ${user.username} heeft deze rol al!`);
                return;
            }

            await member.roles.add(role);

            const embed = new EmbedBuilder()
                .setColor(0x10B981)
                .setTitle('✅ Rol Toegewezen')
                .addFields(
                    { name: '👤 Gebruiker', value: `${user.username}`, inline: true },
                    { name: '🏷️ Rol', value: `<@&${role.id}>`, inline: true }
                )
                .setFooter({ text: `Toegewezen door ${interaction.user.username}` })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Error assigning role:', error);
            await interaction.editReply(`❌ Fout bij het toewijzen van rol: ${error.message}`);
        }
    }

    else if (commandName === 'removerole') {
        await interaction.deferReply();
        
        try {
            if (!interaction.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
                await interaction.editReply('❌ Je hebt geen toestemming om rollen te verwijderen!');
                return;
            }

            const user = interaction.options.getUser('user');
            const role = interaction.options.getRole('role');
            const member = await interaction.guild.members.fetch(user.id);

            if (!member.roles.cache.has(role.id)) {
                await interaction.editReply(`⚠️ ${user.username} heeft deze rol niet!`);
                return;
            }

            await member.roles.remove(role);

            const embed = new EmbedBuilder()
                .setColor(0xEF4444)
                .setTitle('✅ Rol Verwijderd')
                .addFields(
                    { name: '👤 Gebruiker', value: `${user.username}`, inline: true },
                    { name: '🏷️ Rol', value: `${role.name}`, inline: true }
                )
                .setFooter({ text: `Verwijderd door ${interaction.user.username}` })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Error removing role:', error);
            await interaction.editReply(`❌ Fout bij het verwijderen van rol: ${error.message}`);
        }
    }

    else if (commandName === 'setuproles') {
        await interaction.deferReply();
        
        try {
            if (!interaction.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
                await interaction.editReply('❌ Je hebt geen toestemming om rollen aan te maken!');
                return;
            }

            const programmingLanguages = ['JavaScript', 'Java', 'C++', 'C#', 'TypeScript', 'Student', 'Docent'];
            const colors = ['#3776AB', '#007396', '#00599C', '#239120', '#00ADD8', '#CE3262', '#2B7489'];
            
            const createdRoles = [];

            for (let i = 0; i < programmingLanguages.length; i++) {
                const existingRole = interaction.guild.roles.cache.find(r => r.name === programmingLanguages[i]);
                
                if (!existingRole) {
                    const role = await interaction.guild.roles.create({
                        name: programmingLanguages[i],
                        color: colors[i],
                        reason: 'Auto-setup door bot'
                    });
                    createdRoles.push(`✅ ${programmingLanguages[i]}`);
                } else {
                    createdRoles.push(`⚠️ ${programmingLanguages[i]} (bestaat al)`);
                }
            }

            const embed = new EmbedBuilder()
                .setColor(0x10B981)
                .setTitle('✅ Standaard Rollen Aangemaakt')
                .setDescription(createdRoles.join('\n'))
                .setFooter({ text: 'Setup voltooid!' })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Error setting up roles:', error);
            await interaction.editReply(`❌ Fout bij het instellen van rollen: ${error.message}`);
        }
    }

    else if (commandName === 'setupchannels') {
        await interaction.deferReply();
        
        try {
            if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
                await interaction.editReply('❌ Je hebt geen toestemming om channels aan te maken!');
                return;
            }

            const channelConfigs = [
                { name: 'general', topic: 'Algemene discussie', type: ChannelType.GuildText },
                { name: 'announcements', topic: 'Belangrijke aankondigingen', type: ChannelType.GuildText },
                { name: 'learning-resources', topic: 'Leermateriaal en tutorials', type: ChannelType.GuildText },
                { name: 'project-showcase', topic: 'Deel je projecten en werk', type: ChannelType.GuildText },
                { name: 'study-help', topic: 'Vraag om hulp bij het leren', type: ChannelType.GuildText },
                { name: 'voice-general', topic: 'Algemeen voice kanaal', type: ChannelType.GuildVoice },
                { name: 'voice-study', topic: 'Study group voice kanaal', type: ChannelType.GuildVoice }
            ];

            const createdChannels = [];

            for (const config of channelConfigs) {
                const existingChannel = interaction.guild.channels.cache.find(c => c.name === config.name);
                
                if (!existingChannel) {
                    const channel = await interaction.guild.channels.create({
                        name: config.name,
                        type: config.type,
                        topic: config.topic || undefined,
                        reason: 'Auto-setup door bot'
                    });
                    createdChannels.push(`✅ ${config.type === ChannelType.GuildVoice ? '🎤' : '📝'} ${config.name}`);
                } else {
                    createdChannels.push(`⚠️ ${config.name} (bestaat al)`);
                }
            }

            const embed = new EmbedBuilder()
                .setColor(0x10B981)
                .setTitle('✅ Standaard Channels Aangemaakt')
                .setDescription(createdChannels.join('\n'))
                .setFooter({ text: 'Setup voltooid! Je server is nu klaar voor Code Tutor.' })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Error setting up channels:', error);
            await interaction.editReply(`❌ Fout bij het instellen van channels: ${error.message}`);
        }
    }

    else if (commandName === 'shutdown') {
        // Only owner can shut down the bot
        if (interaction.user.id !== interaction.guild.ownerId) {
            const embed = new EmbedBuilder()
                .setColor(0xEF4444)
                .setTitle('❌ Niet Toegestaan')
                .setDescription('Alleen de server eigenaar kan de bot uitschakelen!')
                .setFooter({ text: 'Probeer het met het juiste account' })
                .setTimestamp();
            
            await interaction.reply({ embeds: [embed], ephemeral: true });
            return;
        }

        // Confirm shutdown
        const confirmEmbed = new EmbedBuilder()
            .setColor(0xFBBF24)
            .setTitle('⚠️ Bot Wordt Uitgeschakeld')
            .setDescription('De bot gaat nu offline. Tot ziens! 👋')
            .setFooter({ text: 'Start met `npm start` om weer online te gaan' })
            .setTimestamp();

        await interaction.reply({ embeds: [confirmEmbed] });

        // Give Discord time to process the message, then shut down
        setTimeout(() => {
            console.log('\n🛑 Bot wordt uitgeschakeld door gebruiker:', interaction.user.username);
            console.log('⏰ Timestamp:', new Date().toLocaleString());
            console.log('📍 Server:', interaction.guild.name);
            console.log('\nGebruik `npm start` om de bot weer online te zetten.\n');
            
            process.exit(0);
        }, 1000);
    }

    else if (commandName === 'list') {
        await interaction.deferReply();

        const commandList = {
            '📊 Voortgang': [
                '`/progress` - Bekijk je Code Tutor voortgang',
                '`/achievements` - Bekijk je behaalde achievements',
                '`/leaderboard` - Bekijk de leaderboard',
                '`/stats` - Bekijk gedetailleerde statistieken',
                '`/profile` - Bekijk je profiel'
            ],
            '🎮 Entertainment': [
                '`/tip` - Krijg een willekeurige programmeertip',
                '`/challenge` - Krijg een dagelijkse coding challenge',
                '`/quote` - Krijg een inspirerende quote',
                '`/meme` - Krijg een random programming meme',
                '`/8ball` - Vraag de magische 8-ball',
                '`/coinflip` - Gooi een muntje',
                '`/roll` - Rol een dobbelsteen'
            ],
            '👥 Study Groups': [
                '`/studygroup` - Maak een study group aan',
                '`/joinstudy` - Join een study group',
                '`/leavestudy` - Verlaat je study group',
                '`/studygroups` - Bekijk alle study groups',
                '`/closestudy` - Sluit je study group',
                '`/pair` - Zoek een pair programming partner',
                '`/unpair` - Stop met zoeken naar partner'
            ],
            '📝 Community': [
                '`/help` - Bekijk alle commands',
                '`/poll` - Maak een poll',
                '`/topstudents` - Bekijk top studenten',
                '`/badges` - Bekijk je badges',
                '`/jam` - Maak een Code Jam event',
                '`/events` - Bekijk Code Jam events',
                '`/canceljam` - Annuleer een jam event'
            ],
            '🛠️ Server Management': [
                '`/createchannel` - Maak een text channel aan',
                '`/createvoice` - Maak een voice channel aan',
                '`/createrole` - Maak een role aan',
                '`/assignrole` - Geef iemand een role',
                '`/removerole` - Verwijder een role',
                '`/setuproles` - Auto setup programming roles',
                '`/setupchannels` - Auto setup learning channels'
            ],
            '⚙️ Bot Control': [
                '`/ping` - Check bot latency',
                '`/dashboard` - Open Code Tutor dashboard',
                '`/reset` - Reset je voortgang',
                '`/shutdown` - Zet de bot uit (eigenaar only)',
                '`/list` - Bekijk alle commands'
            ]
        };

        let description = '';
        for (const [category, cmds] of Object.entries(commandList)) {
            description += `\n**${category}**\n${cmds.join('\n')}\n`;
        }

        const embed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle('📋 Alle Beschikbare Commands')
            .setDescription(description)
            .setFooter({ text: 'Gebruik /help voor meer details over alle commands' })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    }
});

// Also respond to !progress, !achievements messages
client.on('messageCreate', async message => {
    if (message.author.bot) return;

    if (message.content === '!progress' || message.content === '!voortgang') {
        const data = await fetchProgress();
        const embed = createProgressEmbed(data);
        message.reply({ embeds: [embed] });
    }
    
    else if (message.content === '!achievements') {
        const data = await fetchProgress();
        const embed = createAchievementsEmbed(data);
        message.reply({ embeds: [embed] });
    }
});

// Start the bot
async function start() {
    if (CONFIG.DISCORD_TOKEN === 'YOUR_BOT_TOKEN_HERE') {
        console.log('⚠️  Please set your Discord bot token!');
        console.log('');
        console.log('1. Go to https://discord.com/developers/applications');
        console.log('2. Create a new application');
        console.log('3. Go to Bot section and create a bot');
        console.log('4. Copy the token and paste it in this file or set DISCORD_TOKEN env variable');
        console.log('5. Go to OAuth2 > URL Generator');
        console.log('6. Select "bot" and "applications.commands" scopes');
        console.log('7. Select permissions: Send Messages, Embed Links, Read Message History');
        console.log('8. Use the generated URL to invite the bot to your server');
        return;
    }

    await registerCommands();
    await client.login(CONFIG.DISCORD_TOKEN);
}

start();
