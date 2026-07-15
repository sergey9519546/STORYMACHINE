# Agent Scheduler for 12,700 Systems Implementation

## Overview

This directory contains the automated agent scheduling system for implementing the STORYMACHINE 12,700 systems catalog. The system uses cron-like scheduling to orchestrate multiple AI agents working concurrently on different system categories.

## Architecture

```
agent-scheduler/
├── cron-config.json          # Agent schedules and configuration
├── progress-tracker.json     # Real-time progress tracking
├── scheduler.js              # Main scheduler orchestrator
├── logs/                     # Agent execution logs
├── state/                    # State management files
└── .emergency-stop          # Emergency stop trigger file
```

## Quick Start

### 1. Install Dependencies (if needed)

```bash
npm install
```

### 2. Start the Scheduler

```bash
node agent-scheduler/scheduler.js
```

### 3. Monitor Progress

Progress is automatically tracked in `progress-tracker.json` and displayed in the console every 5 minutes.

### 4. Emergency Stop

Create an emergency stop file or press Ctrl+C:

```bash
touch agent-scheduler/.emergency-stop
```

## Configuration

### Cron Config (`cron-config.json`)

The configuration file defines 16 agents across 13 categories:

**Implementation Agents:**
- **genre-systems-agent**: Every 4 hours - 5 systems/run (3,000 total)
- **character-systems-agent**: Every 4 hours - 4 systems/run (2,000 total)
- **dialogue-systems-agent**: Every 6 hours - 3 systems/run (1,200 total)
- **structure-systems-agent**: Every 5 hours - 4 systems/run (1,500 total)
- **cinematic-systems-agent**: Every 5 hours - 4 systems/run (1,800 total)
- **audio-systems-agent**: Every 8 hours - 2 systems/run (800 total)
- **production-systems-agent**: Every 6 hours - 3 systems/run (1,200 total)
- **audience-systems-agent**: Every 7 hours - 3 systems/run (1,000 total)
- **distribution-systems-agent**: Every 12 hours - 2 systems/run (500 total)
- **format-systems-agent**: Every 12 hours - 2 systems/run (400 total)
- **cultural-systems-agent**: Every 8 hours - 2 systems/run (800 total)
- **technical-innovation-agent**: Every 10 hours - 2 systems/run (500 total)

**Meta Agents:**
- **progress-tracker-agent**: Every hour - Tracks progress
- **quality-assurance-agent**: Every 2 hours - Reviews 10 systems
- **integration-agent**: Daily - Integrates completed systems
- **documentation-agent**: Every 3 hours - Documents 5 systems

### Priority Levels

- **Critical**: Meta agents (monitoring, QA, integration)
- **High**: Core systems (genre, character, dialogue, structure)
- **Medium**: Production systems (cinematic, audio, production, audience)
- **Low**: Supplementary systems (distribution, format, additional)

## Implementation Tiers

Based on the MEGA_CATALOG, the project is divided into 4 tiers:

1. **Tier 1 - Essential** (200 systems, 1.5%)
   - Target: 6 months
   - Focus: Core functionality

2. **Tier 2 - Professional** (800 systems, 6%)
   - Target: 2 years
   - Focus: Production-ready features

3. **Tier 3 - Industry** (3,000 systems, 24%)
   - Target: 9 years
   - Focus: Industry-standard completeness

4. **Tier 4 - Complete** (12,700 systems, 100%)
   - Target: 30-50 years
   - Focus: Theoretical maximum

## Progress Tracking

### View Current Progress

```bash
cat agent-scheduler/progress-tracker.json | jq '.meta'
```

### Category Breakdown

```bash
cat agent-scheduler/progress-tracker.json | jq '.categories'
```

### Agent Statistics

```bash
cat agent-scheduler/progress-tracker.json | jq '.agent_statistics'
```

## Cron Schedule Reference

### Cron Expression Format

```
┌───────────── minute (0 - 59)
│ ┌───────────── hour (0 - 23)
│ │ ┌───────────── day of month (1 - 31)
│ │ │ ┌───────────── month (1 - 12)
│ │ │ │ ┌───────────── day of week (0 - 6) (Sunday to Saturday)
│ │ │ │ │
* * * * *
```

### Examples Used

- `0 */4 * * *` - Every 4 hours on the hour
- `30 */4 * * *` - Every 4 hours at :30
- `0 */6 * * *` - Every 6 hours
- `0 0 * * *` - Daily at midnight
- `0 */1 * * *` - Every hour

## Customization

