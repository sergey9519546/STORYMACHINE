# Story Vector Embedding System

> **Corrected 2026-08-24.** This document previously described a fixed
> 3,216-dimensional space and showed an example `/api/nvm/analyze/compare`
> response containing a measured-looking `genome` block. Neither was true: the
> dimension count is built lazily and varies, and the genome fields were five
> hardcoded constants in the route. Both are corrected below, and the two live
> 500s that made the endpoints unusable are fixed. Every number in the
> Performance section is now a measurement taken on the shipped corpus, with
> the command that produced it.

## Overview

The Story Vector Embedding system converts StoryMachine's Script Doctor
analysis into a vector representation, enabling comparative screenplay
analysis. Each dimension represents how many times a specific diagnostic rule
fired, creating a structural fingerprint independent of surface content.

The dimension count is **not fixed**. `RULE_INDEX` is built lazily from the
`pass::rule` keys actually encountered, so a vector's length is "how many
distinct rules this process has vectorized so far". Every vector therefore
carries its own `ruleKeys` (the dimension-to-rule mapping), and `alignVectors`
reconciles vectors by rule name before any distance math.

## Architecture

```
┌─────────────────┐
│ Fountain Text   │
└────────┬────────┘
         │
         v
┌─────────────────┐
│ Script Doctor   │  (14 passes)
└────────┬────────┘
         │
         v
┌─────────────────┐
│ Rule Firings    │  (pass::rule → count)
└────────┬────────┘
         │
         v
┌──────────────────────────────┐
│ Story Vector                 │  (L2-normalized;
│  dimensions[] + ruleKeys[]   │   length = distinct
└────────┬─────────────────────┘   rules seen so far)
         │
         v
┌─────────────────┐
│ alignVectors    │  (union of ruleKeys, sorted;
└────────┬────────┘   absent rule → 0)
         │
         v
┌─────────────────────────────────────┐
│ Comparative Analysis:               │
│  • Similarity Search                │
│  • Clustering                       │
└─────────────────────────────────────┘
```

## Core Components

### 1. **story-vector.ts** — Vectorization Engine

Converts screenplay → vector and provides similarity/clustering operations.

**Key Functions:**

- `vectorizeScript(fountainText, title, source)` — High-level: Fountain → StoryVector
- `vectorizeFromIssues(issues, metadata)` — Low-level: issues → StoryVector
- `alignVectors(vectors)` — Project vectors onto one shared, sorted key space
- `cosineSimilarity(v1, v2)` — Returns [0, 1] similarity score (strict: throws on a length mismatch, so align first)
- `findNearestNeighbors(query, corpus, k)` — Find k most similar scripts (aligns internally)
- `clusterCorpus(vectors, numClusters)` — K-means clustering (aligns internally)

**Why alignment is not optional.** `RULE_INDEX` is per-process and append-only,
and its order follows whichever script was vectorized first. Two consequences,
both of which were live bugs until 2026-08-24: a draft vectorized before the
corpus is *shorter* than every corpus vector (`cosineSimilarity` threw
`Dimension mismatch: 2 vs 185`), and across processes the same position can
denote a different rule (silently wrong numbers, no error). `alignVectors`
takes the union of all `ruleKeys`, sorts it, and rewrites each vector into that
order with 0 for rules it never saw. That re-projection is a permutation plus
zero-extension, so unit length and every dot product survive it exactly.

### 2. **corpus-loader.ts** — Screenplay Library Management

Loads and caches the reference corpus in `data/screenplays/`.

**Key Functions:**

- `loadCorpusVectors(cacheDir?)` — Load all corpus vectors (with caching)
- `loadSingleVector(slug)` — Load one screenplay on-demand
- `getAvailableSlugs()` — Enumerate the corpus
- `getCacheStats()` — Check cache hit rate
- `clearCache()` — Force re-vectorization

