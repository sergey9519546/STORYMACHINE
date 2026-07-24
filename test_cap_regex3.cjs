const line1 = "   I told you S-H-O-O-T me!  ";

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

const fWordMatch = /^\s*(\S+)/.exec(line1);
const fWord = fWordMatch ? fWordMatch[1].toLowerCase().replace(/[^a-z']/g, '') : '';
console.log('First Word:', fWord);
