export type FountainBlockType = 
  | 'scene_heading' 
  | 'action' 
  | 'character' 
  | 'dialogue' 
  | 'parenthetical' 
  | 'transition' 
  | 'shot' 
  | 'centered' 
  | 'lyrics' 
  | 'section' 
  | 'synopsis' 
  | 'note' 
  | 'boneyard'
  | 'empty';

export interface FountainBlock {
  id: string;
  type: FountainBlockType;
  text: string;
  lintErrors?: string[];
}

const CAMERA_TERMS = [
  'WIDE SHOT', 'PAN', 'ZOOM', 'ANGLE ON', 'CLOSE UP', 'POV', 'CRANE', 'TRACKING SHOT', 'DOLLY', '35MM', 'WE SEE', 'ESTABLISHING SHOT', 'WIDE ESTABLISHING SHOT', 'TIGHT ON', 'REVERSE ANGLE'
];

export function parseFountain(text: string): FountainBlock[] {
  const lines = text.split('\n');
  const blocks: FountainBlock[] = [];
  
  let inBoneyard = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    if (trimmed === '') {
      blocks.push({ id: `block-${i}`, type: 'empty', text: line });
      continue;
    }

    // Boneyard handling
    if (trimmed.startsWith('/*')) {
      inBoneyard = true;
    }
    
    if (inBoneyard) {
      blocks.push({ id: `block-${i}`, type: 'boneyard', text: line });
      if (trimmed.endsWith('*/')) {
        inBoneyard = false;
      }
      continue;
    }

    let type: FountainBlockType = 'action';

    // Basic Fountain parsing rules
    if (trimmed.match(/^(INT|EXT|EST|I\/E)[. ]/i) || trimmed.startsWith('.')) {
      type = 'scene_heading';
    } else if (trimmed.startsWith('#')) {
      type = 'section';
    } else if (trimmed.startsWith('=')) {
      type = 'synopsis';
    } else if (trimmed.startsWith('[[') && trimmed.endsWith(']]')) {
      type = 'note';
    } else if (trimmed.startsWith('~')) {
      type = 'lyrics';
    } else if (trimmed.startsWith('>') && trimmed.endsWith('<')) {
      type = 'centered';
    } else if (trimmed.match(/^[A-Z][A-Z0-9 \t]+(\(V\.O\.\)|\(O\.S\.\))?$/) && i < lines.length - 1 && lines[i+1].trim() !== '') {
      // Character names are all caps, not followed by empty line
      // Check if previous block was empty or it's the first line
      const prevBlock = blocks.length > 0 ? blocks[blocks.length - 1] : null;
      if (!prevBlock || prevBlock.type === 'empty') {
        type = 'character';
      }
    } else if (trimmed.startsWith('(') && trimmed.endsWith(')')) {
      // Check if it follows a character or dialogue
      const prevBlock = blocks.length > 0 ? blocks[blocks.length - 1] : null;
      if (prevBlock && (prevBlock.type === 'character' || prevBlock.type === 'dialogue')) {
        type = 'parenthetical';
      }
    } else if (trimmed.match(/^(FADE IN:|FADE OUT\.|CUT TO:|DISSOLVE TO:)$/) || (trimmed.match(/^[A-Z ]+ TO:$/) && trimmed === trimmed.toUpperCase())) {
      type = 'transition';
    } else if (trimmed.match(/^[A-Z0-9 \t\-]+$/) && CAMERA_TERMS.some(term => trimmed.includes(term))) {
      type = 'shot';
    } else if (i > 0 && blocks.length > 0 && (blocks[blocks.length - 1].type === 'character' || blocks[blocks.length - 1].type === 'parenthetical')) {
      type = 'dialogue';
    }

    // Forced Action
    if (trimmed.startsWith('!')) {
      type = 'action';
    }

    // Linting for camera directions in action and scene headings
    let lintErrors: string[] = [];
    if (type === 'action' || type === 'scene_heading') {
      const upperLine = line.toUpperCase();
      for (const term of CAMERA_TERMS) {
        if (upperLine.includes(term)) {
          lintErrors.push(`Camera bleed: "${term}"`);
        }
      }
    }

    blocks.push({
      id: `block-${i}`,
      type,
      text: line,
      lintErrors: lintErrors.length > 0 ? lintErrors : undefined
    });
  }

  return blocks;
}
