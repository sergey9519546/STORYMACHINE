import fs from 'node:fs';
import { parseFountain } from '../src/lib/fountain.ts';

// Inline copy of the new convertHtml ID-aware path to test it standalone.
function decodeEntities(s) {
  return s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
          .replace(/<br\s*\/?>/gi, '\n');
}
function convertHtmlIdAware(text) {
  const idMatches = [...text.matchAll(/<p[^>]*\sID=["'](slug|loc|act|speaker|spkdir|dia|right)["'][^>]*>([\s\S]*?)<\/p>/gi)];
  if (idMatches.length >= 10) {
    const lines = [];
    let prevRole = null;
    for (const m of idMatches) {
      const role = m[1].toLowerCase();
      let content = decodeEntities(m[2]).replace(/<[^>]+>/g, '').trim();
      if (!content) continue;
      if (role === 'slug' || role === 'loc') {
        if (lines.length && lines[lines.length - 1] !== '') lines.push('');
        lines.push(content);
        lines.push('');
        prevRole = 'slug';
      } else if (role === 'speaker') {
        if (lines.length && lines[lines.length - 1] !== '') lines.push('');
        lines.push(content.toUpperCase());
        prevRole = 'speaker';
      } else if (role === 'spkdir') {
        if (!content.startsWith('(')) content = '(' + content;
        if (!content.endsWith(')')) content = content + ')';
        lines.push(content);
        prevRole = 'spkdir';
      } else if (role === 'dia') {
        lines.push(content);
        lines.push('');
        prevRole = 'dia';
      } else {
        if (prevRole === 'speaker' || prevRole === 'spkdir') lines.push('');
        if (lines.length && lines[lines.length - 1] !== '') lines.push('');
        lines.push(content);
        lines.push('');
        prevRole = 'act';
      }
    }
    return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  }
  return null;
}

const testFile = 'O:/.cluster/scripts-crawl-20260713/DELIVERY/by-genre/Crime/1993_True Romance.html';
const html = fs.readFileSync(testFile, 'utf8');
const out = convertHtmlIdAware(html);
console.log('Output length:', out.length);
console.log('First 1500 chars:');
console.log(out.substring(0, 1500));
console.log('');
const blocks = parseFountain(out);
const c = { character: 0, dialogue: 0, scene_heading: 0, action: 0 };
for (const b of blocks) if (b.type in c) c[b.type]++;
console.log('Block counts:', JSON.stringify(c));
