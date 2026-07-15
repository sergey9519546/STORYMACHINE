# Windows Task Scheduler Setup for STORYMACHINE Agent Scheduler

## Overview

This guide shows how to set up the STORYMACHINE agent scheduler on Windows using Task Scheduler, since Windows doesn't have native cron support.

## Prerequisites

- Windows 10/11 or Windows Server
- Node.js installed and in PATH
- STORYMACHINE project cloned and configured

## Method 1: PowerShell Script (Recommended)

### 1. Create the PowerShell setup script

Save this as `setup-windows-scheduler.ps1` in the `agent-scheduler` directory:

```powershell
# STORYMACHINE Agent Scheduler - Windows Task Scheduler Setup
# Run as Administrator

param(
    [string]$ProjectPath = "C:\Users\serge\OneDrive\Documents\MAIN_StoryMachine_Engine_Logic\STORYMACHINE V1 REPO\STORYMACHINE"
)

$TaskPrefix = "STORYMACHINE-Agent-"

# Task definitions matching the cron schedule
$tasks = @(
    @{
        Name = "${TaskPrefix}Progress-Tracker"
        Interval = "PT1H"  # Every 1 hour
        Agent = "progress-tracker"
        Priority = "Critical"
    },
    @{
        Name = "${TaskPrefix}Quality-Assurance"
        Interval = "PT2H"  # Every 2 hours
        Agent = "quality-assurance"
        Priority = "Critical"
    },
    @{
        Name = "${TaskPrefix}Integration"
        Interval = "P1D"   # Daily
        Agent = "integration"
        Priority = "Critical"
        Time = "00:00"
    },
    @{
        Name = "${TaskPrefix}Documentation"
        Interval = "PT3H"  # Every 3 hours
        Agent = "documentation"
        Priority = "High"
    },
    @{
        Name = "${TaskPrefix}Genre-Systems"
        Interval = "PT4H"  # Every 4 hours
        Agent = "genre-systems"
        Priority = "High"
    },
    @{
        Name = "${TaskPrefix}Character-Systems"
        Interval = "PT4H"  # Every 4 hours
        Agent = "character-systems"
        Priority = "High"
        Offset = 30  # Start at :30
    },
    @{
        Name = "${TaskPrefix}Dialogue-Systems"
        Interval = "PT6H"  # Every 6 hours
        Agent = "dialogue-systems"
        Priority = "High"
    },
    @{
        Name = "${TaskPrefix}Structure-Systems"
        Interval = "PT5H"  # Every 5 hours
        Agent = "structure-systems"
        Priority = "High"
    },
    @{
        Name = "${TaskPrefix}Cinematic-Systems"
        Interval = "PT5H"  # Every 5 hours
        Agent = "cinematic-systems"
        Priority = "Medium"
        Offset = 15  # Start at :15
    },
    @{
        Name = "${TaskPrefix}Audio-Systems"
        Interval = "PT8H"  # Every 8 hours
        Agent = "audio-systems"
        Priority = "Medium"
    },
    @{
        Name = "${TaskPrefix}Production-Systems"
        Interval = "PT6H"  # Every 6 hours
        Agent = "production-systems"
        Priority = "Medium"
        Offset = 30  # Start at :30
    },
    @{
        Name = "${TaskPrefix}Audience-Systems"
        Interval = "PT7H"  # Every 7 hours
        Agent = "audience-systems"
        Priority = "Medium"
    },
    @{
        Name = "${TaskPrefix}Cultural-Systems"
        Interval = "PT8H"  # Every 8 hours
        Agent = "cultural-systems"
        Priority = "Medium"
    },
    @{
        Name = "${TaskPrefix}Technical-Innovation"
        Interval = "PT10H"  # Every 10 hours
        Agent = "technical-innovation"
        Priority = "Medium"
    },
    @{
        Name = "${TaskPrefix}Distribution-Systems"
        Interval = "PT12H"  # Every 12 hours
        Agent = "distribution-systems"
        Priority = "Low"
    },
    @{
        Name = "${TaskPrefix}Format-Systems"
        Interval = "PT12H"  # Every 12 hours
        Agent = "format-systems"
        Priority = "Low"
        Offset = 30  # Start at :30
    }
)

Write-Host "🚀 Setting up STORYMACHINE Agent Scheduler for Windows" -ForegroundColor Green
Write-Host "📁 Project Path: $ProjectPath" -ForegroundColor Cyan

# Check if running as Administrator
$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host "❌ ERROR: This script must be run as Administrator" -ForegroundColor Red
    exit 1
}

# Create tasks
foreach ($task in $tasks) {
    Write-Host "`n📋 Creating task: $($task.Name)" -ForegroundColor Yellow
    
    $action = New-ScheduledTaskAction `
        -Execute "node" `
        -Argument "agent-scheduler/scheduler.js --agent $($task.Agent)" `
        -WorkingDirectory $ProjectPath
    
    # Set trigger based on interval
    if ($task.Interval -eq "P1D") {
        # Daily task
        $time = if ($task.Time) { $task.Time } else { "00:00" }
        $trigger = New-ScheduledTaskTrigger -Daily -At $time
    } else {
        # Repeating task
        $trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval $task.Interval
    }
    
    $settings = New-ScheduledTaskSettingsSet `
        -AllowStartIfOnBatteries `
        -DontStopIfGoingOnBatteries `
        -StartWhenAvailable `
        -RunOnlyIfNetworkAvailable `
        -MultipleInstances IgnoreNew
    
    # Set priority
    $priority = switch ($task.Priority) {
        "Critical" { 0 }
        "High" { 1 }
        "Medium" { 4 }
        "Low" { 7 }
        default { 4 }
    }
    
    # Register task
    try {
        Register-ScheduledTask `
            -TaskName $task.Name `
            -Action $action `
            -Trigger $trigger `
            -Settings $settings `
            -Force `
            -ErrorAction Stop
        
        Write-Host "  ✅ Created successfully" -ForegroundColor Green
    } catch {
        Write-Host "  ❌ Failed: $_" -ForegroundColor Red
    }
}

