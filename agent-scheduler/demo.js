#!/usr/bin/env node

/**
 * Quick Start Example for STORYMACHINE Agent Scheduler
 * Demonstrates basic usage and testing
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFile } from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function demonstrateBasicUsage() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🎬 STORYMACHINE Agent Scheduler - Quick Start Demo');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Example 1: Show basic concept
  console.log('📝 Example 1: Understanding the system\n');
  console.log('   The STORYMACHINE Agent Scheduler automates the implementation');
  console.log('   of 12,700 systems across 12 categories using cron-based scheduling.\n');
  
  console.log('   📊 Total Systems: 12,700');
  console.log('   🤖 Total Agents: 16 (12 implementation + 4 meta)');
  console.log('   ⏱️  Estimated Timeline: 88 days (24/7 operation)\n');

  console.log('─'.repeat(60) + '\n');

  // Example 2: Show scheduler configuration
  console.log('📝 Example 2: Scheduler Configuration\n');
  
  const configPath = join(__dirname, 'cron-config.json');
  const config = JSON.parse(await readFile(configPath, 'utf8'));
  
  console.log('📊 Agent Schedule Overview:\n');
  
  const byPriority = config.schedules.reduce((acc, schedule) => {
    if (!acc[schedule.priority]) acc[schedule.priority] = [];
    acc[schedule.priority].push(schedule);
    return acc;
  }, {});

  Object.entries(byPriority).forEach(([priority, schedules]) => {
    const icon = priority === 'critical' ? '🔴' : priority === 'high' ? '🟠' : priority === 'medium' ? '🟡' : '🟢';
    console.log(`   ${icon} ${priority.toUpperCase()}: ${schedules.length} agents`);
    schedules.slice(0, 3).forEach(s => {
      console.log(`      • ${s.name} - ${s.description.split(' - ')[1] || s.description}`);
    });
    if (schedules.length > 3) {
      console.log(`      ... and ${schedules.length - 3} more`);
    }
  });

  console.log('\n' + '─'.repeat(60) + '\n');

  // Example 3: Show category breakdown
  console.log('📝 Example 3: System Categories Breakdown\n');
  
  const progressPath = join(__dirname, 'progress-tracker.json');
  const progress = JSON.parse(await readFile(progressPath, 'utf8'));
  
  console.log('📊 12,700 Systems Distribution:\n');
  
  const sortedCategories = Object.entries(progress.categories)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 10);
  
  sortedCategories.forEach(([key, data]) => {
    const percentage = ((data.total / 12700) * 100).toFixed(1);
    const barLength = Math.floor(data.total / 150);
    const bar = '█'.repeat(barLength);
    const categoryName = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    console.log(`   ${data.total.toString().padStart(5)} (${percentage.padStart(4)}%) ${bar}`);
    console.log(`          ${categoryName}`);
  });

  console.log('\n' + '─'.repeat(60) + '\n');

  // Example 4: Show cron schedules
  console.log('📝 Example 4: Cron Schedule Patterns\n');
  
  const scheduleExamples = config.schedules.slice(0, 8);
  console.log('⏰ Agent Execution Schedule:\n');
  
  scheduleExamples.forEach(schedule => {
    const interval = schedule.cron.includes('*/') 
      ? schedule.cron.split(' ')[1].replace('*/', '') + ' hours'
      : 'Daily';
    console.log(`   ${schedule.name.padEnd(35)} ${schedule.cron.padEnd(15)} (${interval})`);
  });

  console.log('\n' + '─'.repeat(60) + '\n');

  // Example 5: Show timeline projections
  console.log('📝 Example 5: Implementation Timeline\n');
  
  const systemsPerDay = 144; // Based on cron schedule
  
  const milestones = [
    { name: 'Tier 1 - Essential', systems: 200, percentage: 1.5 },
    { name: 'Tier 2 - Professional', systems: 800, percentage: 6.0 },
    { name: 'Tier 3 - Industry', systems: 3000, percentage: 24.0 },
    { name: 'Tier 4 - Complete', systems: 12700, percentage: 100.0 }
  ];

  console.log('📅 Estimated Timeline (with 90% success rate):\n');
  
  milestones.forEach((milestone, idx) => {
    const days = Math.ceil(milestone.systems / systemsPerDay);
    const months = (days / 30).toFixed(1);
    const years = (days / 365).toFixed(1);
    
    let timeStr = days < 30 ? `${days} days` : 
                  days < 365 ? `${months} months` : 
                  `${years} years`;
    
    const emoji = idx === 0 ? '🎯' : idx === 1 ? '🚀' : idx === 2 ? '🏭' : '🏆';
    console.log(`   ${emoji} ${milestone.name.padEnd(30)} ${String(milestone.systems).padStart(6)} systems → ${timeStr.padStart(10)}`);
  });

  console.log('\n' + '─'.repeat(60) + '\n');

  // Example 6: Quick start commands
  console.log('📝 Example 6: Getting Started\n');
  
  console.log('🚀 Start the full scheduler:\n');
  console.log('   $ node agent-scheduler/scheduler.js\n');
  
  console.log('🧪 Run this demo:\n');
  console.log('   $ node agent-scheduler/demo.js\n');
  
  console.log('🔧 Implement a single system:\n');
  console.log('   $ node agent-scheduler/implementation-agent.js genre_systems_1 "Genre Systems"\n');
  
  console.log('📊 View current progress:\n');
  console.log('   $ cat agent-scheduler/progress-tracker.json\n');
  
  console.log('🛑 Emergency stop:\n');
  console.log('   $ touch agent-scheduler/.emergency-stop\n');
  
  console.log('💻 Windows users:\n');
  console.log('   See agent-scheduler/WINDOWS-SETUP.md for Task Scheduler setup\n');

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('✅ Demo Complete!');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Show file structure
  console.log('📁 Agent Scheduler File Structure:\n');
  console.log('   agent-scheduler/');
  console.log('   ├── cron-config.json          # Agent schedules and settings');
  console.log('   ├── progress-tracker.json     # Real-time progress tracking');
  console.log('   ├── scheduler.js              # Main scheduler orchestrator');
  console.log('   ├── implementation-agent.js   # System implementation template');
  console.log('   ├── demo.js                   # This demo file');
  console.log('   ├── package.json              # NPM configuration');
  console.log('   ├── README.md                 # Full documentation');
  console.log('   ├── WINDOWS-SETUP.md          # Windows Task Scheduler guide');
  console.log('   ├── crontab-schedule.txt      # Unix/Linux crontab file');
  console.log('   ├── logs/                     # Agent execution logs');
  console.log('   └── state/                    # State management files\n');

  console.log('📚 Next Steps:\n');
  console.log('   1. Review the configuration in cron-config.json');
  console.log('   2. Customize agent schedules and priorities as needed');
  console.log('   3. Set up actual AI agent integration in scheduler.js');
  console.log('   4. Start the scheduler to begin automated implementation');
  console.log('   5. Monitor progress in progress-tracker.json\n');

  console.log('💡 Pro Tips:\n');
  console.log('   • Adjust systems_per_run to control throughput');
  console.log('   • Use priority levels to focus on critical systems first');
  console.log('   • Enable caching for frequently accessed systems');
  console.log('   • Set up notifications via webhook for important events');
  console.log('   • Run QA agent regularly to maintain quality standards\n');
}

// Run demo
demonstrateBasicUsage()
  .then(() => {
    console.log('👋 Ready to implement 12,700 systems! Good luck!\n');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Demo error:', error);
    process.exit(1);
  });
