const line1 = "   I told you S-H-O-O-T me!  ";

// Old logic
const words336 = line1.split(/\s+/);
const oldMatched = words336.slice(1).some(w => /^[A-Z]{3,}$/.test(w.replace(/[^A-Za-z]/g, '')));

// My bad new logic
const trimmed = line1.trim();
const spaceIdx = trimmed.indexOf(' ');
const newMatched = spaceIdx !== -1 && /\b[A-Z]{3,}\b/.test(trimmed.slice(spaceIdx).replace(/[^A-Za-z\s]/g, ''));

console.log('Old:', oldMatched, 'New:', newMatched);

// Better new logic: iterate over words using a match loop, avoiding array allocation if possible
// The goal is: for each word (separated by whitespace), replace non-letters, and check length of ALL CAPS.
// Wait, the original logic removes ALL non-alpha characters from the word, so S-H-I-T -> SHIT.
// We can simulate this by matching sequences of non-whitespace characters, removing non-alpha, and checking.
// Or we can just use string.match(/\S+/g) but that allocates an array.
// A zero-allocation regex iteration:
let betterMatch = false;
const wordRegex = /\S+/g;
let match;
let first = true;
while ((match = wordRegex.exec(line1)) !== null) {
  if (first) {
    first = false;
    continue;
  }
  if (/^[A-Z]{3,}$/.test(match[0].replace(/[^A-Za-z]/g, ''))) {
    betterMatch = true;
    break;
  }
}
console.log('Better:', betterMatch);

// For the first word extraction, dealing with spaces AND tabs:
// We can use a regex to match the first word, or iterate until first whitespace.
// A regex: /^\s*(\S+)/.exec(d.line)?.[1]
const fWordMatch = /^\s*(\S+)/.exec(line1);
const fWord = fWordMatch ? fWordMatch[1].toLowerCase().replace(/[^a-z']/g, '') : '';
console.log('First Word:', fWord);
