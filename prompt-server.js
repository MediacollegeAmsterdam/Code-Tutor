const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3001;

// Load prompts from JSON file
function loadPrompts() {
  try {
    const promptsPath = path.join(__dirname, 'prompts.json');
    console.log(`Loading prompts from: ${promptsPath}`);
    if (!fs.existsSync(promptsPath)) {
      console.warn(`Warning: prompts.json not found at ${promptsPath}. Using default prompts.`);
      return { prompts: {}, adaptivePrompts: {} };
    }
    const data = fs.readFileSync(promptsPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading prompts.json:', error);
    console.warn('Using default empty prompts to allow server to continue');
    return { prompts: {}, adaptivePrompts: {} };
  }
}

const prompts = loadPrompts();

const server = http.createServer((req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Handle GET /api/prompts
  if (req.method === 'GET' && req.url === '/api/prompts') {
    res.writeHead(200);
    res.end(JSON.stringify(prompts));
    return;
  }

  // Handle GET /api/prompts/:type (e.g., /api/prompts/base)
  if (req.method === 'GET' && req.url.startsWith('/api/prompts/')) {
    const promptType = req.url.split('/')[3];
    const prompt = prompts.prompts[promptType];
    
    if (prompt) {
      res.writeHead(200);
      res.end(JSON.stringify({ type: promptType, content: prompt }));
    } else {
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Prompt type not found' }));
    }
    return;
  }

  // Handle GET /api/adaptive-prompts/:yearLevel (e.g., /api/adaptive-prompts/2)
  if (req.method === 'GET' && req.url.startsWith('/api/adaptive-prompts/')) {
    const yearLevel = req.url.split('/')[3];
    const adaptivePrompt = prompts.adaptivePrompts[yearLevel];
    
    if (adaptivePrompt) {
      res.writeHead(200);
      res.end(JSON.stringify({ yearLevel, prompts: adaptivePrompt }));
    } else {
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Year level not found' }));
    }
    return;
  }

  // Handle GET /api/assignments - List all assignments
  if (req.method === 'GET' && req.url === '/api/assignments') {
    try {
      const assignmentsDir = path.join(__dirname, 'assignments');
      const files = fs.readdirSync(assignmentsDir)
        .filter(f => f.endsWith('.md') && f !== 'README.md')
        .sort()
        .reverse(); // Most recent first
      
      const assignments = files.map(file => {
        const filePath = path.join(assignmentsDir, file);
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Parse YAML frontmatter
        const yamlMatch = content.match(/^---\n([\s\S]*?)\n---/);
        const metadata = {};
        
        if (yamlMatch) {
          const yamlContent = yamlMatch[1];
          const lines = yamlContent.split('\n');
          lines.forEach(line => {
            const [key, ...valueParts] = line.split(':');
            if (key && valueParts.length > 0) {
              const value = valueParts.join(':').trim();
              metadata[key.trim()] = value;
            }
          });
        }
        
        return {
          id: file.replace('.md', ''),
          filename: file,
          title: metadata.title || file.replace('.md', ''),
          difficulty: metadata.difficulty || 'unknown',
          topic: metadata.topic || 'General',
          dueDate: metadata.dueDate || null,
          estimatedTime: metadata.estimatedTime ? parseInt(metadata.estimatedTime) : null
        };
      });
      
      res.writeHead(200);
      res.end(JSON.stringify(assignments));
    } catch (error) {
      console.error('Error loading assignments:', error);
      res.writeHead(500);
      res.end(JSON.stringify({ error: 'Failed to load assignments' }));
    }
    return;
  }

  // Handle GET /api/assignments/:id - Get specific assignment content
  if (req.method === 'GET' && req.url.startsWith('/api/assignments/')) {
    try {
      const assignmentId = req.url.split('/')[3];
      const filePath = path.join(__dirname, 'assignments', assignmentId + '.md');
      
      if (!fs.existsSync(filePath)) {
        res.writeHead(404);
        res.end(JSON.stringify({ error: 'Assignment not found' }));
        return;
      }
      
      const content = fs.readFileSync(filePath, 'utf8');
      const yamlMatch = content.match(/^---\n([\s\S]*?)\n---/);
      const markdownContent = yamlMatch ? content.substring(yamlMatch[0].length).trim() : content;
      
      const metadata = {};
      if (yamlMatch) {
        const yamlContent = yamlMatch[1];
        const lines = yamlContent.split('\n');
        lines.forEach(line => {
          const [key, ...valueParts] = line.split(':');
          if (key && valueParts.length > 0) {
            const value = valueParts.join(':').trim();
            metadata[key.trim()] = value;
          }
        });
      }
      
      res.writeHead(200);
      res.end(JSON.stringify({
        id: assignmentId,
        metadata,
        content: markdownContent
      }));
    } catch (error) {
      console.error('Error loading assignment:', error);
      res.writeHead(500);
      res.end(JSON.stringify({ error: 'Failed to load assignment' }));
    }
    return;
  }

  // Handle GET /api/health (for checking if server is running)
  if (req.method === 'GET' && req.url === '/api/health') {
    res.writeHead(200);
    res.end(JSON.stringify({ status: 'ok', message: 'Prompt server is running' }));
    return;
  }

  // Handle GET /events (Server-Sent Events for live updates)
  if (req.method === 'GET' && req.url === '/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });

    // Send initial connection message
    res.write('data: {"status":"connected"}\n\n');

    // Send dummy progress updates every 30 seconds
    const interval = setInterval(() => {
      res.write('data: {"totalInteractions":0,"debug":0,"review":0,"explain":0,"quiz":0,"exercise":0,"refactor":0,"concept":0}\n\n');
    }, 30000);

    // Clean up on client disconnect
    req.on('close', () => {
      clearInterval(interval);
      res.end();
    });
    return;
  }

  // Handle GET /api/progress (for dashboard stats)
  if (req.method === 'GET' && req.url === '/api/progress') {
    res.writeHead(200);
    res.end(JSON.stringify({
      totalInteractions: 0,
      debug: 0,
      review: 0,
      explain: 0,
      quiz: 0,
      exercise: 0,
      refactor: 0,
      concept: 0
    }));
    return;
  }

  // Handle GET /api/history (for streak and daily data)
  if (req.method === 'GET' && req.url === '/api/history') {
    res.writeHead(200);
    res.end(JSON.stringify({
      daily: {},
      streak: 0
    }));
    return;
  }

  // Handle GET /api/teacher/dashboard (for teacher analytics)
  if (req.method === 'GET' && req.url === '/api/teacher/dashboard') {
    res.writeHead(200);
    res.end(JSON.stringify({
      students: [],
      classStats: {
        totalStudents: 0,
        averageProgress: 0,
        totalCommands: 0,
        engagement: 0
      }
    }));
    return;
  }

  // Handle slides API endpoints for slideshow feature
  if (req.url === '/api/slides') {
    if (req.method === 'GET') {
      // Get all slides
      try {
        const slidesFile = path.join(__dirname, 'slides.json');
        let slides = [];
        if (fs.existsSync(slidesFile)) {
          const data = fs.readFileSync(slidesFile, 'utf8');
          slides = JSON.parse(data);
        }
        res.writeHead(200);
        res.end(JSON.stringify(slides));
      } catch (error) {
        console.error('Error loading slides:', error);
        res.writeHead(500);
        res.end(JSON.stringify({ error: 'Failed to load slides' }));
      }
      return;
    }
    
    if (req.method === 'POST') {
      // Add new slide
      let body = '';
      req.on('data', chunk => { body += chunk.toString(); });
      req.on('end', () => {
        try {
          const newSlide = JSON.parse(body);
          const slidesFile = path.join(__dirname, 'slides.json');
          let slides = [];
          
          // Load existing slides
          if (fs.existsSync(slidesFile)) {
            const data = fs.readFileSync(slidesFile, 'utf8');
            slides = JSON.parse(data);
          }
          
          // Add new slide
          slides.push(newSlide);
          
          // Save slides
          fs.writeFileSync(slidesFile, JSON.stringify(slides, null, 2));
          
          res.writeHead(201);
          res.end(JSON.stringify({ success: true, slide: newSlide }));
        } catch (error) {
          console.error('Error saving slide:', error);
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'Failed to save slide' }));
        }
      });
      return;
    }
  }

  // Handle DELETE /api/slides/:id - Delete specific slide
  if (req.method === 'DELETE' && req.url.startsWith('/api/slides/')) {
    try {
      const slideId = req.url.split('/')[3];
      const slidesFile = path.join(__dirname, 'slides.json');
      
      if (!fs.existsSync(slidesFile)) {
        res.writeHead(404);
        res.end(JSON.stringify({ error: 'No slides found' }));
        return;
      }
      
      let slides = JSON.parse(fs.readFileSync(slidesFile, 'utf8'));
      const originalLength = slides.length;
      slides = slides.filter(slide => slide.id !== slideId);
      
      if (slides.length === originalLength) {
        res.writeHead(404);
        res.end(JSON.stringify({ error: 'Slide not found' }));
        return;
      }
      
      fs.writeFileSync(slidesFile, JSON.stringify(slides, null, 2));
      
      res.writeHead(200);
      res.end(JSON.stringify({ success: true, message: 'Slide deleted' }));
    } catch (error) {
      console.error('Error deleting slide:', error);
      res.writeHead(500);
      res.end(JSON.stringify({ error: 'Failed to delete slide' }));
    }
    return;
  }

  // Handle POST /api/explain - Generate AI explanation for highlighted text
  if (req.url === '/api/explain' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const { text, userLevel } = JSON.parse(body);
        
        // Try to find in fallback explanations
        const fallbackExplanations = {
          'int': '**Integer (int)** - Een heel getal\n\nEen integer is gewoon een getal zonder kommagetallen. Denk aan: je leeftijd (18), het aantal appels (5), de temperatuur (12).\n\n📝 **Voorbeelden:** -5, 0, 42, 1000\n\n💡 **Waar gebruik je het voor?** Tellen, aantal, IDs, indexen in lijsten\n\n⚠️ **Let op:** In JavaScript zijn alle getallen eigenlijk floats (met decimalen), maar je kunt ze als integers gebruiken.',
          'string': '**String** - Tekst/woorden\n\nEen string is tekst die je tussen aanhalingstekens zet. Het kan letters, nummers, spaties, alles zijn!\n\n📝 **Voorbeelden:** "Hallo", \'Python\', `Welkom ${naam}`\n\n💡 **Waar gebruik je het voor?** Namen opslaan, berichten tonen, URLs, wachtwoorden\n\n🎯 **Aanhalingstekens:** Je kunt "", \'\' of `` gebruiken - zolang je ermee begint en eindigt!\n\n**Tips:** Strings zijn niet veranderbaar - maak een nieuwe als je iets wilt wijzigen.',
          'boolean': '**Boolean** - Waar of onwaar\n\nEen boolean kan maar twee waarden hebben: **true** (waar) of **false** (onwaar). Niets ertussenin!\n\n📝 **Voorbeelden:** true, false\n\n💡 **Waar gebruik je het voor?** Beslissingen in je code - "Is de gebruiker ingelogd? true/false"\n\n🔄 **In if-statements:** \n```\nif (gebruikerIsIngelogd) {\n  toonWelkomBericht();\n}\n```\n\n**Logische operatoren:** && (EN), || (OF), ! (NIET)',
          'float': '**Float** - Getal met komma\n\nEen float is een getal met decimalen/kommagetallen. Voor nauwkeurige berekeningen!\n\n📝 **Voorbeelden:** 3.14, -2.5, 0.001, 9.99\n\n💡 **Waar gebruik je het voor?** Prijzen (€19.99), percentages (85.5%), coördinaten, wiskunde\n\n⚠️ **Voorzichtig:** 0.1 + 0.2 = 0.30000000000000004 (Afronding!)\n\n📊 **Meer geheugen:** Floats gebruiken meer geheugen dan integers.',
          'array': '**Array** - Een lijst van dingen\n\nEen array is als een nummered lijstje. Perfect voor meerdere items bij elkaar houden!\n\n📝 **Syntax:** [item1, item2, item3]\n\n**Voorbeelden:**\n- `["appel", "banaan", "kers"]` - een fruitlijstje\n- `[1, 2, 3, 4, 5]` - nummers\n- `[true, false, true]` - waarheidswaarden\n\n🔢 **Index (Position):**\n- Eerste item = index **0**\n- Tweede item = index **1**\n- `fruits[0]` = "appel"\n\n📚 **Veel gebruikt:** `.push()` (toevoegen), `.pop()` (verwijderen), `.map()` (wijzigen)',
          'object': '**Object** - Geklassificeerde gegevens\n\nEen object is als een container met gelabelde vakjes. Elke vakje heeft een naam (key) en waarde!\n\n📝 **Syntax:** { sleutel: waarde }\n\n**Voorbeelden:**\n```\nconst student = {\n  naam: "Anna\",\n  leeftijd: 19,\n  klas: \"2A\",\n  cijfer: 8.5\n};\n```\n\n📌 **Toegang:** `student.naam` of `student["naam"]`\n\n💡 **Waar voor:** Groepen van gerelateerde info - perfect voor gegevens!',
          'if': '**if-statement** - Doe iets ALS...\n\nEen if-statement laat je code controleren: "Uitvoeren ALS deze voorwaarde waar is!"\n\n📝 **Basis:**\n```\nif (voorwaarde) {\n  dit wordt uitvoerd als waar\n}\n```\n\n**Voorbeeld:**\n```\nif (leeftijd >= 18) {\n  console.log("Je mag stemmen!");\n}\n```\n\n🔄 **Uitbreiden:**\n```\nif (score >= 8) {\n  console.log("Goed gedaan!");\n} else if (score >= 6) {\n  console.log("Volgende keer beter");\n} else {\n  console.log("Probeer opnieuw");\n}\n```\n\n🎯 **Vergelijkingsoperatoren:** >, <, >=, <=, ===, !==',
          'for': '**for-loop** - Herhaal X aantal keer\n\nEen for-loop voert code uit een vastgesteld aantal keer. Super handig!\n\n📝 **Basis:**\n```\nfor (let i = 0; i < 5; i++) {\n  console.log(i);\n}\n```\n\n🔄 **Dit drukt uit:** 0, 1, 2, 3, 4\n\n**Drie delen:**\n1. `let i = 0` - Start\n2. `i < 5` - Stop als dit false is\n3. `i++` - Verhoog met 1\n\n💡 **Met arrays:**\n```\nconst fruits = ["appel", "banaan"];\nfor (let i = 0; i < fruits.length; i++) {\n  console.log(fruits[i]);\n}\n```\n\n⚡ **Snelste loop-optie** in JavaScript!',
          'while': '**while-loop** - Herhaal tot voorwaarde onwaar\n\nEen while-loop herhaalt totdat iets NIET meer waar is.\n\n📝 **Syntax:**\n```\nwhile (voorwaarde) {\n  code uit hier\n}\n```\n\n**Voorbeeld:**\n```\nlet aantal = 0;\nwhile (aantal < 5) {\n  console.log(aantal);\n  aantal++;\n}\n```\n\n🔄 **Dit drukt uit:** 0, 1, 2, 3, 4\n\n⚠️ **Voorzichtig:** Infinite loops!\n```\nwhile (true) {\n  // Dit gaat NOOIT stoppen!\n}\n```\n\n💡 **Gebruik:** Als je NIET weet hoe vaak je gaat herhalen.',
          'function': '**Function** - Herbruikbare code\n\nEen function laat je code schrijven, opslaan, en meerdere keren gebruiken!\n\n📝 **Basis:**\n```\nfunction begroeting(naam) {\n  return "Hallo " + naam;\n}\n```\n\n🎯 **Aanroepen:** `begroeting("Anna")` → "Hallo Anna"\n\n**Parameters & Return:**\n- **Parameters:** Invoer → wat geef je mee? `(naam)`\n- **Return:** Uitvoer → wat krijg je terug?\n\n⚡ **Modern (Arrow):**\n```\nconst begroeting = (naam) => "Hallo " + naam;\n```\n\n💡 **Voordelen:** DRY (Don\'t Repeat Yourself), code is schoon en herbruikbaar!',
          'const': '**const** - Onveranderlijke variabele\n\nconst maakt iets vast - je kunt het NIET meer veranderen!\n\n📝 **Syntax:**\n```\nconst PI = 3.14159;\nPI = 3; // FOUT! ❌\n```\n\n🎯 **Verschil met let:**\n- **const:** Kan niet opnieuw toegewezen\n- **let:** Kan wel opnieuw toegewezen\n\n💡 **Goed voor:** Constanten die niet veranderen - PI, wachtwoorden, configuratie\n\n⭐ **Aanbeveling:** Gebruik const als standaard! Alleen let/var als je echt moet veranderen.',
          'let': '**let** - Veranderbare variabele (Modern)\n\nlet maakt iets dat JE WEL kunt veranderen. Beter dan var!\n\n📝 **Syntax:**\n```\nlet aantal = 5;\naantal = 10; // Dit mag! ✅\n```\n\n🎯 **Verschil met const:**\n- **let:** Kan veranderen\n- **const:** Kan NIET veranderen\n\n🎯 **Verschil met var:**\n- **let:** Modern, no-nonsense\n- **var:** Oud, rare hoisting bugs\n\n💡 **Gebruik:** Voor tellers, getallen die veranderen, status\n\n⭐ **Aanbeveling:** Gebruik let/const, NIET var!',
          '&&': '**&& (AND Operator)** - Beide moeten waar zijn\n\nALS beide voorwaarden waar zijn, DAN is het resultaat waar!\n\n📝 **Syntax:** `voorwaarde1 && voorwaarde2`\n\n**Voorbeeld:**\n```\nif (leeftijd >= 18 && heeftRijbewijs) {\n  mag_rijden();\n}\n```\n\n🎯 **Waarheid tabel:**\n- true && true = **true** ✅\n- true && false = **false** ❌\n- false && true = **false** ❌\n- false && false = **false** ❌\n\n⚡ **Kortsluiting:** Stopt zodra eerste false is (efficiënt!)\n\n💡 **Reëel voorbeeld:** "Is het weekend ÉN ben je vrij?" - beide moeten waar zijn!',
          '||': '**|| (OR Operator)** - Minstens één moet waar zijn\n\nALS MINSTENS ÉÉN voorwaarde waar is, DAN is het resultaat waar!\n\n📝 **Syntax:** `voorwaarde1 || voorwaarde2`\n\n**Voorbeeld:**\n```\nif (isWeekend || isVakantie) {\n  geen_school();\n}\n```\n\n🎯 **Waarheid tabel:**\n- true || true = **true** ✅\n- true || false = **true** ✅\n- false || true = **true** ✅\n- false || false = **false** ❌\n\n⚡ **Kortsluiting:** Stopt zodra eerste true is (efficiënt!)\n\n💡 **Fallback:** `const naam = input || "Anoniem";`',
          '===': '**=== (Strikt gelijk)** - Vergelijk PRECIES hetzelfde\n\n=== controleert: IS DE WAARDE EN TYPE HETZELFDE?\n\n📝 **Verschil met ==:**\n- **===** - Strikt (aanbevolen!)\n- **==** - Losse vergelijking (vermijd!)\n\n**Voorbeelden:**\n```\n5 === 5 → true ✅\n5 === "5" → false ❌ (getal vs tekst!)\n"test" === "test" → true ✅\ntrue === 1 → false ❌\n```\n\n💡 **In JavaScript:** ALTIJD === gebruiken, NOOIT ==\n\n⚠️ **Waarom?** == heeft rare gedrag met type conversie!',
          '!==': '**!== (Strikt niet gelijk)** - ANDERS?\n\n!== is het tegenovergestelde van ===. "Is dit NIET precies hetzelfde?"\n\n📝 **Gebruik:**\n```\nif (status !== "active") {\n  toon_foutmelding();\n}\n```\n\n**Voorbeelden:**\n```\n5 !== 5 → false (ze zijn hetzelfde)\n5 !== "5" → true (ander type!)\n"test" !== "test" → false (ze zijn hetzelfde)\n```\n\n💡 **Veel gebruikt:** Voor negatieve checks\n\n⭐ **Regel:** Altijd !== gebruiken, NOOIT !=',
          'async': '**async/await** - Wachten op langzame operaties\n\nasync/await laat je code op dingen wachten zonder alles vast te zetten!\n\n📝 **Syntax:**\n```\nasync function getData() {\n  const data = await fetch("https://...");\n  return data;\n}\n```\n\n💡 **Waar voor:** Bestanden inladen, APIs oproepen, databases - alles wat tijd kost\n\n🔄 **Hoe werkt:**\n1. `await` zegt: "Wacht hier op dit resultaat"\n2. Rest van programma gaat door\n3. Zodra klaar: doorgaan met volgende regel\n\n🛡️ **Fouten vangen:**\n```\ntry {\n  const data = await fetch(...);\n} catch (error) {\n  console.log("Oeps:", error);\n}\n```\n\n⚡ **Schoon:** Veel schoner dan Promises!',
          'await': '**await** - Wacht op resultaat\n\nawait betekent: "Wacht totdat dit klaar is voordat je doorgaat!"\n\n📝 **Alleen in async functies:**\n```\nasync function test() {\n  const result = await ietsDoensSlows();\n  console.log(result); // Wacht tot klaar\n}\n```\n\n💡 **Echt voorbeeld:** API oproepen\n```\nconst users = await fetch("https://api.example.com/users");\nconsole.log(users); // Wacht op data\n```\n\n⚠️ **Onthouden:** await ALLEEN in async functies!\n\n🎯 **Voordeel:** Code wacht, maar browser/app blijft responsief!',
          'push': '**push()** - Voeg toe aan einde van list\n\npush() voegt een nieuw item toe AAN HET EIND van je array!\n\n📝 **Syntax:** `array.push(nieuwItem)`\n\n**Voorbeeld:**\n```\nconst fruits = ["appel", "banaan"];\nfruits.push("kers");\nconsole.log(fruits); \n// ["appel", "banaan", "kers"]\n```\n\n⚠️ **Verandert original:** De originele array wordt gewijzigd!\n\n💡 **Meerdere tegelijk:**\n```\nfruits.push("druif", "framboos");\n```\n\n🔄 **Tegenovergestelde:** `.pop()` (haalt eraf)',
          'pop': '**pop()** - Verwijder van einde van list\n\npop() haalt het LAATSTE item AF en geeft het terug!\n\n📝 **Syntax:** `array.pop()`\n\n**Voorbeeld:**\n```\nconst fruits = ["appel", "banaan", "kers"];\nconst laatse = fruits.pop();\nconsole.log(laatse); // "kers"\nconsole.log(fruits); // ["appel", "banaan"]\n```\n\n⚠️ **Leeg array:** Retourneert undefined\n\n💡 **Stack-achtig:** Zie het als een stapel - je haalt van boven af!\n\n🔄 **Tegenovergestelde:** `.push()` (voegt toe)',
          'map': '**map()** - Wijzig elk item\n\nmap() maakt een NIEUWE array waar elk item is aangepast!\n\n📝 **Syntax:** `array.map(item => doIetsMetItem(item))`\n\n**Voorbeelden:**\n```\nconst nummers = [1, 2, 3];\nconst verdubbeld = nummers.map(n => n * 2);\n// [2, 4, 6]\n\nconst woorden = ["hallo", "wereld"];\nconst hoofdletters = woorden.map(w => w.toUpperCase());\n// ["HALLO", "WERELD"]\n```\n\n✅ **Origineel blijft intact:** Je krijgt een NIEUWE array!\n\n🎯 **Zeer modern:** Veel schoner dan for-loops!',
          'filter': '**filter()** - Selecteer bepaalde items\n\nfilter() maakt een NIEUWE array met ALLEEN items die voldoen!\n\n📝 **Syntax:** `array.filter(item => voorwaarde)`\n\n**Voorbeelden:**\n```\nconst nummers = [1, 5, 8, 3, 10];\nconst groot = nummers.filter(n => n > 5);\n// [8, 10]\n\nconst woorden = ["test", "hallo", "ja"];\nconst lang = woorden.filter(w => w.length > 3);\n// ["test", "hallo"]\n```\n\n✅ **Origineel blijft intact:** Nieuwe array!\n\n💡 **Veel gebruikt:** Voor zoeken, sorteren, selectie!',
          'forEach': '**forEach()** - Loop door alles\n\nforEach() voert dezelfde code uit voor ELK item in je array!\n\n📝 **Syntax:** `array.forEach(item => console.log(item))`\n\n**Voorbeeld:**\n```\nconst fruits = ["appel", "banaan", "kers"];\nfruits.forEach(fruit => {\n  console.log(fruit);\n});\n// appel, banaan, kers\n```\n\n🔄 **Met index:**\n```\nfruits.forEach((fruit, index) => {\n  console.log(index, fruit);\n});\n// 0 appel, 1 banaan, 2 kers\n```\n\n💡 **Verschil met map:** forEach geeft niets terug!\n\n⚠️ **Kan niet breken:** Geen break/return mogelijkheid - gebruik for-loop daarvoor!',
        };
        
        // Check if it's a keyword or concept
        const lowerText = text.toLowerCase().trim();
        let explanation = fallbackExplanations[lowerText];
        
        if (!explanation) {
          // Generic explanation if not found
          explanation = `**"${text}"** is een belangrijk concept in programmeren. Dit is gerelateerd aan:\n\n- Controleer de syntax\n- Bekijk voorbeelden online\n- Test het uit in je editor`;
        }
        
        res.writeHead(200);
        res.end(JSON.stringify({ 
          explanation: explanation,
          message: explanation,
          success: true 
        }));
      } catch (error) {
        console.error('Error in explain endpoint:', error);
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Failed to generate explanation' }));
      }
    });
    return;
  }

  // 404 for unknown routes
  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => {
  console.log(`Prompt server running on http://localhost:${PORT}`);
  console.log(`Available endpoints:`);
  console.log(`  GET /api/health - Health check`);
  console.log(`  GET /api/prompts - Get all prompts`);
  console.log(`  GET /api/prompts/:type - Get specific prompt type`);
  console.log(`  GET /api/adaptive-prompts/:yearLevel - Get adaptive prompts for year level`);
  console.log(`  GET /api/assignments - List all assignments`);
  console.log(`  GET /api/assignments/:id - Get specific assignment content`);
  console.log(`  GET /api/slides - Get all slideshow slides`);
  console.log(`  POST /api/slides - Add new slide to slideshow`);
  console.log(`  DELETE /api/slides/:id - Delete specific slide`);
  console.log(`  POST /api/explain - Generate explanation for highlighted text`);
  console.log(`  GET /api/progress - Get student progress`);
  console.log(`  GET /api/history - Get history and streak data`);
  console.log(`  GET /api/teacher/dashboard - Get teacher analytics`);
  console.log(`  GET /events - Server-Sent Events stream for live updates`);
});

server.on('error', (error) => {
  console.error('Server error:', error);
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Trying another approach...`);
  }
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception in prompt server:', error);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down prompt server...');
  server.close(() => {
    console.log('Server stopped');
    process.exit(0);
  });
});
