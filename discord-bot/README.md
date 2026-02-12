# Code Tutor Discord Bot

Een Discord bot die je Code Tutor voortgang van je VS Code extension in Discord laat zien!

## Features

- 📊 Bekijk je voortgang met `/progress`
- 🏆 Zie je achievements met `/achievements`
- 🎯 Maak Code Jam events aan en beheer ze
- 💡 Krijg willekeurige programmeertips
- 👥 Leaderboard voor meerdere users
- 🔧 Volledig configureerbaar

## Snelle Start

### Stap 1: Discord Bot Aanmaken

1. Ga naar https://discord.com/developers/applications
2. Klik "New Application" en geef het een naam
3. Ga naar "Bot" en klik "Add Bot"
4. Kopieer je **Bot Token** (je hebt dit zo nodig)
5. Ga naar "General Information" en kopieer je **Application ID** (Client ID)

### Stap 2: Permissions Instellen

1. Ga naar "OAuth2" → "URL Generator"
2. Selecteer deze scopes:
   - `bot`
3. Selecteer deze permissions:
   - `Send Messages`
   - `Embed Links`
   - `Manage Events`
4. Kopieer de gegenereerde URL en open het in je browser om de bot toe te voegen aan je server

### Stap 3: Bot Configureren

Run dit command in deze folder:

```bash
npm run setup
```

Dit opent een interactief setup script dat je vraagt om:
- **Discord Bot Token** - Copy-paste van Developer Portal
- **Client ID** - Copy-paste van Developer Portal
- **API URL** (optioneel) - Waar je Code Tutor dashboard draait
- **Guild ID** (optioneel) - Voor testing

Je credentials worden opgeslagen in `.env` bestand.

### Stap 4: Bot Starten

```bash
npm start
```

Je zou een bericht moeten zien:
```
✓ Configuratie geladen
  Bot Token: MTQ0MDY3NzI...
  Client ID: 1440677266...
  API URL: http://localhost:51987/api/discord
```

## Commands

### Progress
```
/progress
```
Toont je Code Tutor voortgang met:
- Totale interacties
- Skill level
- Top commands
- Achievements

### Achievements
```
/achievements
```
Toont alle achievements die je hebt verdiend

### Leaderboard
```
/leaderboard
```
Toont top users (werkt alleen als meerdere users hun bot hebben connected)

### Tip
```
/tip
```
Krijgt een willekeurige programmeertip

### Code Jam
```
/jam <naam> <beschrijving> [uren] [duur]
```
Maakt een Code Jam event aan

Voorbeeld:
```
/jam naam:JavaScript Challenge beschrijving:Leer ES6 uren:24 duur:4
```

### Events
```
/events
```
Toont alle aankomende Code Jam events

### Cancel Jam
```
/canceljam <event_id>
```
Annuleert een Code Jam event

### Help
```
/help
```
Toont alle beschikbare commands

### Ping
```
/ping
```
Check de bot latency

### Reset
```
/reset bevestig:RESET
```
Reset je Code Tutor voortgang (kan niet ongedaan gemaakt worden!)

## Configuratie

### .env Bestand

Na het runnen van `npm run setup` wordt een `.env` bestand aangemaakt met:

```env
DISCORD_TOKEN=your_bot_token
CLIENT_ID=your_client_id
TUTOR_API_URL=http://localhost:51987/api/discord
GUILD_ID=
```

**Belangrijk:** 
- ⚠️ Deel je .env bestand NOOIT publiekelijk
- 🔒 Voeg .env toe aan .gitignore
- 🚫 Commit je credentials nooit naar Git

### Environment Variables

Je kunt deze ook via command line environment variables instellen:

```bash
# Linux/Mac
export DISCORD_TOKEN="your_token"
export CLIENT_ID="your_id"
npm start

# Windows PowerShell
$env:DISCORD_TOKEN="your_token"
$env:CLIENT_ID="your_id"
npm start

# Windows CMD
set DISCORD_TOKEN=your_token
set CLIENT_ID=your_id
npm start
```

## Development

### Watch Mode

```bash
npm run dev
```

Herstart de bot automatisch bij file changes

### Debugging

Voeg `DEBUG=*` toe voor meer logging:

```bash
DEBUG=* npm start
```

## Troubleshooting

### "DISCORD_TOKEN is niet ingesteld!"

Run:
```bash
npm run setup
```

### Bot verschijnt niet in Discord

1. Controleer of je bot in je server is toegevoegd
2. Check de permissions (moet Message Send hebben)
3. Zorg dat de bot role hoger is dan user roles

### Commands werken niet

1. Commands kunnen 15 minuten duren om te synchen
2. Probeer server opnieuw te joinen
3. Controleer bot permissions

### API Connection Error

1. Zorg dat Code Tutor dashboard draait (VS Code extension moet actief zijn)
2. Check of `TUTOR_API_URL` klopt (default: `http://localhost:51987/api/discord`)
3. Firewall kan lokale connections blokkeren

## Structuur

```
discord-bot/
├── bot.js              # Main bot script
├── setup.js            # Interactive setup script
├── package.json        # Dependencies
├── .env.example        # Example env file
└── README.md           # Dit bestand
```

## Dependecies

- `discord.js` ^14.14.1 - Discord bot library

## Licentie

MIT

## Support

Voor problemen:
1. Check de logs van je bot
2. Zorg dat alle credentials juist zijn
3. Controleer Discord Developer Portal settings
4. Zorg dat Code Tutor extension in VS Code actief is
