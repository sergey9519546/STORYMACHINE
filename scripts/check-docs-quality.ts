#!/usr/bin/env node
/**
 * Documentation Quality Checker
 * 
 * Scans markdown files for AI writing patterns using the avoid-ai-writing
 * Tier 1 detection rules. Runs as pre-commit hook to maintain doc quality.
 * 
 * Usage:
 *   node --experimental-strip-types scripts/check-docs-quality.ts [files...]
 *   npm run check-docs
 * 
 * Exit codes:
 *   0 = clean or warnings only
 *   1 = errors found (blocks commit in strict mode)
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

interface AIPattern {
  pattern: RegExp;
  category: string;
  severity: 'high' | 'medium' | 'low';
  replacement: string;
}

interface Finding {
  file: string;
  line: number;
  match: string;
  category: string;
  severity: 'high' | 'medium' | 'low';
  replacement: string;
}

// Tier 1 patterns from avoid-ai-writing (high-confidence)
// Focus on documentation context (not screenplay-specific)
const DOC_AI_PATTERNS: AIPattern[] = [
  // Copula avoidance
  { pattern: /\bserves as\b/gi, category: 'copula-avoidance', severity: 'high', replacement: 'is' },
  { pattern: /\bboasts\b/gi, category: 'copula-avoidance', severity: 'high', replacement: 'has' },
  
  // Unnecessary formality
  { pattern: /\bcommence(?:s|d|ing)?\b/gi, category: 'unnecessary-formality', severity: 'high', replacement: 'start/begin' },
  { pattern: /\butilize(?:s|d|ing)?\b/gi, category: 'unnecessary-formality', severity: 'high', replacement: 'use' },
  { pattern: /\bfacilitate(?:s|d|ing)?\b/gi, category: 'unnecessary-formality', severity: 'medium', replacement: 'help/enable' },
  
  // Metaphorical inflation
  { pattern: /\bdelve(?:s|d|ing)?\s+(?:into|in)\b/gi, category: 'metaphorical-inflation', severity: 'high', replacement: 'explore/examine' },
  { pattern: /\btapestry\s+of\b/gi, category: 'metaphorical-inflation', severity: 'high', replacement: '(describe specifically)' },
  { pattern: /\bembark(?:s|ed|ing)?\s+(?:on|upon)\b/gi, category: 'metaphorical-inflation', severity: 'high', replacement: 'start/begin' },
  
  // Generic intensifiers
  { pattern: /\brobust\b/gi, category: 'generic-intensifiers', severity: 'high', replacement: 'strong/solid' },
  { pattern: /\bcomprehensive\b/gi, category: 'generic-intensifiers', severity: 'high', replacement: 'thorough/complete' },
  { pattern: /\bseamless(?:ly)?\b/gi, category: 'generic-intensifiers', severity: 'high', replacement: 'smooth/easy' },
  { pattern: /\bholistic(?:ally)?\b/gi, category: 'generic-intensifiers', severity: 'high', replacement: 'complete/whole' },
  
  // Buzzwords & jargon
  { pattern: /\bparadigm\b/gi, category: 'buzzwords-jargon', severity: 'high', replacement: 'model/approach' },
  { pattern: /\bsynerg(?:y|ies)\b/gi, category: 'buzzwords-jargon', severity: 'high', replacement: 'cooperation' },
  { pattern: /\bleverage(?:s|d|ing)?\b/gi, category: 'buzzwords-jargon', severity: 'high', replacement: 'use' },
  { pattern: /\bactionable\b/gi, category: 'buzzwords-jargon', severity: 'high', replacement: 'practical/useful' },
  
  // Filler & clichés
  { pattern: /\bin\s+order\s+to\b/gi, category: 'filler-cliches', severity: 'high', replacement: 'to' },
  { pattern: /\bdue\s+to\s+the\s+fact\s+that\b/gi, category: 'filler-cliches', severity: 'high', replacement: 'because' },
  { pattern: /\bat\s+(?:its|his|her|their)\s+core\b/gi, category: 'filler-cliches', severity: 'high', replacement: 'essentially' },
  { pattern: /\bcutting[-\s]edge\b/gi, category: 'filler-cliches', severity: 'medium', replacement: 'advanced/latest' },
  { pattern: /\bgame[-\s]chang(?:er|ing)\b/gi, category: 'filler-cliches', severity: 'high', replacement: 'transformative' },
  
  // Vague complexity
  { pattern: /\b(?:intricacies|complexities)\s+of\b/gi, category: 'vague-complexity', severity: 'high', replacement: '(be specific)' },
  { pattern: /\bmyriad\s+(?:of\s+)?\w+/gi, category: 'vague-complexity', severity: 'medium', replacement: 'many/numerous' },
  { pattern: /\bplethora\s+of\b/gi, category: 'vague-complexity', severity: 'high', replacement: 'many/lots of' },
];

function scanFile(filePath: string): Finding[] {
  if (!existsSync(filePath)) {
    console.error(`Error: File not found: ${filePath}`);
    return [];
  }

  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const findings: Finding[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Skip code blocks (between ``` markers)
    if (line.trim().startsWith('```')) continue;
    
    for (const pattern of DOC_AI_PATTERNS) {
      const regex = new RegExp(pattern.pattern);
      const matches = line.match(regex);
      
      if (matches) {
        for (const match of matches) {
          findings.push({
            file: filePath,
            line: i + 1, // 1-indexed
            match,
            category: pattern.category,
            severity: pattern.severity,
            replacement: pattern.replacement,
          });
        }
      }
    }
  }

  return findings;
}

function groupByCategory(findings: Finding[]): Map<string, Finding[]> {
  const grouped = new Map<string, Finding[]>();
  
  for (const finding of findings) {
    const category = finding.category;
    if (!grouped.has(category)) {
      grouped.set(category, []);
    }
    grouped.get(category)!.push(finding);
  }
  
  return grouped;
}

function formatReport(findings: Finding[]): string {
  if (findings.length === 0) {
    return '✓ No AI writing patterns detected. Documentation is clean!';
  }

  const grouped = groupByCategory(findings);
  const highSeverity = findings.filter(f => f.severity === 'high').length;
  const mediumSeverity = findings.filter(f => f.severity === 'medium').length;
  const lowSeverity = findings.filter(f => f.severity === 'low').length;

  let report = '\n';
  report += '═══════════════════════════════════════════════════════════\n';
  report += '  Documentation Quality Check - AI Pattern Detection\n';
  report += '═══════════════════════════════════════════════════════════\n\n';
  report += `Found ${findings.length} potential AI writing patterns:\n`;
  report += `  • High severity: ${highSeverity}\n`;
  report += `  • Medium severity: ${mediumSeverity}\n`;
  report += `  • Low severity: ${lowSeverity}\n\n`;

  // Group by category
  for (const [category, categoryFindings] of grouped) {
    report += `\n▼ ${category.toUpperCase().replace(/-/g, ' ')} (${categoryFindings.length})\n`;
    report += '─'.repeat(60) + '\n';
    
    for (const finding of categoryFindings) {
      const severitySymbol = finding.severity === 'high' ? '⚠️' : finding.severity === 'medium' ? '⚡' : 'ℹ️';
      report += `${severitySymbol}  ${finding.file}:${finding.line}\n`;
      report += `   "${finding.match}" → ${finding.replacement}\n`;
    }
  }

  report += '\n';
  report += '═══════════════════════════════════════════════════════════\n';
  report += 'Recommendation: Review and fix high-severity patterns before commit.\n';
  report += '═══════════════════════════════════════════════════════════\n';

  return report;
}

function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log('Usage: node --experimental-strip-types scripts/check-docs-quality.ts [files...]');
    console.log('       npm run check-docs');
    console.log('');
    console.log('Scans markdown files for AI writing patterns.');
    console.log('');
    console.log('Options:');
    console.log('  --strict    Exit with code 1 if any high-severity patterns found');
    console.log('  --all       Scan all .md files in root and docs/');
    process.exit(0);
  }

  const strict = args.includes('--strict');
  const scanAll = args.includes('--all');
  
  let filesToScan: string[] = [];
  
  if (scanAll) {
    // Scan common documentation files
    const commonDocs = [
      'README.md',
      'ROADMAP.md',
      'NORTH_STAR.md',
      'ULTRAPLAN.md',
      'ARCHITECTURE.md',
      'AGENTS.md',
      'CLAUDE.md',
    ];
    filesToScan = commonDocs.filter(f => existsSync(f));
  } else {
    filesToScan = args.filter(arg => !arg.startsWith('--'));
  }

  if (filesToScan.length === 0) {
    console.log('No files to scan. Use --all or specify files.');
    process.exit(0);
  }

  let allFindings: Finding[] = [];
  
  for (const file of filesToScan) {
    const findings = scanFile(file);
    allFindings = allFindings.concat(findings);
  }

  console.log(formatReport(allFindings));

  // Exit code logic
  const highSeverityCount = allFindings.filter(f => f.severity === 'high').length;
  
  if (strict && highSeverityCount > 0) {
    console.error(`\n❌ BLOCKED: ${highSeverityCount} high-severity AI patterns found (strict mode)`);
    process.exit(1);
  }

  if (allFindings.length > 0) {
    console.log(`\n⚠️  WARNING: ${allFindings.length} AI patterns detected (non-blocking)`);
  }

  process.exit(0);
}

main();
