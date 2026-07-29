import fs from 'node:fs';
import { analyzeFountainText } from '../server/nvm/analyze/fountain-analyzer.ts';

const CORPUS = 'C:/Users/serge/Documents/MAIN_StoryMachine_Engine_Logic/STORYMACHINE V1 REPO/real-script-corpus';
const REPO = 'data/screenplays';

// Get current files in data/screenplays (lowercased, stripped)
const present = new Set(fs.readdirSync(REPO).map(f => f.toLowerCase().replace(/[^a-z0-9]/g, '')));

// List all .fountain.txt in corpus
const corpusFiles = fs.readdirSync(CORPUS).filter(f => f.endsWith('.fountain.txt')).sort();
console.log(`Corpus has ${corpusFiles.length} .fountain.txt files`);

let missing = 0, present2 = 0;
const toCopy = [];
for (const f of corpusFiles) {
  const norm = f.toLowerCase().replace(/[^a-z0-9]/g, '');
  // Check if any present file matches (by first 10 chars to handle naming diffs)
  const prefix = norm.slice(0, 10);
  const isPresent = [...present].some(p => p.includes(prefix));
  if (!isPresent) {
    missing++;
    toCopy.push(f);
  } else {
    present2++;
  }
}
console.log(`Already in data/screenplays: ${present2}`);
console.log(`Missing (to copy): ${missing}`);
console.log('');

// Parse-check each missing file
console.log('Parse check for missing files:');
console.log('file'.padEnd(48), '| scenes | words  | dialogue');
let goodCount = 0;
for (const f of toCopy) {
  try {
    const text = fs.readFileSync(`${CORPUS}/${f}`, 'utf-8');
    const a = analyzeFountainText(text);
    const ok = a.sceneCount >= 5 ? 'OK' : 'LOW-SCENES';
    if (a.sceneCount >= 5) goodCount++;
    console.log(f.padEnd(48), '|', String(a.sceneCount).padStart(6), '|', String(a.wordCount).padStart(6), '|', String(a.dialogueLineCount).padStart(5), ok);
  } catch(e) {
    console.log(f.padEnd(48), 'PARSE ERROR:', e.message.slice(0, 60));
  }
}
console.log('');
console.log(`${goodCount} of ${missing} missing files parse cleanly (sceneCount >= 5)`);
console.log('');
console.log('TO COPY (good files):');
for (const f of toCopy) console.log('  ' + f);