**Corpus discovery (manifest-optional).** `manifest.json` is written only by
`scripts/convert-screenplays.ts`, which converts PDFs from a private local
source directory, and `data/` is gitignored, so no checkout has one. When the
manifest is absent the loader scans `data/screenplays/*.fountain` directly;
when it is present it wins, because it additionally records conversion errors
and zero-scene extractions that must be skipped. A missing corpus directory
yields an empty corpus, not an error. Before this fallback existed, both
`/api/nvm/analyze/compare` and `/api/nvm/analyze/corpus-stats` returned HTTP
500 (`ENOENT ... manifest.json`) on every install.

The repository ships 20 CC0, agent-authored Fountain scripts in
`data/screenplays/` (see `LICENSE-live-action.md` there). They are a working
corpus for this endpoint, not professionally-authored "real writing" in P1's
validation sense.

**Caching Strategy:**

Vectors are cached in `data/screenplays/.vectors/` as JSON files. A cached row
is reused only when its `contentHash` matches, it carries the
`wholeDraftAnalysisComplete` receipt, **and** it carries `ruleKeys`. The last
condition invalidates rows written before `ruleKeys` existed: without axis
labels there is no way to tell what a cached position meant, and the index
order is per-process.

### 3. **structural-genome.ts** — Pattern Extraction

Extracts high-level architectural patterns from vectors. **Not currently wired
into any route** — see "Structural genome" under Limitations.

**Key Functions:**

- `extractGenome(vector, records)` — Extract structural genome
- `findStructuralTemplate(query, corpus, recordsMap)` — Find best template
- `compareGenomes(draft, reference)` — Generate comparison report

**Genome Schema:**

```typescript
interface StructuralGenome {
  sourceTitle: string;
  actBreakPositions: number[];          // [25, 75] = 3-act at quarters
  reversalCount: number;                 // Major plot flips
  conflictEscalationPattern: 'linear' | 'exponential' | 'stair-step' | 'flat';
  characterArcShape: 'flat' | 'linear' | 'u-shape' | 'inverted-u';
  emotionalCurvature: number;            // [0, 1] variance in emotion
  dramaticTurnDensity?: number;          // Surprises per scene
  pacingProfile?: 'accelerating' | 'decelerating' | 'even';
}
```

## API Routes

### POST `/api/nvm/analyze/compare`

Compare a screenplay against the corpus.

**Request:**

```json
{
  "scriptText": "= My Screenplay\n\nINT. LOCATION - DAY\n\n..."
}
```

**Response** (a real response, captured from a keyless local server against the
shipped 20-script corpus; only the draft text differs from what you would send):

```json
{
  "vector": {
    "dimensions": 2,
    "metadata": {
      "title": "User Draft",
      "source": "generated",
      "contentHash": "073ca8f5c349c36c1d12d6ae31a602457058c02f1f2a623dd2aed76d49d35501",
      "sceneCount": 3,
      "wordCount": 60,
      "timestamp": "2026-08-24T06:59:15.752Z",
      "wholeDraftAnalysisComplete": true
    }
  },
  "nearestNeighbors": [
    { "title": "the-defense-rests", "similarity": 0.53, "sceneCount": 12, "wordCount": 963, "source": "corpus" },
    { "title": "code-blue",         "similarity": 0.42, "sceneCount": 14, "wordCount": 958, "source": "corpus" },
    { "title": "runoff",            "similarity": 0.38, "sceneCount": 9,  "wordCount": 1449, "source": "corpus" }
  ],
  "cluster": {
    "id": 1,
    "memberCount": 7,
    "clustermates": ["close-quarters", "code-blue", "counter-offer"]
  },
  "structuralTemplate": {
    "title": "the-defense-rests",
    "similarity": 0.53,
    "sceneCount": 12,
    "wordCount": 963,
    "source": "corpus",
    "genome": null,
    "genomeUnavailableReason": "Structural genome extraction needs per-scene records built from a StoryCommit ledger. The corpus cache stores vectors only, so no genome is measured for this match."
  },
  "corpus": { "size": 20, "clustered": true },
  "healthMetrics": {
    "sceneCount": 3,
    "wordCount": 60,
    "health": 53.3,
    "grade": "uneven"
  }
}
```

Notes on fields that are easy to misread:

- `vector.dimensions` is a **count**, not the vector. It is small for a short
  draft because few distinct rules fired, not because information was lost.
