# Quantum Repair Lab

> The message is broken. Don't look inside. Find out why.

A browser game about **error syndromes and parity probes**. You play a repair technician
keeping a fragile quantum message alive. You can't open the carriers to look: reading them
destroys the message. So you wire helper qubits to them, ask indirect questions
("do these two agree?"), read the answers as a fingerprint, and repair what you never see.

There's no lecture and no quiz. Each idea shows up first as something you do, then the
game names it.

## Run it

```bash
npm install
npm run dev          # http://localhost:5173
```

Production build:

```bash
npm run build        # outputs static files to dist/
npm run preview      # serves dist/ locally
```

No backend, no accounts, no network calls during play. Fonts are bundled, so after the first
load the game runs offline.

### Deploy

`dist/` is a plain static site built with a relative base (`base: './'`), so the same build
works anywhere:

- **Vercel / Netlify**: import the repo. Build command `npm run build`, output directory `dist`.
- **GitHub Pages**: push `dist/` to a `gh-pages` branch, or use any Pages action that uploads
  `dist/`. Sub-path hosting works without config changes.

### Jumping to any mission

Missions unlock in order. To open any of them directly (for reviewing or judging), go to
**Settings → Unlock all missions**, then open the mission map.

## The missions

| #  | Mission              | What you do                                                        | Idea you leave with                              |
|----|----------------------|--------------------------------------------------------------------|--------------------------------------------------|
| 00 | Incoming             | Try to match a qubit's direction with an ordinary bit; send it     | A qubit holds a direction, not just 0/1          |
| 01 | Something Broke      | Undo noise with FLIP; then READ an unknown message                 | X errors; measurement collapses the state        |
| 02 | Why Not Copy It?     | Fix a classical triple; then try a copier on the quantum message   | No-cloning; the "failed copy" is entanglement    |
| 03 | The Triple Shield    | Zap the 3-qubit shield, watch the threads, repair                  | The bit-flip code; errors as the odd one out     |
| 04 | The Helper           | Wire an ancilla to one carrier (collapse!), then to two (safe)     | Ancillas; why a probe must touch a pair          |
| 05 | Same or Different    | Toggle test bits, predict, fill an experiment log                  | Parity                                           |
| 06 | The Fingerprint      | Hit each carrier, map the two probe readings, then tag mystery hits | Syndromes                                        |
| 07 | Repair               | Live signals: probe → diagnose → fix → transmit (incl. a clean one) | Correction, and when to do nothing               |
| 08 | No Looking Allowed   | Wire your own probes; a tempting READ button is a trap             | Non-destructive measurement                      |
| 09 | The Other Noise      | Probes say "clean", the letter changes anyway; build a phase shield | Z errors, the Hadamard lens, one code ≠ all errors |
| 10 | Master Repair        | Nine qubits, unknown error type and location, limited probe charges | Shor's code: bit probes in blocks, phase probes across |
| 11 | The Noise Storm      | Real-time pulses; keep integrity up; get fooled by a double hit    | Correct faster than errors arrive                |
| ∞  | Endless Repair       | Random signals on bit, phase or nine-qubit shields; build a streak | Apply it without a script                        |

Each mission recovers one letter of the source's final transmission.

## The physics, and what is simplified

The game runs a real state-vector simulation (`src/game/quantum/statevector.ts`). Nothing
on screen is scripted to "look quantum". Probes are CNOTs into an ancilla, and the
collapse you see is the simulator measuring.

- **Gates used:** X, Z, H, CNOT. All have real matrix entries, so the simulator uses real
  amplitudes. That's exact, not an approximation, because every message starts as
  `cos(φ/2)|0⟩ + sin(φ/2)|1⟩`.
- **The dial** shows the message as a direction in the x–z plane of the Bloch sphere: top = |0⟩,
  bottom = |1⟩, right = |+⟩, left = |−⟩. An X error mirrors it top↔bottom and a Z error mirrors
  it left↔right, so the two error types change the letter in different ways. *Simplification:*
  real qubits live on a sphere; the lab uses one circular slice of it, and the game says so.
- **Threads** (the simulator view) are the non-zero basis components of the state, with their
  weights and relative signs. The game says plainly that real hardware cannot show this view,
  and turns it off for every "real conditions" mission.
- **Parity probes:** a bit probe is CNOTs from the targets into a fresh ancilla, then a
  measurement of the ancilla. A phase probe is the same thing wrapped in Hadamards. Wire a
  helper to one carrier, or to all three, and the simulator collapses the message. The game
  doesn't apply that as a rule; it falls out of the maths.
- **Codes:** three-qubit bit-flip code, three-qubit phase-flip code, and Shor's nine-qubit code.
  The game shows directly that each three-qubit code is blind to the other error type, and that
  two bit-flips fool the bit-flip code. It never claims the three-qubit code fixes every error.
- **Receiver check:** a delivery succeeds when the state projects fully onto the code space and
  decodes to the sent letter. Leftover damage reads as "unreadable".

Physics checks used during development, all passing: syndromes for every single X error,
Z errors invisible to bit probes, collapse for one- and three-target probes, the phase code,
and Shor's code correcting X, Z and XZ on all nine qubits.

## Controls and accessibility

- Pick a tool, then click a carrier. Every control also has a keyboard shortcut (shown on the
  button). Number keys 1–3 apply the current tool to Q1–Q3, and Esc puts the tool down.
- Carriers, probe sockets and helpers are focusable SVG buttons with labels and visible focus
  rings.
- Colour is never the only signal: probe results always read SAME / DIFFERENT, errors are
  outlined *and* labelled, and every sound has a visual counterpart.
- **Settings:** sound on/off, motion (follow system / reduced / full), relaxed storm timing,
  unlock all missions, reset progress.
- Hints come in three tiers per step and never cost rating. Failures give a debrief and a
  rewind, never a game over.

## Architecture

```text
src/
├── game/                 pure logic, no React
│   ├── quantum/          state-vector simulator, codes, cipher-ring readout
│   ├── engine/           lab model (probes, noise, corrections), diagnosis, Shor helpers
│   ├── progression/      ranks, saved progress (localStorage)
│   └── scoring/          mission rating
├── data/                 mission scripts, concept cards, probe layouts
├── hooks/                useLab (physics + animation timing), useMission (steps, hints, cards)
├── components/           boards (3- and 9-qubit), dial, panels, HUD, overlays
├── scenes/               one file per mission, plus endless mode
└── screens/              title, mission map, finale
```

Stack: React 19, TypeScript, Vite, Tailwind CSS 4, Framer Motion, Lucide icons.
