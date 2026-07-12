/**
 * NarrativeState — unified narrative state container with dot-path access.
 *
 * Verbatim TypeScript port of OWNE's `NCPState` (owne/core/state.py). This is
 * the single object every detector reads as a stateless view (#108): a
 * `{ ledgers, graphs, characters }` container supporting dot-path
 * set/query/delete, snapshot/restore, merge, and structural diff.
 *
 * Port fidelity: behavior matches OWNE's `test_state.py` case-for-case
 * (create, query, snapshot/restore, merge, diff, delete). The Python semantics
 * preserved here:
 *  - `query` on an empty path returns the whole state.
 *  - `merge` deep-merges when both sides are plain objects; `null` overwrites.
 *  - `diff` walks sorted keys, comparing leaves by value (deep equality).
 *
 * No LLM, no I/O — a pure, deterministic, byte-reproducible data structure.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any;
type Dict = Record<string, Json>;

export interface StateDiff {
  added: Dict;
  removed: Dict;
  changed: Record<string, [Json, Json]>;
}

function isPlainObject(v: unknown): v is Dict {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function deepCopy<T>(v: T): T {
  // structuredClone is available on Node >= 17; the repo targets Node >= 22.6.
  return structuredClone(v);
}

function deepEqual(a: Json, b: Json): boolean {
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (!deepEqual(a[i], b[i])) return false;
    return true;
  }
  if (isPlainObject(a) && isPlainObject(b)) {
    const ak = Object.keys(a);
    const bk = Object.keys(b);
    if (ak.length !== bk.length) return false;
    for (const k of ak) {
      if (!Object.prototype.hasOwnProperty.call(b, k)) return false;
      if (!deepEqual(a[k], b[k])) return false;
    }
    return true;
  }
  return false;
}

function deepMerge(base: Dict, overlay: Dict): Dict {
  const result = deepCopy(base);
  for (const [key, value] of Object.entries(overlay)) {
    if (
      Object.prototype.hasOwnProperty.call(result, key) &&
      isPlainObject(result[key]) &&
      isPlainObject(value)
    ) {
      result[key] = deepMerge(result[key] as Dict, value as Dict);
    } else {
      result[key] = deepCopy(value);
    }
  }
  return result;
}

function deepDiff(
  a: Json,
  b: Json,
  prefix: string,
  added: Dict,
  removed: Dict,
  changed: Record<string, [Json, Json]>,
): void {
  if (isPlainObject(a) && isPlainObject(b)) {
    const allKeys = new Set<string>([...Object.keys(a), ...Object.keys(b)]);
    for (const key of Array.from(allKeys).sort()) {
      const path = prefix ? `${prefix}.${key}` : key;
      const inA = Object.prototype.hasOwnProperty.call(a, key);
      const inB = Object.prototype.hasOwnProperty.call(b, key);
      if (inA && !inB) {
        removed[path] = deepCopy(a[key]);
      } else if (!inA && inB) {
        added[path] = deepCopy(b[key]);
      } else {
        deepDiff(a[key], b[key], path, added, removed, changed);
      }
    }
  } else if (!deepEqual(a, b)) {
    changed[prefix] = [deepCopy(a), deepCopy(b)];
  }
}

export class NarrativeState {
  private _data: Dict;

  constructor(initial?: Dict) {
    this._data = { ledgers: {}, graphs: {}, characters: {} };
    if (initial) {
      for (const [path, value] of Object.entries(initial)) {
        this.set(path, value);
      }
    }
  }

  // --- Dot-path helpers ---

  private static parsePath(path: string): string[] {
    return path.split('.').filter((p) => p.length > 0);
  }

  /** Walk to the parent dict of the last key. Returns [parent, lastKey] or [null, null]. */
  private resolveParent(keys: string[], create: boolean): [Dict | null, string | null] {
    let node: Dict = this._data;
    for (const key of keys.slice(0, -1)) {
      if (!(key in node)) {
        if (create) {
          node[key] = {};
        } else {
          return [null, null];
        }
      }
      let child = node[key];
      if (!isPlainObject(child)) {
        if (create) {
          node[key] = {};
          child = node[key];
        } else {
          return [null, null];
        }
      }
      node = child as Dict;
    }
    return [node, keys.length ? keys[keys.length - 1] : null];
  }

  // --- Public API ---

  /** Set a value at a dot-separated path, creating intermediates as needed. */
  set(path: string, value: Json): void {
    const keys = NarrativeState.parsePath(path);
    if (keys.length === 0) return;
    const [parent, leaf] = this.resolveParent(keys, true);
    if (parent !== null && leaf !== null) {
      parent[leaf] = value;
    }
  }

  /** Query a value by dot-separated path. Returns `def` if not found. */
  query(path: string, def: Json = null): Json {
    const keys = NarrativeState.parsePath(path);
    if (keys.length === 0) {
      // Python: `return self._data if self._data else default` — _data is always a non-empty object here.
      return Object.keys(this._data).length ? this._data : def;
    }
    let node: Json = this._data;
    for (const key of keys) {
      if (!isPlainObject(node) || !(key in node)) {
        return def;
      }
      node = node[key];
    }
    return node;
  }

  /** Delete a key at a dot-separated path. No error if missing. */
  delete(path: string): void {
    const keys = NarrativeState.parsePath(path);
    if (keys.length === 0) return;
    const [parent, leaf] = this.resolveParent(keys, false);
    if (parent !== null && leaf !== null && leaf in parent) {
      delete parent[leaf];
    }
  }

  /** Return a deep copy of the entire state as a plain object. */
  snapshot(): Dict {
    return deepCopy(this._data);
  }

  /** Replace entire state from a snapshot object. */
  restore(snapshot: Dict): void {
    this._data = deepCopy(snapshot);
  }

  /**
   * Merge another object into the current state. Supports both dot-path keys
   * (like the constructor) and nested objects. Deep-merges when both sides are
   * plain objects.
   */
  merge(other: Dict): void {
    for (const [key, value] of Object.entries(other)) {
      if (key.includes('.')) {
        const existing = this.query(key);
        if (isPlainObject(existing) && isPlainObject(value)) {
          this.set(key, deepMerge(existing, value));
        } else {
          this.set(key, value);
        }
      } else if (isPlainObject(value) && isPlainObject(this._data[key])) {
        this._data[key] = deepMerge(this._data[key] as Dict, value);
      } else {
        this._data[key] = deepCopy(value);
      }
    }
  }

  /**
   * Compute a structural diff between this state and another.
   * Returns { added, removed, changed: { path: [old, new] } }.
   */
  diff(other: NarrativeState): StateDiff {
    const added: Dict = {};
    const removed: Dict = {};
    const changed: Record<string, [Json, Json]> = {};
    deepDiff(this._data, other._data, '', added, removed, changed);
    return { added, removed, changed };
  }

  toString(): string {
    return `NarrativeState(${JSON.stringify(this._data)})`;
  }
}