- `structuralTemplate.genome` is always `null` today, with
  `genomeUnavailableReason` saying why. It is not a placeholder for a number
  the server knows and is withholding; the server cannot compute it on this
  path at all (see Limitations).
- `corpus.size` is how many reference vectors the comparison actually ran
  against. `0` means no corpus is installed, which is the only honest reading
  of an empty `nearestNeighbors`.
- A draft the doctor could not analyze completely is refused with `422`
  (`error: "analysis_incomplete"`), never scored against the corpus.

### GET `/api/nvm/analyze/corpus-stats`

Get corpus statistics.

**Response** (real, same server and corpus as above):

```json
{
  "available": 20,
  "cached": 20,
  "hitRate": 100,
  "slugs": ["chain-of-custody", "close-quarters", "code-blue", "counter-offer", "dead-frequency", "high-voltage", "mise", "off-season", "quiet-season", "red-line"]
}
```

`slugs` is a preview of the first 10 only; `available` is the full count.

## Usage Examples

### Example 1: Find Similar Screenplays

```typescript
import { vectorizeScript, findNearestNeighbors } from './server/nvm/analyze/story-vector';
import { loadCorpusVectors } from './server/lib/corpus-loader';

// Load corpus (cached after first run)
const corpus = await loadCorpusVectors();

// Vectorize your draft
const myDraft = await vectorizeScript(fountainText, 'My Thriller', 'generated');

// Find 5 most similar screenplays
const neighbors = findNearestNeighbors(myDraft, corpus, 5);

for (const neighbor of neighbors) {
  console.log(`${neighbor.vector.metadata.title}: ${(neighbor.similarity * 100).toFixed(1)}% similar`);
}
```

**Output** (real, against the shipped 20-script corpus with the three-scene
draft used in the API example above):

```
the-defense-rests: 53.5% similar
code-blue: 42.3% similar
runoff: 37.8% similar
soft-launch: 34.4% similar
mise: 34.1% similar
```

### Example 2: Cluster the Corpus

```typescript
import { clusterCorpus } from './server/nvm/analyze/story-vector';
import { loadCorpusVectors } from './server/lib/corpus-loader';

const corpus = await loadCorpusVectors();

// Group into 5 structural families
const clusters = clusterCorpus(corpus, 5);

for (const cluster of clusters) {
  console.log(`\nCluster ${cluster.id} (${cluster.members.length} scripts):`);
  console.log(`  Inertia: ${cluster.inertia.toFixed(2)}`);
  console.log(`  Members: ${cluster.members.map(m => m.metadata.title).join(', ')}`);
}
```

**Output** (real, against the shipped 20-script corpus):

```
Cluster 0 (8 scripts):
  Inertia: 2.62
  Members: chain-of-custody, high-voltage, mise, room-12, soft-launch, the-key-under-the-mat, transfer-window, two-lane

Cluster 1 (8 scripts):
  Inertia: 3.16
  Members: close-quarters, code-blue, counter-offer, off-season, quiet-season, the-defense-rests, the-detour, undertow

Cluster 2 (1 scripts):
  Inertia: 0.00
  Members: same-page

Cluster 3 (2 scripts):
  Inertia: 0.48
  Members: dead-frequency, runoff

Cluster 4 (1 scripts):
  Inertia: 0.00
  Members: red-line
```

Two singleton clusters at k=5 over 20 short scripts is what the data actually
does here, not a sign of a bad run. Read the cluster shapes before reading
meaning into them.

### Example 3: Extract Structural Genome

> **Not reachable from any current entry point.** `extractGenome` needs
> `ScreenplaySceneRecord[]`, which `buildScreenplayMemory` derives from a
> `StoryCommit` op ledger. A Fountain draft pasted into an endpoint has no
> commit ledger, and the corpus cache stores vectors only, so neither side of a
> comparison can supply records. The code below runs only inside an NVM session
> that already has commits. The sample output that used to sit under it
> (`28%, 73%`, `4` reversals, `u-shape`, `68%`) was invented, not measured, and
> has been removed rather than replaced: there is no run to quote.

