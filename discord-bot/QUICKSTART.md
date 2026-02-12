# Discord Bot Quick Start Guide

## Voor Gebruikers - Hoe Je De Bot Instelt (3 Minuten)

### 1️⃣ Discord Bot Aanmaken

1. Ga naar: https://discord.com/developers/applications
2. Klik: "New Application" (geef het een naam)
3. Ga naar: **Bot** tabblad
4. Klik: "Add Bot"
5. Klik op: "Reset Token"
6. **Kopieer je token** (je hebt dit direct nodig!)
7. Ga naar: **General Information**
8. **Kopieer je Application ID** (dit is je Client ID)

### 2️⃣ Bot Toevoegen Aan Server

1. Ga naar: **OAuth2** → **URL Generator**
2. Check deze boxes:
   - ✅ `bot`
3. Check deze permissions:
   - ✅ `Send Messages`
   - ✅ `Embed Links`
   - ✅ `Manage Events`
4. **Kopieer de gegenereerde URL**
5. Open de URL in je browser
6. Selecteer je server en voeg de bot toe

### 3️⃣ Bot Configureren Met Setup Script

Open je terminal in de `discord-bot` folder en run:

```bash
npm run setup
```

Dit vraagt je om:
- **Discord Bot Token** (plak de token van stap 1)
- **Client ID** (plak je Application ID van stap 1)
- **API URL** (druk Enter voor default)
- **Guild ID** (druk Enter, dit is optioneel)

### 4️⃣ Bot Starten

```bash
npm start
```

Je ziet:
```
✓ Configuratie geladen
✓ Bot connected!
```

### 5️⃣ Test De Bot

Ga naar je Discord server en typ:
```
/progress
```

Je zou je Code Tutor voortgang moeten zien! 🎉

---

## Beschikbare Commands

```
/progress      → Je Code Tutor voortgang
/achievements  → Je achievements
/leaderboard   → Top users
/tip           → Random programmeertip
/help          → Alle commands
/ping          → Bot latency
```

---

## Problemen?

### Setup werkt niet
```bash
npm run setup
```
Dit setup script helpt je stap voor stap

### Bot zegt "Token is niet ingesteld"
1. Run `npm run setup` opnieuw
2. Zorg dat je een geldig token hebt
3. Check dat `.env` bestand aangemaakt is

### Commands tonen niet
- Bot kan 15 minuten nodig hebben om commands te synchen
- Try server opnieuw joinen

### Bot antwoordt niet
- Controleer bot permissions in Discord server settings
- Zorg dat de bot kan Messages sturen

---

## Security Notes

⚠️ **BELANGRIJK:**
- Je `.env` bestand bevat je Discord bot token
- Deel dit NOOIT publiekelijk
- Voeg `.env` toe aan `.gitignore` als je git gebruikt
- Verander je token onmiddellijk als je het bent kwijtgeraakt

---

## Wat Gebeurt Achter De Schermen?

1. Setup script vraagt je credentials
2. Credentials worden opgeslagen in `.env` bestand
3. Bot.js leest `.env` en valideert credentials
4. Bot verbindt met Discord
5. Slash commands worden geregistreerd
6. Bot wacht op commands van users

---

## Volgende Stappen

Nadat je bot werkt:

1. Test `/progress` command
2. Test `/jam` command om een Code Jam te maken
3. Zorg dat je VS Code Code Tutor extension ook actief is (voor live data)
4. Meer commands uitproberen met `/help`

Veel plezier! 🎉
