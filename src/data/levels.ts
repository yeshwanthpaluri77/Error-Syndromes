import type { LevelDef } from '../types/game';

/**
 * Mission scripts. Scenes (src/scenes) drive the step logic; this file holds
 * every player-facing line so the teaching text can be read and tuned in one place.
 * The twelve letters spell the final transmission: STAY COHERENT.
 */
export const FINAL_PHRASE = 'STAYCOHERENT';
export const FINAL_PHRASE_DISPLAY = 'STAY COHERENT';

export const LEVELS: LevelDef[] = [
  {
    id: 0,
    code: '00',
    title: 'Incoming',
    teaser: 'A message arrives. It is not a 0 or a 1.',
    idea: 'Qubits',
    letter: 'S',
    checks: [],
    steps: [
      {
        id: 'arrive',
        say: ['INCOMING QUANTUM MESSAGE…'],
        objective: 'Stand by. Signal docking.',
      },
      {
        id: 'bit',
        say: [
          'Docked. The message is an arrow, and it points at S.',
          'Your console has an ordinary bit. Try to make it point at S.',
        ],
        objective: 'Flip the BIT switch until it points at S.',
        hints: [
          'Click the BIT switch and watch where its arrow can go.',
          'Keep flipping. How many directions does it have?',
          'A bit has exactly two settings: up (0) and down (1). S is neither.',
        ],
      },
      {
        id: 'send',
        say: [
          'Up or down. That is all a bit can do.',
          'The message carrier is a qubit. It can point anywhere on the ring. That makes it powerful, and fragile.',
        ],
        objective: 'Send the message to the receiver.',
        hints: ['Look for TRANSMIT under the dial.', 'Press TRANSMIT to send the qubit down the line.', 'Press TRANSMIT.'],
      },
      {
        id: 'hit',
        say: ['⚡ SIGNAL DISTURBED'],
        objective: 'Something changed in transit.',
      },
    ],
    learned: [
      'A bit points one of two ways: 0 or 1',
      'A qubit can point anywhere in between, and that direction is the message',
      'Noise can change it in transit',
    ],
  },
  {
    id: 1,
    code: '01',
    title: 'Something Broke',
    teaser: 'Noise flipped the message. Fix it. Then try to look inside.',
    idea: 'X errors & measurement',
    letter: 'T',
    checks: ['clean'],
    steps: [
      {
        id: 'repair',
        say: ['The message was sent as T. It arrived as C.', 'Something flipped it. Compare the ghost arrow (sent) with the solid one (received).'],
        objective: 'Repair the message. Try the FLIP tool on the carrier.',
        hints: [
          'How is the received arrow related to the sent one? Look at it as a reflection.',
          'It is the sent arrow mirrored top ↔ bottom. Which tool mirrors?',
          'Select FLIP, then click the carrier Q.',
        ],
      },
      {
        id: 'test0',
        say: ['Fixed. Now study the noise. Sending a plain 0 (straight up)…'],
        objective: 'Repair the plain 0.',
        hints: ['Where did the 0 end up?', 'It arrived pointing down. That is a 1.', 'FLIP the carrier.'],
      },
      {
        id: 'test1',
        say: ['0 arrived as 1. Sending a plain 1 (straight down)…'],
        objective: 'Repair the plain 1.',
        hints: ['Same noise, opposite start.', 'A 1 arrived as a 0.', 'FLIP the carrier.'],
      },
      {
        id: 'blind',
        say: [
          "Here's the catch. A real receiver has no ghost arrow. It doesn't know what was sent.",
          'New message incoming. Sent: unknown.',
          'The only way to see inside a qubit is to READ it. Go on, read it.',
        ],
        objective: 'READ the carrier to find out what arrived.',
        hints: ['Select READ.', 'Then click the carrier.', 'READ, then click Q.'],
      },
      {
        id: 'aftermath',
        say: [],
        objective: 'Continue when ready.',
      },
    ],
    learned: [
      'Noise can flip a qubit: 0 ↔ 1 (an X error)',
      'Flipping it again repairs it',
      'Reading a qubit forces a plain 0 or 1 and destroys the direction',
    ],
  },
  {
    id: 2,
    code: '02',
    title: 'Why Not Copy It?',
    teaser: 'Three copies fix ordinary bits. Try it on a qubit.',
    idea: 'No-cloning',
    letter: 'A',
    rankAfter: 'technician',
    checks: [],
    steps: [
      {
        id: 'classical',
        say: ['Ordinary data has an easy fix for noise: send three copies.', 'Noise just flipped one of these three bits. Fix it.'],
        objective: 'Click the bit that disagrees with the other two.',
        hints: ['Two of them agree.', 'The middle one is the odd one out.', 'Click the middle bit.'],
      },
      {
        id: 'copy',
        say: ['Now do the same with the quantum message. This copier takes your message and two blank carriers.'],
        objective: 'Press COPY.',
        hints: ['The COPY button is under the carriers.', 'Press COPY.', 'Press COPY.'],
      },
      {
        id: 'inspect',
        say: ['Expected: three arrows pointing at A.', 'Each carrier now shows its own faint arrow. None of them points at A.'],
        objective: 'Inspect each carrier: click Q1, Q2 and Q3.',
        hints: [
          'Click a carrier to see what it holds on its own.',
          'Check all three. Are any of them a copy of A?',
          'Click Q1, then Q2, then Q3.',
        ],
      },
      {
        id: 'basis',
        say: ['Is the copier broken? Test it on plain messages.'],
        objective: 'Copy a plain 0, then a plain 1.',
        hints: ['Use LOAD 0, then COPY.', 'Then LOAD 1, then COPY.', 'Do you get three perfect arrows each time?'],
      },
      {
        id: 'reveal',
        say: [],
        objective: 'Open the simulator view.',
        hints: ['There is a button to reveal what the carriers really hold.', 'Press SIMULATOR VIEW.', 'Press SIMULATOR VIEW.'],
      },
      {
        id: 'spread',
        say: [
          'Simulator view. Real hardware cannot show this. Use it to understand.',
          'The message is now two threads: all-0 (63%) and all-1 (37%).',
          'Not three copies. One message, shared by three carriers. In every thread, they agree.',
        ],
        objective: 'Continue when ready.',
      },
    ],
    learned: [
      'Ordinary bits can be protected with copies and a majority vote',
      'An unknown quantum message cannot be copied (no-cloning)',
      'But it can be spread across three linked qubits',
    ],
  },
  {
    id: 3,
    code: '03',
    title: 'The Triple Shield',
    teaser: 'Stress-test the shield. Learn how damage looks from the inside.',
    idea: 'Three-qubit bit-flip code',
    letter: 'Y',
    checks: ['clean'],
    steps: [
      {
        id: 'zap',
        say: ['Your shield: message Y, spread over three linked carriers.', 'Stress-test it. Hit one carrier with noise yourself.'],
        objective: 'Select ZAP and click any carrier.',
        hints: ['ZAP is in the tool bar.', 'Select ZAP, then click Q1, Q2 or Q3.', 'Any carrier works for this test.'],
      },
      {
        id: 'notice',
        say: [],
        objective: 'Repair the shield.',
        hints: [
          'In each thread, which carrier disagrees with the other two?',
          'The same carrier is the odd one out in both threads.',
          'Select FLIP and click the odd one out.',
        ],
      },
      {
        id: 'mystery',
        say: ['Good. Now a hit you did not choose.'],
        objective: 'Find the damaged carrier in the simulator view, repair it, then TRANSMIT.',
        hints: [
          'Look for the amber-outlined cell in each thread.',
          'FLIP the carrier that is the odd one out.',
          'Once both threads read 000 / 111 again, press TRANSMIT.',
        ],
      },
      {
        id: 'teaser',
        say: [
          'Delivered. But you had help: the simulator view showed you the inside.',
          'Real hardware has no x-ray. Next: find the odd one out without looking.',
        ],
        objective: 'Continue when ready.',
      },
    ],
    learned: [
      'The shield stores one message across three qubits as a pattern',
      'A bit-flip makes one carrier the odd one out, in every thread',
      'Flipping that carrier back repairs the message',
    ],
  },
  {
    id: 4,
    code: '04',
    title: 'The Helper',
    teaser: 'You may not read the carriers. But you can wire a helper to them.',
    idea: 'Ancilla probes',
    letter: 'C',
    checks: ['preserved'],
    steps: [
      {
        id: 'single',
        say: [
          'Meet the helper ◇: a spare qubit that starts at 0.',
          'Wire it to carriers. When the probe runs, every wired carrier that holds a 1 flips the helper.',
          'Rule: never READ the carriers. Reading the helper is allowed.',
        ],
        objective: 'Wire the helper to Q1 only, then press RUN.',
        hints: [
          'Click the empty socket where the helper column crosses Q1.',
          'Only Q1 for this first test, then press RUN.',
          'Socket on Q1 → RUN.',
        ],
      },
      {
        id: 'measure1',
        say: ['Simulator view: in thread A the helper became 0. In thread B it became 1.', 'It copied Q1, separately in each thread.'],
        objective: 'MEASURE the helper.',
        hints: ['Press MEASURE.', 'Watch what happens to the threads.', 'Press MEASURE.'],
      },
      {
        id: 'pair',
        say: ['Rewound. Same experiment, but wire the helper to TWO carriers this time.'],
        objective: 'Wire the helper to Q1 and Q2, then press RUN.',
        hints: [
          'Add a second socket on the helper column.',
          'Connect Q1 and Q2, nothing else.',
          'Sockets on Q1 and Q2 → RUN.',
        ],
      },
      {
        id: 'measure2',
        say: ['Look at the helper row: both threads gave it the same value.'],
        objective: 'MEASURE the helper.',
        hints: ['Press MEASURE.', 'Do the threads survive this time?', 'Press MEASURE.'],
      },
      {
        id: 'zapped',
        say: ['The message survived. Now hit Q1 with noise and probe again.'],
        objective: 'ZAP Q1, then RUN and MEASURE (helper still on Q1 + Q2).',
        hints: ['Select ZAP and click Q1.', 'Then RUN, then MEASURE.', 'ZAP → Q1 → RUN → MEASURE.'],
      },
      {
        id: 'wonder',
        say: [
          'Helper = 1. It noticed the hit without reading Q1 or Q2, and nothing collapsed.',
          'But what exactly is it measuring? Next mission.',
        ],
        objective: 'Continue when ready.',
      },
    ],
    learned: [
      'A helper wired to ONE carrier copies it, so reading it collapses the message',
      'Wired to TWO carriers, it gets the same answer in every thread',
      'So it can be read safely, and it still notices errors',
    ],
  },
  {
    id: 5,
    code: '05',
    title: 'Same or Different',
    teaser: 'What is the helper actually telling you?',
    idea: 'Parity',
    letter: 'O',
    rankAfter: 'operator',
    checks: [],
    steps: [
      {
        id: 'light',
        say: ['Calibration bench. These test carriers hold plain 0s and 1s, so you can see and set them.', 'The helper is wired to both.'],
        objective: 'Get the helper to read 1.',
        hints: ['Click a test carrier to change its value, then RUN.', 'Try different combinations.', 'Make T1 and T2 different, then RUN.'],
      },
      {
        id: 'predict',
        say: ['Helper = 1. Now flip BOTH test carriers.', 'Before you run it: what will the helper say?'],
        objective: 'Flip both carriers, predict the helper, then RUN.',
        hints: ['Click T1 and T2 once each.', 'Then pick 0 or 1 as your prediction.', 'Then RUN to check.'],
      },
      {
        id: 'log',
        say: ['Fill the experiment log: try every combination.'],
        objective: 'Run all four combinations: 00, 01, 10, 11.',
        hints: [
          'Set the carriers, RUN, repeat.',
          'Which rows of the log are still empty?',
          'Compare the rows where T1 and T2 match with the rows where they do not.',
        ],
      },
      {
        id: 'link',
        say: [
          'You never asked "what is T1?". You asked "do T1 and T2 agree?".',
          'That is why the helper did not collapse the shield last mission. In every thread Q1 and Q2 had the same relationship, even though their values differed.',
        ],
        objective: 'Continue when ready.',
      },
    ],
    learned: [
      'A two-wire helper measures parity: SAME → 0, DIFFERENT → 1',
      'Parity says nothing about the values themselves',
      'That is why it can be read without collapsing the shield',
    ],
  },
  {
    id: 6,
    code: '06',
    title: 'The Fingerprint',
    teaser: 'Two probes, two answers. Map what each error looks like.',
    idea: 'Syndromes',
    letter: 'H',
    checks: ['diagnosis'],
    steps: [
      {
        id: 'clean',
        say: ['Two helpers now. S1 compares Q1 ↔ Q2. S2 compares Q2 ↔ Q3.', 'Start with an undamaged shield.'],
        objective: 'RUN both probes.',
        hints: ['Use RUN PROBES.', 'Watch the fingerprint board fill in.', 'Press RUN PROBES.'],
      },
      {
        id: 'map',
        say: ['Now hit each carrier in turn and probe. The fingerprint board fills in as you go.'],
        objective: 'ZAP a carrier, RUN PROBES. Map all three carriers.',
        hints: [
          'One hit at a time. The test shield resets after each reading.',
          'Which rows of the board are still blank?',
          'ZAP the carrier for a blank row, then RUN PROBES.',
        ],
      },
      {
        id: 'mystery',
        say: ['Simulator view OFF. A mystery hit is coming.', 'Probe it, then TAG the carrier you think was hit.'],
        objective: 'RUN PROBES, then TAG the suspect (or tag NO HIT).',
        hints: [
          'Your fingerprint board is the key.',
          'Find the row that matches S1 and S2.',
          'Select TAG and click that carrier, or press NO HIT for 0 0.',
        ],
      },
    ],
    learned: [
      'Two parity probes give two answers',
      'Each single bit-flip produces a different pair: a fingerprint',
      'That fingerprint is the syndrome',
    ],
  },
  {
    id: 7,
    code: '07',
    title: 'Repair',
    teaser: 'Live signals. Diagnose, fix, deliver.',
    idea: 'Correction',
    letter: 'E',
    rankAfter: 'analyst',
    checks: ['diagnosis', 'probes', 'clean'],
    probePar: 6,
    steps: [
      {
        id: 'round',
        say: ['Live repairs. Noise is hitting incoming signals. You cannot see inside.', 'Probe → read the fingerprint → fix → transmit.'],
        objective: 'Repair and deliver 3 signals.',
        hints: [
          'Start with RUN PROBES.',
          'Match S1 S2 against the fingerprint board.',
          'FLIP the carrier the fingerprint points at (or nothing for 0 0), then TRANSMIT.',
        ],
      },
    ],
    learned: [
      'Syndrome → diagnosis → correction',
      'An X error is undone by another X on the same carrier',
      'When the syndrome is 0 0, the right move is to do nothing',
    ],
  },
  {
    id: 8,
    code: '08',
    title: 'No Looking Allowed',
    teaser: 'Wire your own probes. Repair what you never see.',
    idea: 'Non-destructive measurement',
    letter: 'R',
    rankAfter: 'repairer',
    checks: ['diagnosis', 'probes', 'preserved', 'clean'],
    probePar: 4,
    steps: [
      {
        id: 'round',
        say: [
          'Certification. No simulator view. No pre-wired probes.',
          'Wire your own helpers, diagnose, repair, transmit.',
          "There's a READ tool. It's faster. It's also a trap.",
        ],
        objective: 'Repair 2 signals without reading the protected carriers.',
        hints: [
          "You don't need to know what any carrier holds. Ask how they compare.",
          'Each helper should compare exactly two carriers, and the two helpers should ask different questions.',
          'Wire H1 to Q1 + Q2 and H2 to Q2 + Q3, the same as your fingerprint board.',
        ],
      },
    ],
    learned: [
      'Reading protected carriers destroys the message',
      'Parity probes reveal the error, never the message',
      'You can repair what you never see',
    ],
  },
  {
    id: 9,
    code: '09',
    title: 'The Other Noise',
    teaser: 'Your probes say all clear. The message says otherwise.',
    idea: 'X vs Z errors',
    letter: 'E',
    checks: ['diagnosis', 'clean'],
    steps: [
      {
        id: 'silent',
        say: ['Calibration bay. A different kind of noise is loose in the channel.', 'It just hit your shield. Run your probes.'],
        objective: 'RUN PROBES.',
        hints: ['Press RUN PROBES.', 'Read the fingerprint.', 'Press RUN PROBES.'],
      },
      {
        id: 'fooled',
        say: ['Syndrome 0 0. No bit-flip detected. Looks clean.'],
        objective: 'TRANSMIT the message.',
        hints: ['Press TRANSMIT.', 'Watch the receiver.', 'Press TRANSMIT.'],
      },
      {
        id: 'sign',
        say: [
          'Received N. Sent E. The probes saw nothing.',
          'Simulator view: no 0 became 1. But thread B\'s sign flipped from + to −.',
          'That is a Z error, a phase-flip. Bit probes compare 0s and 1s, so they are blind to it.',
        ],
        objective: 'We told you it was phase noise, so undo it: PHASE FIX any carrier.',
        hints: [
          'PHASE FIX applies a Z.',
          'In this shield a Z on any carrier flips the threads\' sign back.',
          'Select PHASE FIX and click any carrier.',
        ],
      },
      {
        id: 'lens',
        say: [
          'Restored, but only because you were told what happened. Your probes could not have found it.',
          'To catch phase errors, look through a different lens. Put every carrier behind one.',
        ],
        objective: 'Apply the LENS to Q1, Q2 and Q3.',
        hints: ['Select LENS.', 'Click each carrier once.', 'LENS → Q1, Q2, Q3.'],
      },
      {
        id: 'phase',
        say: [
          'Phase shield online. Seen through the lens, the threads read + + + and − − −.',
          'Your helpers now compare phases (+ or −) instead of 0s and 1s.',
          'Calibration over: simulator view OFF. Phase noise incoming…',
        ],
        objective: 'RUN PROBES, PHASE FIX the suspect, then TRANSMIT.',
        hints: [
          'The fingerprints work exactly like before.',
          '1 0 → Q1 · 1 1 → Q2 · 0 1 → Q3.',
          'PHASE FIX the carrier the fingerprint points at, then TRANSMIT.',
        ],
      },
      {
        id: 'blindspot',
        say: ['One last test: ordinary bit-flip noise, on your phase shield.'],
        objective: 'RUN PROBES, then TRANSMIT.',
        hints: ['RUN PROBES.', 'Then TRANSMIT.', 'Watch the receiver closely.'],
      },
      {
        id: 'outro',
        say: [],
        objective: 'Continue when ready.',
      },
    ],
    learned: [
      'X errors flip 0 ↔ 1 and mirror the dial top ↔ bottom',
      'Z errors flip the sign between threads and mirror it left ↔ right',
      'Each kind needs its own probes',
      'A three-qubit shield only guards against one kind',
    ],
  },
  {
    id: 10,
    code: '10',
    title: 'Master Repair',
    teaser: 'Nine qubits. Unknown error. Unknown kind.',
    idea: "Shor's nine-qubit code",
    letter: 'N',
    checks: ['diagnosis', 'probes', 'preserved', 'clean'],
    probePar: 16,
    steps: [
      {
        id: 'round',
        say: [
          'The nine-qubit shield: three triple-shields wired together.',
          'Bit probes inside each block catch bit-flips. You know these.',
          'Phase probes between blocks compare whole blocks. They catch phase-flips.',
          'Something hit. You do not know where, or what kind.',
        ],
        objective: 'Repair and deliver 3 signals. 8 probe charges per signal.',
        hints: [
          'Phase probes are cheap insurance: two of them cover all nine carriers.',
          'Bit probes only cover their own block. Stop probing once you have found the hit.',
          'Phase fingerprint: 1 0 → block A · 1 1 → B · 0 1 → C. Bit fingerprint inside a block works as before.',
        ],
      },
    ],
    learned: [
      'Nesting shields guards against both bit- and phase-flips',
      'Bit probes locate a flip inside a block; phase probes locate a block',
      'Even a double hit (bit + phase on one carrier) can be repaired',
    ],
  },
  {
    id: 11,
    code: '11',
    title: 'The Noise Storm',
    teaser: 'Repeated noise. Keep the message alive.',
    idea: 'Repair faster than errors arrive',
    letter: 'T',
    rankAfter: 'specialist',
    checks: ['diagnosis', 'preserved', 'clean'],
    steps: [
      {
        id: 'briefing',
        say: [
          'Final mission: a noise storm. Pulses will keep hitting the channel.',
          'First, a warning. Two pulses just hit before anyone could repair.',
        ],
        objective: 'RUN PROBES, then FLIP whatever the fingerprint points at.',
        hints: ['Same drill as always.', 'Read the fingerprint off the board.', 'FLIP the carrier it points at.'],
      },
      {
        id: 'fooled',
        say: [],
        objective: 'Continue to the storm.',
      },
      {
        id: 'storm',
        say: ['Storm incoming. Survive 10 pulses. Integrity drains while damage sits unrepaired.'],
        objective: 'Survive 10 pulses, then deliver the message.',
        hints: [
          'Probe after every pulse. Some pulses miss.',
          'Syndrome 0 0 means leave it alone.',
          'Repair quickly: two hits before a repair can fool the shield.',
        ],
      },
    ],
    learned: [
      'A three-qubit shield fixes one flip, not two',
      'Errors must be corrected faster than they arrive',
      'Probing regularly keeps errors from piling up',
    ],
  },
];

export const STORM_LEVEL = 11;