```typescript
import { vectorizeScript } from './server/nvm/analyze/story-vector';
import { extractGenome } from './server/nvm/analyze/structural-genome';
import { buildScreenplayMemory } from './server/nvm/screenplay/memory';
import { runScriptDoctor } from './server/nvm/analyze/doctor';

// Analyze screenplay
const report = await runScriptDoctor(fountainText);
const vector = await vectorizeScript(fountainText, 'My Script', 'generated');

// Build scene records (needed for genome extraction)
// In a real implementation, this would come from the full NVM pipeline
const records = buildScreenplayMemory(commits);

// Extract genome
const genome = extractGenome(vector, records);

console.log('Structural Genome:');
console.log(`  Act breaks at: ${genome.actBreakPositions.join('%, ')}%`);
console.log(`  Reversals: ${genome.reversalCount}`);
console.log(`  Escalation: ${genome.conflictEscalationPattern}`);
console.log(`  Character arc: ${genome.characterArcShape}`);
console.log(`  Emotional range: ${(genome.emotionalCurvature * 100).toFixed(0)}%`);
```

### Example 4: Compare Your Draft to a Template

> Same constraint as Example 3: `draftRecords` and `templateRecords` have no
> source on the corpus path. The comparison report below is the SHAPE
> `compareGenomes` emits, with placeholder values — it is not a captured run,
> and the corpus contains no `arrival-2016`.

```typescript
import { vectorizeScript, findNearestNeighbors } from './server/nvm/analyze/story-vector';
import { extractGenome, compareGenomes } from './server/nvm/analyze/structural-genome';
import { loadCorpusVectors } from './server/lib/corpus-loader';

// Load corpus and vectorize draft
const corpus = await loadCorpusVectors();
const draftVector = await vectorizeScript(draftText, 'My Draft', 'generated');

// Find best match
const neighbors = findNearestNeighbors(draftVector, corpus, 1);
const bestMatch = neighbors[0];

console.log(`Your thriller is ${(bestMatch.similarity * 100).toFixed(0)}% similar to ${bestMatch.vector.metadata.title}`);

// Compare genomes
const draftGenome = extractGenome(draftVector, draftRecords);
const templateGenome = extractGenome(bestMatch.vector, templateRecords);

const comparison = compareGenomes(draftGenome, templateGenome);
console.log('\n' + comparison);
```

**Output shape** (placeholder values, not a captured run):

```
Your thriller is NN% similar to <corpus-slug>

Structural Comparison: "My Draft" vs. "<corpus-slug>"

✓ Similar act structure (3 acts)
⚠ Fewer plot reversals: 2 vs. 4
⚠ Different escalation: linear vs. exponential
✓ Matching character arc: u-shape
✓ Similar emotional range (65%)
```

## Performance

Measured 2026-08-24 on the shipped 20-script corpus (short CC0 scripts, 434 to
1,831 words each), Node 22 on a single container. The figures this section used
to carry (30-60s per screenplay, 30-45 minutes for a full corpus, ~25KB per
vector from "3,216 floats") were estimates for a corpus of full-length features
that this repository does not contain; they were off by roughly three orders of
magnitude for what actually ships. Re-measure before quoting these against a
feature-length corpus.

### Initial Load (Cold Cache)

- Per screenplay: 21-145 ms (Script Doctor analysis; median ~40 ms)
- Full corpus (20 scripts): ~1.0 s total doctor time
- Full cold `POST /api/nvm/analyze/compare`, including vectorizing the draft,
  the whole corpus, neighbors and clustering: ~1.8 s

### Subsequent Loads (Warm Cache)

- Full warm `POST /api/nvm/analyze/compare`, same server process: ~35 ms
- A cold process against a warm cache returns byte-identical neighbors,
  similarities and cluster membership — that determinism is what `ruleKeys`
  plus `alignVectors` buys; before them the cached order was process-dependent

### Memory Usage

- One vector: dimension count × 8 bytes plus one string per dimension for
  `ruleKeys`. For this corpus that is a few hundred dimensions, not thousands
- Cache files (JSON, 20 scripts): a few hundred KB total

## Testing

