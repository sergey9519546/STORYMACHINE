---
type: owner
updated: 2026-09-05
sources: [docs/UNIFIED_STATE_2026-09-02.md]
status: active
---

# Owner Item — Push the Release Tag, Delete the Stale One

**Why only the owner:** pushing a tag requires write access to the remote
that this session's git proxy blocks; deleting the stale remote `v1.0.0`
tag requires the same remote-write access.

**What's pending:** the `v1.0.0-rc.1` tag exists locally but has not
reached the remote. The stale `v1.0.0` remote tag points at an unrelated
old commit with no GitHub Release behind it.

**The command:**
```
git push origin v1.0.0-rc.1
git push origin --delete v1.0.0
```

## Sources

- `docs/UNIFIED_STATE_2026-09-02.md` §3 ("the stale v1.0.0 remote tag"), §4 item 4
