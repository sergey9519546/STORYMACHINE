const line1 = "   I told you S-H-O-O-T me!  ";

// My bad new logic
const trimmed = line1.trim();
const spaceIdx = trimmed.indexOf(' ');
// S-H-O-O-T -> S H O O T
console.log(trimmed.slice(spaceIdx).replace(/[^A-Za-z\s]/g, ''));
// Ah, S H O O T has no 3 consecutive caps!
