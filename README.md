# Code Tutor - AI-Powered Coding Education Platform

Code Tutor is a comprehensive VS Code extension that transforms your editor into an intelligent learning environment. It combines AI-powered tutoring with interactive exercises, progress tracking, and collaborative features to create a complete coding education experience.

## 🚀 Core Features

### AI-Powered Learning
- **Interactive Chat Tutor** - Get personalized help with the `@tutor` participant
- **Code Explanation** - Understand complex code snippets with clear, contextual explanations
- **Debugging Assistance** - Get step-by-step guidance to identify and fix bugs
- **Code Review & Refactoring** - Receive actionable suggestions to improve code quality
- **Concept Teaching** - Learn programming fundamentals with interactive explanations

### Educational Tools
- **Adaptive Exercises** - Practice with coding exercises that adjust to your skill level (1-4 year levels)
- **Interactive Quizzes** - Test your knowledge with programming concept quizzes
- **Assignment System** - Complete structured assignments with automatic feedback
- **Learning Slideshow** - Save and organize code snippets as educational slides
- **Progress Tracking** - Monitor your learning journey with detailed analytics

### Dashboard & Analytics
- **Visual Progress Dashboard** - Interactive web dashboard with charts and heatmaps
- **Achievement System** - Unlock badges and track milestones
- **Activity Tracking** - View coding sessions, exercises completed, and learning streaks
- **Student/Teacher Modes** - Switch between learning and teaching perspectives

### Collaboration & Community
- **Discord Bot Integration** - Share progress and compete with study groups
- **Code Jam Events** - Participate in coding challenges and competitions
- **Leaderboards** - Compare progress with peers and celebrate achievements

## 📦 Installation

Install Code Tutor from the VS Code Extensions Marketplace:

1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X)
3. Search for "Code Tutor"
4. Click Install

**Optional:** Set up the Discord bot for community features:
- Follow the [Discord Bot Setup Guide](./discord-bot/README.md)

## 🎯 Quick Start

### Basic Usage
1. Open the Chat view in VS Code (Ctrl+Shift+I)
2. Select the **@tutor** participant
3. Set your learning level: `@tutor /setlevel 2` (1-4 scale)
4. Start learning: `@tutor /help` to see all commands

### Essential Commands
- `@tutor /explain` - Explain selected code or concepts
- `@tutor /debug` - Get debugging help for your code
- `@tutor /exercise` - Get coding exercises tailored to your level
- `@tutor /quiz` - Take programming knowledge quizzes
- `@tutor /review` - Get comprehensive code review feedback
- `@tutor /concept [topic]` - Learn programming concepts interactively
- `@tutor /dashboard` - Open your visual progress dashboard
- `@tutor /progress` - View your learning statistics
- `@tutor /assignment-feedback` - Check assignment progress and feedback

### Advanced Features
- `@tutor /save-slide` - Save selected code as educational slide
- `@tutor /add-slide` - Add selected code to learning slideshow (Ctrl+Shift+S)
- `@tutor /resources` - Browse curated learning materials
- `@tutor /feedback` - Get progressive feedback with examples

## ⚙️ Configuration

### VS Code Commands
- **Code Tutor: Open Dashboard** - Launch the visual progress dashboard
- **Code Tutor: Add Selected Code to Slideshow** - Save code snippets for teaching
- **Code Tutor: Hello World** - Test the extension

### Settings
Configure Code Tutor through VS Code settings (`Ctrl+,`):

- `codeTutor.apiKey` - Your Claude API key for AI features
- `codeTutor.enableTracking` - Enable/disable progress tracking (default: true)

### API Key Setup
1. Get a Claude API key from Anthropic
2. Open VS Code Settings (Ctrl+,)
3. Search for "Code Tutor"
4. Enter your API key in the `codeTutor.apiKey` field

## 🏗️ Project Structure

