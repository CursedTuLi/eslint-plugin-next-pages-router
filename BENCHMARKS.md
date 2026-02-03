# Benchmarks

This repo includes a synthetic benchmark that targets rule overhead, plus a
real-project mode that reuses an existing `pages/` directory. It can run in two
linting modes.

1. `single`: Lints one large file string. This isolates rule overhead.
2. `files`: Lints many files from disk. This includes file I/O and parsing.

## Quick Start

```bash
node scripts/benchmark.js
```

## Realistic Mode (Synthetic)

```bash
node scripts/benchmark.js --mode files --routes 5000 --files 200 --iterations 20 --suggest true --rules mixed
```

## Real Project Mode

Use an existing `pages/` directory to match the real route set:

```bash
node scripts/benchmark.js \
  --pages-dir "/absolute/path/to/pages" \
  --mode files \
  --files 80 \
  --statements 12000 \
  --iterations 50 \
  --warmup 2 \
  --suggest true \
  --rules mixed
```

## Suggestions Cost

```bash
node scripts/benchmark.js --mode files --routes 1000 --files 100 --iterations 20 --suggest false --rules mixed
node scripts/benchmark.js --mode files --routes 1000 --files 100 --iterations 20 --suggest true --rules mixed
```

## JSON Output

```bash
node scripts/benchmark.js --mode files --routes 1000 --files 100 --iterations 20 --suggest true --rules mixed --json true
```

## Options

| Option | Type | Default | Applies to | Description |
| --- | --- | --- | --- | --- |
| `--routes` | `number` | `400` | synthetic | Number of route folders to generate. |
| `--pages-dir` | `string` | `""` | real | Use an existing `pages/` directory instead of generating routes. |
| `--iterations` | `number` | `50` | both | Number of measured runs. |
| `--warmup` | `number` | `1` | both | Warmup runs before measuring. |
| `--suggest` | `boolean` | `false` | both | Enable route suggestions. |
| `--mode` | `single\|files` | `single` | both | Benchmark mode. |
| `--rules` | `compare\|navigation\|mixed` | `mixed` | both | Which rules to enable. |
| `--files` | `number` | `50` | files | Number of files when using `files` mode. |
| `--statements` | `number` | `routes*4` | both | Number of statements to generate. |
| `--navigation-ratio` | `number` | `0.3` | mixed | Ratio of navigation statements in mixed mode. |
| `--json` | `boolean` | `false` | both | Output JSON only. |

## Latest Results (2026-02-04)

All runs below used `--mode files --rules mixed --suggest true`. Results are
averaged over 5 runs.

| Scenario | Routes | Statements | Files | Avg | P95 |
| --- | --- | --- | --- | --- | --- |
| Synthetic (generated) | 6000 | 12000 | 80 | 2.49 ms | 3.41 ms |
| Real project pages dir | 46 | 12000 | 80 | 2.64 ms | 3.52 ms |

Commands used:

```bash
node scripts/benchmark.js --routes 3000 --statements 12000 --iterations 50 --warmup 2 --suggest true --mode files --files 80 --rules mixed
node scripts/benchmark.js --pages-dir "/absolute/path/to/pages" --statements 12000 --iterations 50 --warmup 2 --suggest true --mode files --files 80 --rules mixed

Run 5x and average:

```bash
node -e "const {execSync}=require('child_process');const runs=5;const cmd='node scripts/benchmark.js --routes 3000 --statements 12000 --iterations 50 --warmup 2 --suggest true --mode files --files 80 --rules mixed --json true';const results=[];for(let i=0;i<runs;i+=1){results.push(JSON.parse(execSync(cmd,{encoding:'utf8'})));}const avg=(arr,key)=>arr.reduce((s,r)=>s+r[key],0)/arr.length;const summary={runs,avgMs:avg(results,'avgMs'),p95Ms:avg(results,'p95Ms')};console.log(summary);"
```

Results vary by machine and workload. Compare relative changes, not absolute numbers.
```

## Notes

1. `files` mode is closer to real ESLint runs.
2. `single` mode is useful for tracking rule-only overhead.
3. Benchmarks vary by machine. Compare relative changes, not absolute numbers.