Write-Host "`n✅ Setup complete!" -ForegroundColor Green
Write-Host "`n📊 To view tasks:" -ForegroundColor Cyan
Write-Host "   Get-ScheduledTask | Where-Object {`$_.TaskName -like 'STORYMACHINE-Agent-*'}" -ForegroundColor White
Write-Host "`n🛑 To stop all tasks:" -ForegroundColor Cyan
Write-Host "   Get-ScheduledTask | Where-Object {`$_.TaskName -like 'STORYMACHINE-Agent-*'} | Disable-ScheduledTask" -ForegroundColor White
Write-Host "`n🗑️  To remove all tasks:" -ForegroundColor Cyan
Write-Host "   Get-ScheduledTask | Where-Object {`$_.TaskName -like 'STORYMACHINE-Agent-*'} | Unregister-ScheduledTask -Confirm:`$false" -ForegroundColor White
```

### 2. Run the setup script

Open PowerShell as Administrator and run:

```powershell
cd "C:\Users\serge\OneDrive\Documents\MAIN_StoryMachine_Engine_Logic\STORYMACHINE V1 REPO\STORYMACHINE\agent-scheduler"

# Enable script execution (if needed)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Run setup
.\setup-windows-scheduler.ps1
```

## Method 2: Manual Task Scheduler Setup

### 1. Open Task Scheduler

- Press `Win + R`
- Type `taskschd.msc`
- Press Enter

### 2. Create a Task

1. Click "Create Task" in the right panel
2. **General Tab**:
   - Name: `STORYMACHINE-Agent-Genre-Systems`
   - Description: `Implements Genre Systems every 4 hours`
   - Run whether user is logged on or not
   - Run with highest privileges

3. **Triggers Tab**:
   - Click "New"
   - Begin the task: "On a schedule"
   - Settings: "Daily"
   - Repeat task every: `4 hours`
   - For a duration of: "Indefinitely"
   - Click OK

4. **Actions Tab**:
   - Click "New"
   - Action: "Start a program"
   - Program/script: `node`
   - Add arguments: `agent-scheduler/scheduler.js --agent genre-systems`
   - Start in: `C:\Users\serge\OneDrive\Documents\MAIN_StoryMachine_Engine_Logic\STORYMACHINE V1 REPO\STORYMACHINE`
   - Click OK

5. **Conditions Tab**:
   - Uncheck "Start the task only if the computer is on AC power"
   - Check "Start the task only if the following network connection is available"

6. **Settings Tab**:
   - Check "Allow task to be run on demand"
   - Check "Run task as soon as possible after a scheduled start is missed"
   - If task fails, restart every: `5 minutes`, Attempt to restart up to: `3 times`
   - If the running task does not end when requested: "Stop the existing instance"

7. Click OK to save

### 3. Repeat for all agents

Create similar tasks for each agent with appropriate intervals:
- Progress Tracker: Every 1 hour
- Quality Assurance: Every 2 hours
- Documentation: Every 3 hours
- Genre Systems: Every 4 hours
- Character Systems: Every 4 hours
- etc.

## Method 3: Using WSL (Windows Subsystem for Linux)

If you have WSL installed:

```bash
# Open WSL terminal
wsl

