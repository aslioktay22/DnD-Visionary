# D&D: Visionary

A web-based campaign manager for Dungeons & Dragons. Players can create and manage their characters, roll dice live with their party, browse spells, and play on shared real-time battlemaps.

> 🚧 **Status:** In early development

---

## Features

- **Character management**: create, edit, and save your own characters (stats, class, level, inventory, spells)
- **Campaigns**: start a campaign as the DM and invite players to join
- **Live dice roller**: rolls show up instantly for everyone in the campaign
- **Real-time battlemaps**: move tokens on a shared map that updates for every player
- **Spell database**: search and filter D&D 5e spells, powered by the [D&D 5e API](https://www.dnd5eapi.co/)

## Tech Stack

| Layer      | Tools                          |
| ---------- | ------------------------------ |
| Front end  | HTML, CSS, JavaScript          |
| Back end   | Node.js, Express               |
| Database   | SQL                            |
| Real-time  | WebSockets                     |
| External   | [D&D 5e API](https://www.dnd5eapi.co/) (SRD content) |

## Project Structure (Potential)

```
DnD-Visionary/
├── client/     # Front end: pages, styles, scripts
├── server/     # Back end: API, database, WebSockets
│   └── db/     # SQL scripts and sample data
└── docs/       # SRS, API contract, diagrams
```

## Getting Started

### Prerequisites

- [Git](https://git-scm.com/)
- [Node.js](https://nodejs.org/) (LTS version)
- A code editor, such as [VS Code](https://code.visualstudio.com/)

### Installation

```bash
# 1. Clone the repo
git clone https://github.com/aslioktay22/DnD-Visionary.git
cd DnD-Visionary

# 2. Install back-end dependencies
cd server
npm install

# 3. Start the server
npm start
```

Then open `http://localhost:3000` in your browser.

> These steps will be updated as the project takes shape.

## Team

| Name | Role |
| ---- | ---- |
| Asli Oktay | Project Lead · Front End (UI, styling) |
| Erin Gullickson | Front End (layout, login, navigation, styling) |
| Nikolai Jalowiec | Back End (API & endpoints) |
| Ava Edwards | Back End (database design) |
| Jacob Roberts | Back End (real-time features) |

## Acknowledgments

Spell and rules data comes from the [D&D 5e API](https://www.dnd5eapi.co/), which uses content from the 5th Edition System Reference Document (SRD).

Dungeons & Dragons is a trademark of Wizards of the Coast. This is an unofficial student project and is not affiliated with Wizards of the Coast.
