#!/usr/bin/env node

/**
 * STORYMACHINE Agent Scheduler
 * Orchestrates automated system implementation across 12,700 systems
 */

const fs = require('fs').promises;
const path = require('path');
const { spawn } = require('child_process');

class AgentScheduler {
  constructor() {
    this.configPath = path.join(__dirname, 'cron-config.json');
    this.progressPath = path.join(__dirname, 'progress-tracker.json');
    this.logsDir = path.join(__dirname, 'logs');
    this.stateDir = path.join(__dirname, 'state');
    this.emergencyStopFile = path.join(__dirname, '.emergency-stop');
    this.activeAgents = new Map();
  }

  async init() {
    // Ensure directories exist
    await fs.mkdir(this.logsDir, { recursive: true });
    await fs.mkdir(this.stateDir, { recursive: true });
    
    console.log('🚀 STORYMACHINE Agent Scheduler initialized');
    console.log(`📁 Logs: ${this.logsDir}`);
    console.log(`📊 Progress: ${this.progressPath}`);
  }

  async loadConfig() {
    const data = await fs.readFile(this.configPath, 'utf8');
    return JSON.parse(data);
  }

  async loadProgress() {
    try {
      const data = await fs.readFile(this.progressPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      // Initialize if doesn't exist
      return this.initializeProgress();
    }
  }

  async saveProgress(progress) {
    await fs.writeFile(
      this.progressPath,
      JSON.stringify(progress, null, 2),
      'utf8'
    );
  }

  async checkEmergencyStop() {
    try {
      await fs.access(this.emergencyStopFile);
      return true;
    } catch {
      return false;
    }
  }

  async getNextSystemToImplement(category, progress) {
    const categoryKey = this.getCategoryKey(category);
    const categoryProgress = progress.categories[categoryKey];
    
    if (!categoryProgress) {
      return null;
    }

    const nextSystemId = categoryProgress.completed + categoryProgress.in_progress + 1;
    
    if (nextSystemId > categoryProgress.total) {
      return null; // Category complete
    }

    return {
      id: `${categoryKey}_${nextSystemId}`,
      category: category,
      number: nextSystemId,
      total: categoryProgress.total
    };
  }

  getCategoryKey(categoryName) {
    return categoryName.toLowerCase().replace(/\s+/g, '_');
  }

  async runAgent(schedule, config, progress) {
    const agentName = schedule.name;
    
    if (this.activeAgents.has(agentName)) {
      console.log(`⏳ Agent ${agentName} already running, skipping...`);
      return;
    }

    if (await this.checkEmergencyStop()) {
      console.log('🛑 Emergency stop detected, halting all agents');
      return;
    }

    console.log(`\n🤖 Starting agent: ${agentName}`);
    console.log(`📋 Category: ${schedule.category}`);
    console.log(`🎯 Systems per run: ${schedule.systems_per_run}`);

    const timestamp = new Date().toISOString();
    const logFile = path.join(
      this.logsDir,
      `${agentName}_${timestamp.replace(/:/g, '-')}.log`
    );

    try {
      this.activeAgents.set(agentName, { startTime: Date.now(), logFile });

      // Get systems to implement
      const systems = [];
      for (let i = 0; i < schedule.systems_per_run; i++) {
        const system = await this.getNextSystemToImplement(schedule.category, progress);
        if (system) {
          systems.push(system);
        }
      }

      if (systems.length === 0) {
        console.log(`✅ Category ${schedule.category} complete!`);
        return;
      }

      // Execute agent implementation
      await this.executeImplementation(schedule, systems, logFile, progress);

      // Update progress
      await this.updateProgress(schedule, systems.length, progress, true);

      console.log(`✅ Agent ${agentName} completed successfully`);
      
    } catch (error) {
      console.error(`❌ Agent ${agentName} failed:`, error.message);
      await this.updateProgress(schedule, 0, progress, false);
    } finally {
      this.activeAgents.delete(agentName);
    }
  }

  async executeImplementation(schedule, systems, logFile, progress) {
    const log = [];
    log.push(`Agent: ${schedule.name}`);
    log.push(`Timestamp: ${new Date().toISOString()}`);
    log.push(`Category: ${schedule.category}`);
    log.push(`Systems to implement: ${systems.length}`);
    log.push('---\n');

    for (const system of systems) {
      log.push(`\nImplementing: ${system.id}`);
      log.push(`  Category: ${system.category}`);
      log.push(`  Progress: ${system.number}/${system.total}`);
      
      // Mark as in-progress
      const categoryKey = this.getCategoryKey(schedule.category);
      progress.categories[categoryKey].in_progress++;
      await this.saveProgress(progress);

      // Simulate implementation (replace with actual agent call)
      const success = await this.implementSystem(system, schedule.agent_type);
      
      if (success) {
        log.push(`  Status: ✅ SUCCESS`);
        progress.categories[categoryKey].in_progress--;
        progress.categories[categoryKey].completed++;
        progress.meta.completed_systems++;
      } else {
        log.push(`  Status: ❌ FAILED`);
        progress.categories[categoryKey].in_progress--;
      }

      await this.saveProgress(progress);
    }

    // Save log
    await fs.writeFile(logFile, log.join('\n'), 'utf8');
  }

  async implementSystem(system, agentType) {
    // This is where you'd call your actual AI agents
    // For now, simulate with a delay
    return new Promise((resolve) => {
      setTimeout(() => {
        // 90% success rate simulation
        resolve(Math.random() > 0.1);
      }, 100);
    });
  }

  async updateProgress(schedule, systemsProcessed, progress, success) {
    progress.meta.last_updated = new Date().toISOString();
    
    // Update category percentage
    const categoryKey = this.getCategoryKey(schedule.category);
    if (progress.categories[categoryKey]) {
      const category = progress.categories[categoryKey];
      category.remaining = category.total - category.completed;
      category.percentage = ((category.completed / category.total) * 100).toFixed(2);
    }

    // Update overall percentage
    progress.meta.percentage_complete = (
      (progress.meta.completed_systems / progress.meta.total_systems) * 100
    ).toFixed(2);

    // Update agent statistics
    progress.agent_statistics.total_runs++;
    if (success) {
      progress.agent_statistics.successful_runs++;
    } else {
      progress.agent_statistics.failed_runs++;
    }

    await this.saveProgress(progress);
  }

  parseCron(cronExpression) {
    // Simple cron parser - returns milliseconds until next run
    // For production, use a proper cron parser library
    const parts = cronExpression.split(' ');
    
    // Extract hour interval from patterns like "0 */4 * * *"
    if (parts[1].startsWith('*/')) {
      const hours = parseInt(parts[1].substring(2));
      return hours * 60 * 60 * 1000;
    }
    
    // Default to 1 hour
    return 60 * 60 * 1000;
  }

  async scheduleAgent(schedule, config) {
    const interval = this.parseCron(schedule.cron);
    
    console.log(`⏰ Scheduled: ${schedule.name}`);
    console.log(`   Cron: ${schedule.cron} (every ${interval / 1000 / 60} minutes)`);
    console.log(`   Priority: ${schedule.priority}`);

    // Run immediately
    const progress = await this.loadProgress();
    await this.runAgent(schedule, config, progress);

    // Then schedule recurring runs
    setInterval(async () => {
      const progress = await this.loadProgress();
      await this.runAgent(schedule, config, progress);
    }, interval);
  }

  async start() {
    await this.init();
    
    const config = await this.loadConfig();
    console.log(`\n📊 Loaded configuration: ${config.schedules.length} agents`);
    
    // Sort by priority
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    const sortedSchedules = config.schedules.sort((a, b) => {
      return (priorityOrder[a.priority] || 4) - (priorityOrder[b.priority] || 4);
    });

    console.log('\n🎯 AGENT SCHEDULE:');
    console.log('==================\n');
    
    // Schedule all agents
    for (const schedule of sortedSchedules) {
      await this.scheduleAgent(schedule, config);
    }

    console.log('\n✅ All agents scheduled!');
    console.log('📈 Monitoring progress...\n');
    console.log('Press Ctrl+C to stop (or create .emergency-stop file)');
    
    // Monitor progress
    this.startProgressMonitor();
  }

  startProgressMonitor() {
    setInterval(async () => {
      const progress = await this.loadProgress();
      
      console.log('\n' + '='.repeat(60));
      console.log('📊 PROGRESS REPORT');
      console.log('='.repeat(60));
      console.log(`Total: ${progress.meta.completed_systems}/${progress.meta.total_systems} (${progress.meta.percentage_complete}%)`);
      console.log(`Active agents: ${this.activeAgents.size}`);
      console.log(`Success rate: ${(progress.agent_statistics.successful_runs / Math.max(1, progress.agent_statistics.total_runs) * 100).toFixed(1)}%`);
      console.log('='.repeat(60) + '\n');
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  async stop() {
    console.log('\n🛑 Stopping scheduler...');
    await fs.writeFile(this.emergencyStopFile, 'STOP', 'utf8');
    console.log('✅ Emergency stop file created');
    process.exit(0);
  }
}

// Run scheduler
if (require.main === module) {
  const scheduler = new AgentScheduler();
  
  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    await scheduler.stop();
  });
  
  process.on('SIGTERM', async () => {
    await scheduler.stop();
  });
  
  scheduler.start().catch(error => {
    console.error('❌ Scheduler error:', error);
    process.exit(1);
  });
}

module.exports = AgentScheduler;