# Navigate to project
cd /mnt/c/Users/serge/OneDrive/Documents/MAIN_StoryMachine_Engine_Logic/STORYMACHINE\ V1\ REPO/STORYMACHINE

# Install crontab
crontab agent-scheduler/crontab-schedule.txt

# Verify
crontab -l
```

## Management Commands

### View all STORYMACHINE tasks

```powershell
Get-ScheduledTask | Where-Object {$_.TaskName -like 'STORYMACHINE-Agent-*'} | Format-Table TaskName, State
```

### Start a specific task manually

```powershell
Start-ScheduledTask -TaskName "STORYMACHINE-Agent-Genre-Systems"
```

### Stop all tasks

```powershell
Get-ScheduledTask | Where-Object {$_.TaskName -like 'STORYMACHINE-Agent-*'} | Disable-ScheduledTask
```

### Start all tasks

```powershell
Get-ScheduledTask | Where-Object {$_.TaskName -like 'STORYMACHINE-Agent-*'} | Enable-ScheduledTask
```

### Remove all tasks

```powershell
Get-ScheduledTask | Where-Object {$_.TaskName -like 'STORYMACHINE-Agent-*'} | Unregister-ScheduledTask -Confirm:$false
```

### View task history

```powershell
Get-ScheduledTask -TaskName "STORYMACHINE-Agent-Genre-Systems" | Get-ScheduledTaskInfo
```

## Monitoring

### Check logs

```powershell
# View latest log
Get-Content agent-scheduler\logs\cron.log -Tail 50

# Monitor in real-time
Get-Content agent-scheduler\logs\cron.log -Wait
```

### Check progress

```powershell
# View progress
Get-Content agent-scheduler\progress-tracker.json | ConvertFrom-Json | Format-List

# Watch progress (updates every 5 seconds)
while ($true) {
    Clear-Host
    $progress = Get-Content agent-scheduler\progress-tracker.json | ConvertFrom-Json
    Write-Host "Systems: $($progress.meta.completed_systems)/$($progress.meta.total_systems) ($($progress.meta.percentage_complete)%)"
    Start-Sleep -Seconds 5
}
```

## Troubleshooting

### Tasks not running

1. Check if Node.js is in PATH:
   ```powershell
   node --version
   ```

2. Verify working directory is correct in task settings

3. Check task history for errors:
   ```powershell
   Get-WinEvent -LogName "Microsoft-Windows-TaskScheduler/Operational" -MaxEvents 50 | Where-Object {$_.Message -like "*STORYMACHINE*"}
   ```

### Permission issues

Run Task Scheduler as Administrator and ensure tasks are set to "Run with highest privileges"

### Node.js not found

Add Node.js to system PATH:
1. Open System Properties → Environment Variables
2. Edit "Path" variable
3. Add Node.js installation directory (e.g., `C:\Program Files\nodejs\`)

## Alternative: Run as Windows Service

For production deployments, consider running the scheduler as a Windows Service using [node-windows](https://github.com/coreybutler/node-windows):

```powershell
npm install -g node-windows

# Create service script (see agent-scheduler/windows-service.js)
node agent-scheduler/install-service.js
```

## Notes

- Windows Task Scheduler has a maximum of 4096 tasks per system
- Tasks may be delayed if system is under heavy load
- Consider using a dedicated server for 24/7 operation
- Backup `progress-tracker.json` regularly
- Monitor disk space for logs

## Support

For issues with Windows scheduling, check:
- Event Viewer → Windows Logs → Application
- Event Viewer → Applications and Services Logs → Microsoft → Windows → TaskScheduler → Operational
- agent-scheduler/logs/ directory