```bash
# Story Vector + Structural Genome unit coverage
node --experimental-strip-types tests/core/story-vector.test.ts

# Route coverage, including the compare/corpus-stats success paths
node --experimental-strip-types tests/routes/nvm.test.ts
```

`tests/story-vector.test.ts` (repository root of `tests/`) is intentionally
empty and is not a runnable suite — it is a pointer left where a reader would
search for it. See its header.

**Test Coverage:**

- Vectorization (normalization, determinism, zero vector, lazy dimensionality)
- Dimension alignment (axis labels, zero-fill, norm preservation, refusal to guess on unlabeled vectors)
- Similarity (identical, orthogonal, partial overlap)
- Distance metrics (Euclidean, dimension mismatch)
- Nearest neighbors (ranking, k > n, draft-vectorized-before-corpus order)
- Clustering (k-means, determinism, inertia, mixed-length inputs without NaN)
- Genome extraction (act breaks, reversals, curvature)
- Genome comparison (similarity, differences)
- Routes: compare and corpus-stats success paths, plus the 400/422 rejections

## Limitations & Future Work

### Current Limitations

1. **Rule Index is Dynamic:** Dimensions are built lazily and per-process, and
   the append order depends on which script was vectorized first. `ruleKeys` +
   `alignVectors` make comparison correct in spite of this, and the corpus
   cache invalidates rows that predate `ruleKeys`. **Still open:** freeze the
   index to a versioned snapshot so a vector's length is stable and cached rows
   survive rule-set changes.

2. **Structural genome is not computed anywhere.** `extractGenome` needs
   `ScreenplaySceneRecord[]` from a `StoryCommit` ledger; the corpus cache
   stores vectors only and a pasted draft has no ledger. The compare route
   therefore returns `genome: null` with a reason. Until 2026-08-24 it instead
   returned five hardcoded constants that read as measurements.
   `structural-genome.ts` is consequently imported by no route today; it is
   kept and unit-tested, not deleted. **Solution:** cache records alongside
   vectors, or derive records from a Fountain parse.

3. **Simple Genome Heuristics:** Act break detection uses basic suspense
   discontinuities. **Solution:** multi-signal clustering (tension +
   relationship + location + turns).

4. **No frontend consumer.** Nothing under `src/` calls either endpoint
   (`grep -rn "analyze/compare\|corpus-stats" src/` returns nothing). The
   surface is API-only, which is how it stayed broken unnoticed.

5. **The shipped corpus is small and CC0.** 20 short agent-authored scripts.
   Similarity numbers against it are real, but they are not evidence about
   professionally-authored feature screenplays.

### Future Enhancements

- **PCA/t-SNE Visualization:** 2D projection of vector space for interactive exploration
- **Genre-Specific Clustering:** Separate clusters for thriller/drama/comedy structures
- **Genome Templates Library:** Pre-extracted genomes for all corpus scripts
- **Differential Analysis:** per-act comparison against different reference scripts
- **Temporal Alignment:** Compare pacing at matching % points (e.g., both at 50%)

## Technical Notes

### How many dimensions?

However many distinct `pass::rule` keys the current process has vectorized so
far — a running total, not a constant. This document previously stated the
count was fixed at 3,216, derived from "~100-300 rules per pass"; that was
never how the code worked. `RULE_INDEX` starts empty and grows per call, so the
same draft can yield a 2-dimensional vector alone and a several-hundred-
dimensional one after a corpus load. That is why every vector carries
`ruleKeys` and why comparison goes through `alignVectors`.

### Why L2-Normalization?

Cosine similarity (the natural metric for "do these scripts have similar structural issues?") requires unit-length vectors. L2-normalization (divide by Euclidean norm) achieves this. Without normalization, longer scripts would have higher dot products purely due to more total issues, not different structural patterns.

### Why K-Means over Hierarchical Clustering?

K-means is faster (O(n·k·d·i) vs O(n²·d)) and produces compact, spherical clusters, which match the geometry of normalized vectors in high-dimensional space. Hierarchical clustering would be preferred if we needed a full dendrogram, but for "find my cluster" queries, k-means suffices.

## License

Part of StoryMachine V1. See repository LICENSE for details.
