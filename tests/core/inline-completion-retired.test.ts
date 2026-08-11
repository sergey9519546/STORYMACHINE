// Source-level retirement contract for the legacy keystroke-triggered inline
// completion surface. React/CodeMirror components are not importable in this
// JSX-free Node test runner, so this reads the exact shipping integration
// sources and dead-asset paths. Positive controls prevent a broad deletion
// from masquerading as a safe retirement.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '../..');
const read = (relativePath: string): string => readFileSync(resolve(ROOT, relativePath), 'utf8');

const SHIPPING_EDITOR_SOURCES = [
  'src/components/editor/FountainEditor.tsx',
  'src/components/ScriptIDE.tsx',
  'src/components/scriptide/Toolbar.tsx',
] as const;

describe('inline completion retirement — shipping source contract', () => {
  it('removes all legacy editor state, props, toggle, imports, and request wiring', () => {
    const forbidden = [
      /inline-complete/i,
      /inlineCompletion/,
      /inline_completion/,
      /\/api\/scriptide\/complete/,
      /EventSource/,
      /withSession/,
    ];

    for (const relativePath of SHIPPING_EDITOR_SOURCES) {
      const source = read(relativePath);
      for (const pattern of forbidden) {
        assert.doesNotMatch(source, pattern, `${relativePath} still contains retired inline-completion wiring: ${pattern}`);
      }
    }
  });

  it('deletes the obsolete client module and server prompt/template', () => {
    assert.equal(existsSync(resolve(ROOT, 'src/components/editor/inline-complete.ts')), false);
    assert.equal(existsSync(resolve(ROOT, 'server/prompts/scriptide-complete.txt')), false);
  });

  it('retires the unreachable persona/FIM contract while preserving live editor workflows', () => {
    assert.doesNotMatch(read('server/engine/ai.ts'), /GHOST_TEXT/);
    assert.doesNotMatch(read('.env.example'), /GHOST_TEXT/);
    assert.equal(existsSync(resolve(ROOT, 'server/personas')), false);

    const editor = read('src/components/editor/FountainEditor.tsx');
    assert.match(editor, /autocompletion\s*\(/, 'ordinary Fountain autocomplete must remain');
    assert.match(editor, /screenplayComplete/, 'Fountain completion source must remain');
    assert.match(editor, /liveDiagnostics/, 'Live Notes wiring must remain');

    const scriptIde = read('src/components/ScriptIDE.tsx');
    assert.match(scriptIde, /autoAnalysis/, 'opt-in auto-analysis must remain');
    assert.doesNotMatch(
      scriptIde,
      /copilotPersona|copilot_persona|personaList|copilot-persona|\/api\/scriptide\/personas|prefsOpen\s*===\s*["']copilot["']/,
      'ScriptIDE must not retain an inert persona picker or persisted selection',
    );

    const toolbar = read('src/components/scriptide/Toolbar.tsx');
    assert.doesNotMatch(toolbar, /onOpenCopilot|Copilot voice/);

    const routes = read('server/routes/scriptide.ts');
    assert.doesNotMatch(routes, /\/api\/scriptide\/personas|listPersonas|registerUserPersona|isPersonaRegisterError|PersonaBodySchema/);
    assert.match(routes, /\/api\/scriptide\/world-build/, 'explicit world-build route must remain');
    assert.match(routes, /modelForTask\('WORLDBUILD'\)/, 'world-build must retain its provider task selection');
    assert.doesNotMatch(read('server/lib/validation.ts'), /PersonaBodySchema/);
  });
});
