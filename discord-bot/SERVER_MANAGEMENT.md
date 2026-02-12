# Discord Bot - Server Management Commands

## New Features Added

The Discord bot now includes powerful server management commands for creating channels, voice chats, and roles without needing to do it manually in Discord!

---

## Channel Management

### `/createchannel` - Create Text Channel
Creates a new text channel in your server.

**Usage:**
```
/createchannel naam:python-help beschrijving:Get help with Python categorie:learning
```

**Options:**
- `naam` (required) - Channel name (automatically converted to lowercase with dashes)
- `beschrijving` (optional) - Channel topic/description
- `categorie` (optional) - Category label

**Example:**
```
/createchannel naam:project-showcase beschrijving:Show your code projects!
```

**Requirements:** Manage Channels permission

---

## Voice Channel Management

### `/createvoice` - Create Voice Channel
Creates a new voice channel where people can talk.

**Usage:**
```
/createvoice naam:"Study Group 1" userlimit:5 categorie:study
```

**Options:**
- `naam` (required) - Voice channel name
- `userlimit` (optional) - Max users (0 = unlimited, default: 0)
- `categorie` (optional) - Category label

**Example:**
```
/createvoice naam:"JavaScript Study" userlimit:8
```

**Requirements:** Manage Channels permission

---

## Role Management

### `/createrole` - Create New Role
Creates a custom role with custom color.

**Usage:**
```
/createrole naam:Python kleur:#3776AB hoistable:true
```

**Options:**
- `naam` (required) - Role name
- `kleur` (optional) - Hex color (e.g., #FF5733, default: blue)
- `hoistable` (optional) - Show separately in member list (true/false)

**Example:**
```
/createrole naam:Moderator kleur:#FF0000 hoistable:true
```

**Color Examples:**
- Python: `#3776AB` (blue)
- JavaScript: `#F7DF1E` (yellow)
- Java: `#007396` (blue)
- Rust: `#CE3262` (red)

**Requirements:** Manage Roles permission

---

### `/assignrole` - Give User a Role
Assigns a role to a user.

**Usage:**
```
/assignrole user:@username role:@Python
```

**Options:**
- `user` (required) - The user to give the role
- `role` (required) - The role to assign

**Example:**
```
/assignrole user:@John role:@JavaScript-Expert
```

**Requirements:** Manage Roles permission

---

### `/removerole` - Remove Role from User
Removes a role from a user.

**Usage:**
```
/removerole user:@username role:@Python
```

**Options:**
- `user` (required) - User to remove role from
- `role` (required) - Role to remove

**Example:**
```
/removerole user:@Jane role:@Moderator
```

**Requirements:** Manage Roles permission

---

## Auto-Setup Commands

### `/setuproles` - Create Programming Language Roles
Automatically creates roles for popular programming languages with their official colors!

**Roles Created:**
- 🐍 Python (`#3776AB`)
- 🟨 JavaScript (`#F7DF1E`)
- ☕ Java (`#007396`)
- ➕ C++ (`#00599C`)
- # C# (`#239120`)
- 🐹 Go (`#00ADD8`)
- 🦀 Rust (`#CE3262`)
- 🔵 TypeScript (`#2B7489`)

**Usage:**
```
/setuproles
```

**Requirements:** Manage Roles permission

**Note:** Existing roles won't be duplicated

---

### `/setupchannels` - Create Learning Channels
Automatically creates a complete channel structure for learning!

**Channels Created:**
- 📝 `general` - General discussion
- 📢 `announcements` - Important updates
- 📚 `learning-resources` - Tutorials & materials
- 🎨 `project-showcase` - Share your projects
- ❓ `study-help` - Ask for help
- 🎤 `voice-general` - General voice chat
- 🎤 `voice-study` - Study group voice

**Usage:**
```
/setupchannels
```

**Requirements:** Manage Channels permission

**Note:** Existing channels won't be duplicated

---

## Permission Requirements

| Command | Required Permission |
|---------|-------------------|
| `/createchannel` | Manage Channels |
| `/createvoice` | Manage Channels |
| `/createrole` | Manage Roles |
| `/assignrole` | Manage Roles |
| `/removerole` | Manage Roles |
| `/setuproles` | Manage Roles |
| `/setupchannels` | Manage Channels |

**Note:** Your Discord account needs these permissions to use these commands!

---

## Quick Server Setup Guide

To quickly setup a complete learning server:

1. **Setup roles:**
   ```
   /setuproles
   ```

2. **Setup channels:**
   ```
   /setupchannels
   ```

3. **Assign roles to members:**
   ```
   /assignrole user:@member role:@Python
   ```

That's it! Your server is now ready for Code Tutor learning! 🎉

---

## Error Messages & Solutions

### "Je hebt geen toestemming..."
You don't have the required permission. Ask a server admin to:
1. Give you the "Manage Channels" or "Manage Roles" role
2. Or make the bot have the permission

### "Channel/Role bestaat al"
The channel or role already exists - the setup command will skip it and create the others

### "Ongeldige kleur"
Use valid hex color format: `#RRGGBB` (example: `#FF5733`)

### "Kon channel/rol niet aanmaken"
The bot might not have permission. Check:
1. Bot has "Manage Channels" or "Manage Roles" role
2. Bot's role is high enough in the role list
3. Channel/role name isn't reserved or invalid

---

## Tips

💡 **Use `/setuproles` and `/setupchannels`** for quick server setup
💡 **Name channels with dashes:** `python-learning`, `javascript-help`
💡 **Use colors** to make roles visually distinct
💡 **Hoist important roles** so they appear separately in member list
💡 **Set voice channel limits** to keep groups focused

---

## Examples

### Setup a Python Learning Server
```
/setuproles                                    # Create language roles
/setupchannels                                 # Create learning channels
/assignrole user:@student1 role:@Python       # Assign Python role
```

### Create a Study Group
```
/createchannel naam:algorithms-study beschrijving:Studying algorithms together
/createvoice naam:"Algorithm Study Session" userlimit:6
```

### Create a Moderator Role
```
/createrole naam:Moderator kleur:#FF6B6B hoistable:true
/assignrole user:@moderator role:@Moderator
```

---

## Support

If commands don't work:
1. Check you have the required permission
2. Verify the bot has "Manage Channels" and "Manage Roles" permissions
3. Make sure the bot's role is high enough in the role hierarchy
4. Try again with simpler parameters