### Adding a New Agent

Edit `cron-config.json` and add to the `schedules` array:

```json
{
  "name": "new-system-agent",
  "category": "New Systems",
  "target_systems": 500,
  "cron": "0 */5 * * *",
  "description": "Every 5 hours - New system implementation",
  "priority": "medium",
  "systems_per_run": 3,
  "agent_type": "implementation",
  "subcategories": ["Sub1", "Sub2"]
}
```

### Adjusting Agent Frequency

Modify the `cron` field:
- More frequent: `0 */2 * * *` (every 2 hours)
- Less frequent: `0 */12 * * *` (every 12 hours)

### Changing Systems Per Run

Modify the `systems_per_run` field to increase/decrease throughput.

## Global Settings

```json
{
  "max_concurrent_agents": 4,        // Max parallel agents
  "retry_on_failure": true,          // Retry failed systems
  "max_retries": 3,                  // Max retry attempts
  "log_directory": "./logs",         // Log storage
  "state_file": "./state/progress.json",
  "notification_webhook": null,      // Optional webhooks
  "emergency_stop_file": "./.emergency-stop"
}
```

## Logs

Agent logs are stored in `agent-scheduler/logs/` with format:

```
{agent-name}_{timestamp}.log
```

Example:
```
genre-systems-agent_2026-07-15T10-30-00.000Z.log
```

## Integration with AI Agents

The `implementSystem()` function in `scheduler.js` is where you integrate your actual AI agents:

```javascript
async implementSystem(system, agentType) {
  // Replace with actual agent call
  // Example: await callAIAgent(system, agentType);
  
  // Current: simulated implementation
  return new Promise((resolve) => {
    setTimeout(() => resolve(Math.random() > 0.1), 100);
  });
}
```

### Suggested Integration Points

1. **ZCode Skills**: Call specific skills for each system type
2. **API Endpoints**: Hit your STORYMACHINE API for generation
3. **External AI**: Use Claude, GPT, or other AI services
4. **Hybrid**: Combine multiple approaches

## Monitoring & Alerts

### Real-time Monitoring

The scheduler outputs progress reports every 5 minutes:

```
============================================================
📊 PROGRESS REPORT
============================================================
Total: 145/12700 (1.14%)
Active agents: 3
Success rate: 92.5%
============================================================
```

### Add Webhook Notifications

Set `notification_webhook` in `cron-config.json`:

```json
{
  "global_settings": {
    "notification_webhook": "https://your-webhook.com/notify"
  }
}
```

## Performance Estimates

Based on current configuration:

- **Systems per day**: ~144 systems (assuming 90% success rate)
- **Time to Tier 1**: ~1.4 days (200 systems)
- **Time to Tier 2**: ~5.5 days (800 systems)
- **Time to Tier 3**: ~21 days (3,000 systems)
- **Time to complete**: ~88 days (12,700 systems) with 24/7 operation

**Note**: This assumes automated agents can successfully implement systems. Actual timeline depends on implementation complexity and quality requirements.

## Troubleshooting

### Scheduler Won't Start

```bash
# Check Node version (requires Node 16+)
node --version

# Check file permissions
ls -la agent-scheduler/
```

### Agents Not Running

```bash
# Check emergency stop file
rm agent-scheduler/.emergency-stop

# Check logs
tail -f agent-scheduler/logs/*.log
```

### Progress Not Updating

```bash
# Validate JSON
cat agent-scheduler/progress-tracker.json | jq .

# Check write permissions
ls -la agent-scheduler/progress-tracker.json
```

## Roadmap Integration

This scheduler aligns with `ROADMAP.md` priorities:

1. **P0**: Validate with real writers (manual oversight)
2. **P1**: Real script discrimination (QA agent verification)
3. **P2**: Surface collapse (integration agent)
4. **P3**: Coverage report (documentation agent)
5. **P4**: Retention & defensibility (all systems)

## Future Enhancements

- [ ] Web dashboard for monitoring
- [ ] Slack/Discord notifications
- [ ] Dynamic priority adjustment based on demand
- [ ] A/B testing for system implementations
- [ ] Automatic rollback on quality regression
- [ ] Distributed agent execution across multiple machines
- [ ] GPU-accelerated system generation
- [ ] Real-time collaboration between agents

## License

Part of STORYMACHINE V1 - See main project LICENSE

---

**Created**: 2026-07-15  
**Last Updated**: 2026-07-15  
**Status**: Operational  
**Systems Completed**: 0/12,700 (0%)
