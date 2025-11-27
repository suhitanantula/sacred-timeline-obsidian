# Sacred Timeline for Obsidian

**Git for humans** - Version control for your vault with human-friendly language.

## What is this?

Sacred Timeline brings git version control to Obsidian using language that makes sense to non-coders:

| What you mean | Sacred Timeline |
|---------------|-----------------|
| Save this moment | **Capture** |
| Get latest from cloud | **Update** |
| Send to cloud | **Backup** |
| What did I change? | **Changes** |
| Show me history | **Timeline** |
| Summarize my progress | **Narrate** |
| Try something risky | **Experiment** |
| Keep the experiment | **Keep** |
| Abandon experiment | **Discard** |

## Features

### Sidebar View
- One-click Capture, Update, Backup
- See your changes at a glance
- Browse recent timeline
- Start experiments safely

### Commands
All features available via Command Palette (Cmd/Ctrl+P):
- "Sacred Timeline: Capture"
- "Sacred Timeline: Update"
- "Sacred Timeline: Backup"
- "Sacred Timeline: Narrate"
- etc.

### Status Bar
Shows current state at a glance:
- `📸 ✓` - All synced
- `📸 3△` - 3 uncommitted changes
- `📸 🧪experiment ↑2` - On experiment branch, 2 to backup

### Auto Backup
Optionally enable automatic capture and backup every X minutes.

## Installation

### From Obsidian Community Plugins (coming soon)
1. Open Settings → Community plugins
2. Search for "Sacred Timeline"
3. Install and enable

### Manual Installation
1. Download the latest release
2. Extract to your vault's `.obsidian/plugins/sacred-timeline/` folder
3. Enable in Settings → Community plugins

## Requirements

- Your vault must be a git repository
- Git must be installed on your system

## Quick Start

1. If your vault isn't a git repo yet, use "Sacred Timeline: Start" command
2. Make some changes to your notes
3. Click "Capture" in the sidebar and describe what you did
4. Click "Backup" to send to GitHub/cloud
5. Use "Narrate" to see a summary of your recent work

## Philosophy

Git is **innovation architecture**, not just version control:

- **Capture** = "I tried something and here's what I learned"
- **Experiment** = "Starting a safe space to try something risky"
- **Backup** = "Sharing my learning with the cloud"
- **Timeline** = "The sacred history of my work"

The Marvel analogy: Your main branch is the Sacred Timeline. Experiments are variant timelines. You can explore variants without breaking the sacred timeline, and merge the successful ones back.

## Related

- [Sacred Timeline VS Code Extension](https://github.com/suhitanantula/sacred-timeline)
- [Sacred Timeline CLI](https://github.com/suhitanantula/sacred-timeline)

## Credits

Built by [Suhit Anantula](https://github.com/suhitanantula)

## License

MIT
