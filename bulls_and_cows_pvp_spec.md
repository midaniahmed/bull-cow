# Online Bulls & Cows PvP Game — Product & Technical Specification

## Overview

Create a modern online multiplayer game inspired by Bulls & Cows.

The game is room-based:
- Any player can create a room
- A unique room code/secret key is generated
- Another player joins using the room code
- Both players secretly choose a number
- Players take turns guessing each other’s number
- The first player to guess the opponent’s number wins

The game must support configurable room settings fully controlled by the room creator.

---

# Core Gameplay

## Rules

Each player chooses a secret number.

Default rules:
- 4 digits
- Digits must be unique
- First digit cannot be 0

Players then attempt to guess the opponent’s number.

After each guess:
- Bull = correct digit in correct position
- Cow = correct digit in wrong position

Example:
Secret: 5271
Guess: 5712

Result:
- 1 Bull
- 3 Cows

The first player to get all Bulls wins.

---

# Multiplayer System

## Room System

Players can:
- Create room
- Join room
- Leave room
- Reconnect to room
- Share room code

Room code should be:
- Short
- Human readable
- Unique

Example:
- A7KD92
- BULL123

---

# Room Settings (Fully Configurable)

## Number Settings
- Number length (3–10)
- Allow duplicate digits (true/false)
- Allow leading zero (true/false)

## Match Settings
- Turn system: alternating / simultaneous
- First turn: RPS / random / creator / joiner
- Time limit: 10s / 20s / 30s / 60s / none
- Win condition: first correct / best of X

## Advanced Settings
- Fog mode
- Hardcore mode
- Hint system
- Ranked mode

---

# Game Flow

1. Create room
2. Join room
3. Both players ready
4. Set secret numbers
5. Start match
6. Play turns
7. End match

---

# Realtime Events

- room_created
- room_joined
- player_ready
- match_started
- guess_submitted
- result_calculated
- turn_changed
- match_ended

---

# Tech Stack

Frontend:
- React
- TypeScript
- Vite

Backend:
- Node.js
- Express
- Socket.IO

Database:
- PostgreSQL

---

# Anti Cheat

- Server is authoritative
- No secret exposure
- All validation server-side
- Turn enforcement
- Anti replay / duplicate prevention

---

# Deliverables

- Full architecture
- WebSocket design
- State management
- Room lifecycle
- Match engine
- Database schema
- Deployment plan