```
code-tutor/
├── src/                     # Extension source code
│   ├── extension.ts         # Main extension logic
│   ├── utils.ts            # Utility functions
│   └── test/               # Unit tests
├── dashboard/              # Progress dashboard
│   ├── index.html          # Interactive web dashboard
│   └── styles.css          # Dashboard styling
├── discord-bot/            # Discord integration
│   ├── bot.js              # Discord bot implementation
│   ├── setup.js            # Bot setup utilities
│   └── README.md           # Discord bot documentation
├── assignments/            # Educational assignments
│   ├── *.md                # Assignment files with metadata
│   └── feedback/           # Assignment feedback system
├── .claude/skills/         # AI tutor specialized skills
│   ├── concept-teaching/   # Concept explanation skills
│   ├── code-review/        # Code review capabilities
│   ├── debugging-guidance/ # Debugging assistance
│   └── exercise-coaching/  # Exercise generation
└── package.json           # Extension configuration
```

## 🚧 Requirements

- **VS Code**: Version 1.106.1 or later
- **API Key**: Claude API key for AI features (required)
- **Node.js**: For Discord bot features (optional)
- **Internet Connection**: Required for AI features and dashboard

## 🏆 Educational Capabilities

### Skill Levels
Code Tutor adapts to 4 different skill levels:
- **Level 1**: Beginners learning programming basics
- **Level 2**: Students with basic programming knowledge
- **Level 3**: Intermediate programmers learning advanced concepts  
- **Level 4**: Advanced students preparing for professional development

### Supported Topics
- Object-Oriented Programming (Classes, Inheritance, Polymorphism)
- Data Structures and Algorithms
- Git and Version Control
- State Machines and Design Patterns
- Web Development (HTML, CSS, JavaScript)
- Python Programming
- C# Programming
- Debugging Techniques
- Code Quality and Refactoring

## 🔧 Development

### Project Constitution
This project follows the **Code Tutor Constitution** (`.specify/memory/constitution.md`), which defines our core development principles:

1. **Modular Architecture** - Code organized into focused, single-responsibility modules
2. **Type Safety First** - Strict TypeScript with comprehensive type coverage
3. **Test-Driven Refactoring** - All changes backed by comprehensive tests (80%+ coverage)
4. **Educational Quality** - Code serves as teaching material and must be exemplary
5. **Progressive Complexity** - Dependencies managed for learner comprehension

All contributions must adhere to these principles. See the [Constitution](.specify/memory/constitution.md) for detailed guidance.

### Building the Extension
```bash
npm install
npm run compile
npm run watch  # For development
```

### Running Tests
```bash
npm test
```

### Discord Bot Setup
See [Discord Bot Documentation](./discord-bot/README.md) for detailed setup instructions.

## ⚠️ Known Issues & Troubleshooting

### Common Issues
- **API Key Required**: AI features require a valid Claude API key in settings
- **Discord Bot**: Requires separate configuration (see Discord bot documentation)
- **Internet Connection**: Required for AI features and progress dashboard
- **Model Selection**: If chat model is "Auto" and no models available, manually select a model in chat UI

### Performance Notes
- Large codebases may take longer to analyze
- Dashboard data syncs every few minutes
- Some features cache results for better performance

## 📝 Release Notes

### Version 0.0.1 (Current)

**🎉 Initial Release Features:**
- ✅ Interactive AI coding tutor with 18+ specialized commands
- ✅ Adaptive learning system with 4 skill levels
- ✅ Visual progress dashboard with charts and analytics
- ✅ Assignment system with automatic feedback
- ✅ Discord bot integration for community learning
- ✅ Achievement and badge system
- ✅ Code slideshow creation for teaching
- ✅ Specialized AI skills (debugging, code review, concept teaching)
- ✅ Multi-language support (Python, C#, JavaScript, and more)

**🔮 Planned Features:**
- Learning path recommendations
- Collaborative coding sessions
- Advanced analytics and insights
- More assignment types and topics
- Integration with popular learning platforms

## 🤝 Contributing

We welcome contributions! Whether you're:
- 🐛 Reporting bugs
- 💡 Suggesting new features  
- 📚 Improving documentation
- 💻 Contributing code

Please check our contribution guidelines and open an issue or pull request.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🔗 Links

- [VS Code Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)
- [Discord Bot Setup Guide](./discord-bot/README.md)
- [Assignment Quick Start](./ASSIGNMENTS_QUICK_START.md)
- [Assignment Setup Guide](./ASSIGNMENTS_SETUP.md)

---

**Happy Learning! 🎓**

*Code Tutor - Making programming education accessible, interactive, and fun.*
