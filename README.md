# Sacred Timeline for Obsidian

**Git for humans: Innovation architecture for the AI age**

> *"Your world may seem singular to you, but really, it's a teeny, tiny, weenie speck on a vast cosmic canvas. In reality, the only universe considered the true universe exists on the Sacred Timeline, and it is guarded zealously by all of us here at the TVA."*
>
> —Mr. Paradox to Deadpool

---

## The Idea

In Marvel's Loki, the **Sacred Timeline** is the main reality—protected and preserved. **Branch timelines** are alternate realities where you can explore different choices safely. The **TVA** manages it all.

Git works the same way. Your main branch is your Sacred Timeline. Feature branches are alternate realities for experimentation. Git is your TVA.

**Sacred Timeline brings this power to your Obsidian vault.**

| Marvel Concept | Git Concept | What It Means |
|----------------|-------------|---------------|
| Sacred Timeline | main branch | Your working, proven vault |
| Branch Timeline | feature branch | Safe space to experiment |
| TVA | Git system | Manages all your timelines |
| Nexus Event | commit | A captured decision point |
| Timeline Merge | git merge | Bring successful experiments back |
| Pruning | branch delete | Remove failed experiments |

**The superpower:** Try bold ideas without fear. If the experiment fails, your Sacred Timeline is untouched. If it succeeds, merge it in.

---

## The Language

| What you mean | Sacred Timeline | What Git calls it |
|---------------|-----------------|-------------------|
| Save this moment | `capture` | git commit |
| Summarize my progress | `narrate` | git log (analyzed) |
| Get latest from cloud | `latest` | git pull |
| Send to cloud | `backup` | git push |
| What did I change? | `changes` | git diff/status |
| Show me history | `timeline` | git log |
| Try something risky | `experiment` | git branch |
| Keep the experiment | `keep` | git merge |
| Abandon experiment | `discard` | git branch -d |

---

## Features

### Sidebar View
- One-click Capture, Latest, Backup
- See your changes at a glance
- Browse recent timeline
- Start experiments safely

### Commands
All features available via Command Palette (Cmd/Ctrl+P):
- "Sacred Timeline: Capture"
- "Sacred Timeline: Latest"
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

---

## Installation

### From Obsidian Community Plugins (coming soon)
1. Open Settings → Community plugins
2. Search for "Sacred Timeline"
3. Install and enable

### Manual Installation
1. Download the latest release
2. Extract to your vault's `.obsidian/plugins/sacred-timeline/` folder
3. Enable in Settings → Community plugins

---

## Requirements

- Your vault must be a git repository
- Git must be installed on your system

---

## Quick Start

1. If your vault isn't a git repo yet, use "Sacred Timeline: Start" command
2. Make some changes to your notes
3. Click "Capture" in the sidebar and describe what you did
4. Click "Backup" to send to GitHub/cloud
5. Use "Narrate" to see a summary of your recent work

---

## Philosophy

Git is **innovation architecture**, not just version control:

- **Capture** = "I tried something and here's what I learned"
- **Backup** = "Sharing my learning into the collective universe"
- **Latest** = "Bringing the latest collective thinking into my work"
- **Experiment** = "Starting a safe space to try something risky"
- **Keep** = "This experiment succeeded, make it the new normal"

---

## Related

- [Sacred Timeline CLI + VS Code](https://github.com/suhitanantula/sacred-timeline) - Terminal and VS Code version

---

## Credits

Built by [Suhit Anantula](https://suhitanantula.com) as part of the Co-Intelligent Organisation project.

## License

MIT
