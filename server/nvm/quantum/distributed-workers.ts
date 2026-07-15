// Distributed Worker Architecture — Parallel Processing for 100K States
//
// Implements worker pool with load balancing to validate and process state
// clusters in parallel. Each worker is assigned a set of clusters and operates
// independently, enabling horizontal scaling.
//
// Architecture:
// - WorkerPool: Manages worker lifecycle and load balancing
// - QuantumWorker: Validates and processes assigned clusters
// - TaskQueue: Distributes work across workers with priority
//
// Performance target: Process 100K states across 10 workers in <10s

import type { QuantumStoryState, ValidationResult } from './types.ts';
import type { StateCluster } from './hierarchical-clustering.ts';
import { Worker } from 'node:worker_threads';
import { EventEmitter } from 'node:events';

// ── Type Definitions ──────────────────────────────────────────────────────────

export interface WorkerConfig {
  maxWorkers: number;              // Default: 10
  batchSize: number;               // States per batch (default: 100)
  validationTimeout: number;       // Milliseconds (default: 5000)
  enableRetry: boolean;            // Retry failed validations (default: true)
  maxRetries: number;              // Max retry attempts (default: 3)
}

export interface WorkerTask {
  taskId: string;
  type: 'VALIDATE_CLUSTER' | 'PROCESS_STATES' | 'COMPUTE_METRICS';
  priority: 'high' | 'medium' | 'low';
  data: {
    cluster?: StateCluster;
    states?: QuantumStoryState[];
    options?: any;
  };
  createdAt: number;
  retryCount: number;
}

export interface WorkerResult {
  taskId: string;
  workerId: string;
  success: boolean;
  data?: any;
  error?: string;
  executionTimeMs: number;
  completedAt: number;
}

export interface WorkerStats {
  workerId: string;
  tasksCompleted: number;
  tasksFailed: number;
  avgExecutionTimeMs: number;
  currentLoad: number;           // 0-1, current CPU usage
  assignedClusters: string[];
  uptime: number;                // Milliseconds
}

export interface WorkerPoolStats {
  totalWorkers: number;
  activeWorkers: number;
  idleWorkers: number;
  totalTasksCompleted: number;
  totalTasksFailed: number;
  avgTaskTimeMs: number;
  queueSize: number;
  throughput: number;            // Tasks per second
}

// ── Quantum Worker ───────────────────────────────────────────────────────────

export class QuantumWorker extends EventEmitter {
  public readonly workerId: string;
  private assignedClusters: Set<string> = new Set();
  private stats: WorkerStats;
  private isActive: boolean = true;
  private currentTask: WorkerTask | null = null;
  
  constructor(workerId: string) {
    super();
    this.workerId = workerId;
    this.stats = {
      workerId,
      tasksCompleted: 0,
      tasksFailed: 0,
      avgExecutionTimeMs: 0,
      currentLoad: 0,
      assignedClusters: [],
      uptime: 0,
    };
  }
  
  // ── Task Execution ────────────────────────────────────────────────────────────
  
  /**
   * Execute a task assigned to this worker
   */
  async executeTask(task: WorkerTask): Promise<WorkerResult> {
    if (!this.isActive) {
      throw new Error(`Worker ${this.workerId} is not active`);
    }
    
    this.currentTask = task;
    this.stats.currentLoad = 1.0;
    
    const startTime = Date.now();
    let result: WorkerResult;
    
    try {
      let data: any;
      
      switch (task.type) {
        case 'VALIDATE_CLUSTER':
          data = await this.validateCluster(task.data.cluster!);
          break;
        case 'PROCESS_STATES':
          data = await this.processStates(task.data.states!);
          break;
        case 'COMPUTE_METRICS':
          data = await this.computeMetrics(task.data.states!);
          break;
        default:
          throw new Error(`Unknown task type: ${task.type}`);
      }
      
      const executionTimeMs = Date.now() - startTime;
      
      result = {
        taskId: task.taskId,
        workerId: this.workerId,
        success: true,
        data,
        executionTimeMs,
        completedAt: Date.now(),
      };
      
      this.stats.tasksCompleted++;
      this.updateAvgExecutionTime(executionTimeMs);
      
    } catch (error) {
      const executionTimeMs = Date.now() - startTime;
      
      result = {
        taskId: task.taskId,
        workerId: this.workerId,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executionTimeMs,
        completedAt: Date.now(),
      };
      
      this.stats.tasksFailed++;
    } finally {
      this.currentTask = null;
      this.stats.currentLoad = 0;
    }
    
    this.emit('taskComplete', result);
    return result;
  }
  
  /**
   * Validate all states in a cluster
   */
  private async validateCluster(cluster: StateCluster): Promise<ValidationResult[]> {
    const validationResults: ValidationResult[] = [];
    
    // Batch validation for efficiency
    const stateIds = Array.from(cluster.states);
    
    for (const stateId of stateIds) {
      // Simulate validation (would integrate with Trinity Gate)
      const validation = await this.validateState(stateId);
      validationResults.push(validation);
    }
    
    return validationResults;
  }
  
  /**
   * Process states (probability updates, pruning decisions)
   */
  private async processStates(states: QuantumStoryState[]): Promise<{
    processed: number;
    updated: string[];
    pruned: string[];
  }> {
    const updated: string[] = [];
    const pruned: string[] = [];
    
    for (const state of states) {
      // Process each state
      if (state.probability < 0.01) {
        pruned.push(state.stateId);
      } else {
        // Update state (placeholder)
        updated.push(state.stateId);
      }
    }
    
    return {
      processed: states.length,
      updated,
      pruned,
    };
  }
  
  /**
   * Compute aggregate metrics for states
   */
  private async computeMetrics(states: QuantumStoryState[]): Promise<{
    avgProbability: number;
    avgDepth: number;
    legalCount: number;
    illegalCount: number;
  }> {
    const legalCount = states.filter(s => s.isLegal).length;
    const illegalCount = states.length - legalCount;
    
    const avgProbability = states.reduce((sum, s) => sum + s.probability, 0) / states.length;
    const avgDepth = states.reduce((sum, s) => sum + s.depth, 0) / states.length;
    
    return {
      avgProbability,
      avgDepth,
      legalCount,
      illegalCount,
    };
  }
  
  private async validateState(stateId: string): Promise<ValidationResult> {
    // Simplified validation (would integrate with Trinity Gate)
    return {
      isValid: Math.random() > 0.1,
      errors: [],
      warnings: [],
      checkedRules: {
        causality: true,
        continuity: true,
        characterConsistency: true,
      },
    };
  }
  
  // ── Cluster Assignment ────────────────────────────────────────────────────────
  
  /**
   * Assign clusters to this worker
   */
  assignClusters(clusterIds: string[]): void {
    for (const id of clusterIds) {
      this.assignedClusters.add(id);
    }
    this.stats.assignedClusters = Array.from(this.assignedClusters);
  }
  
  /**
   * Remove cluster assignment
   */
  unassignCluster(clusterId: string): void {
    this.assignedClusters.delete(clusterId);
    this.stats.assignedClusters = Array.from(this.assignedClusters);
  }
  
  /**
   * Check if worker has capacity for more work
   */
  hasCapacity(): boolean {
    return this.currentTask === null && this.isActive;
  }
  
  // ── Lifecycle ─────────────────────────────────────────────────────────────────
  
  /**
   * Shutdown worker gracefully
   */
  async shutdown(): Promise<void> {
    this.isActive = false;
    
    // Wait for current task to complete
    if (this.currentTask) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    this.emit('shutdown');
  }
  
  /**
   * Get worker statistics
   */
  getStats(): WorkerStats {
    this.stats.uptime = Date.now();
    return { ...this.stats };
  }
  
  // ── Private Helpers ───────────────────────────────────────────────────────────
  
  private updateAvgExecutionTime(executionTimeMs: number): void {
    const total = this.stats.tasksCompleted;
    this.stats.avgExecutionTimeMs =
      (this.stats.avgExecutionTimeMs * (total - 1) + executionTimeMs) / total;
  }
}

// ── Worker Pool ──────────────────────────────────────────────────────────────

export class WorkerPool extends EventEmitter {
  private config: WorkerConfig;
  private workers: Map<string, QuantumWorker> = new Map();
  private taskQueue: WorkerTask[] = [];
  private pendingTasks: Map<string, WorkerTask> = new Map();
  private completedTasks: Map<string, WorkerResult> = new Map();
  private startTime: number = Date.now();
  
  constructor(config: Partial<WorkerConfig> = {}) {
    super();
    this.config = {
      maxWorkers: 10,
      batchSize: 100,
      validationTimeout: 5000,
      enableRetry: true,
      maxRetries: 3,
      ...config,
    };
    
    // Initialize workers
    for (let i = 0; i < this.config.maxWorkers; i++) {
      this.createWorker(`worker_${i}`);
    }
  }
  
  // ── Task Management ───────────────────────────────────────────────────────────
  
  /**
   * Submit task to pool
   */
  async submitTask(task: Omit<WorkerTask, 'taskId' | 'createdAt' | 'retryCount'>): Promise<string> {
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const fullTask: WorkerTask = {
      ...task,
      taskId,
      createdAt: Date.now(),
      retryCount: 0,
    };
    
    this.taskQueue.push(fullTask);
    this.sortTaskQueue();
    
    // Try to assign immediately
    this.assignTasks();
    
    return taskId;
  }
  
  /**
   * Process clusters in parallel
   */
  async processClusters(clusters: StateCluster[]): Promise<Map<string, ValidationResult[]>> {
    const results = new Map<string, ValidationResult[]>();
    const taskIds: string[] = [];
    
    // Submit validation tasks for all clusters
    for (const cluster of clusters) {
      const taskId = await this.submitTask({
        type: 'VALIDATE_CLUSTER',
        priority: 'medium',
        data: { cluster },
      });
      taskIds.push(taskId);
    }
    
    // Wait for all tasks to complete
    const taskResults = await this.waitForTasks(taskIds);
    
    // Collect results
    for (let i = 0; i < clusters.length; i++) {
      const cluster = clusters[i];
      const result = taskResults[i];
      
      if (result.success) {
        results.set(cluster.clusterId, result.data);
      }
    }
    
    return results;
  }
  
  /**
   * Wait for specific tasks to complete
   */
  async waitForTasks(taskIds: string[], timeoutMs?: number): Promise<WorkerResult[]> {
    const timeout = timeoutMs || this.config.validationTimeout * taskIds.length;
    const startTime = Date.now();
    const results: WorkerResult[] = [];
    
    while (results.length < taskIds.length) {
      // Check timeout
      if (Date.now() - startTime > timeout) {
        throw new Error(`Timeout waiting for tasks: ${taskIds.join(', ')}`);
      }
      
      // Check for completed tasks
      for (const taskId of taskIds) {
        if (this.completedTasks.has(taskId)) {
          const result = this.completedTasks.get(taskId)!;
          results.push(result);
          this.completedTasks.delete(taskId);
        }
      }
      
      // Wait a bit before checking again
      if (results.length < taskIds.length) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }
    
    return results;
  }
  
  /**
   * Get task status
   */
  getTaskStatus(taskId: string): 'pending' | 'running' | 'completed' | 'unknown' {
    if (this.completedTasks.has(taskId)) return 'completed';
    if (this.pendingTasks.has(taskId)) return 'running';
    if (this.taskQueue.some(t => t.taskId === taskId)) return 'pending';
    return 'unknown';
  }
  
  // ── Worker Management ─────────────────────────────────────────────────────────
  
  private createWorker(workerId: string): QuantumWorker {
    const worker = new QuantumWorker(workerId);
    
    // Listen for task completion
    worker.on('taskComplete', (result: WorkerResult) => {
      this.handleTaskComplete(result);
    });
    
    this.workers.set(workerId, worker);
    this.emit('workerCreated', workerId);
    
    return worker;
  }
  
  private async assignTasks(): Promise<void> {
    // Find idle workers
    const idleWorkers = Array.from(this.workers.values()).filter(w => w.hasCapacity());
    
    if (idleWorkers.length === 0 || this.taskQueue.length === 0) {
      return;
    }
    
    // Assign tasks to idle workers
    for (const worker of idleWorkers) {
      if (this.taskQueue.length === 0) break;
      
      const task = this.taskQueue.shift()!;
      this.pendingTasks.set(task.taskId, task);
      
      // Execute task asynchronously
      worker.executeTask(task).catch(error => {
        console.error(`Worker ${worker.workerId} failed task ${task.taskId}:`, error);
      });
    }
  }
  
  private handleTaskComplete(result: WorkerResult): void {
    const task = this.pendingTasks.get(result.taskId);
    if (!task) return;
    
    this.pendingTasks.delete(result.taskId);
    
    if (!result.success && this.config.enableRetry && task.retryCount < this.config.maxRetries) {
      // Retry failed task
      task.retryCount++;
      this.taskQueue.unshift(task);
      this.emit('taskRetry', task.taskId, task.retryCount);
    } else {
      // Task completed (success or max retries)
      this.completedTasks.set(result.taskId, result);
      this.emit('taskComplete', result);
    }
    
    // Try to assign more tasks
    this.assignTasks();
  }
  
  private sortTaskQueue(): void {
    // Sort by priority (high > medium > low) then by creation time
    this.taskQueue.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      return priorityDiff !== 0 ? priorityDiff : a.createdAt - b.createdAt;
    });
  }
  
  // ── Load Balancing ────────────────────────────────────────────────────────────
  
  /**
   * Distribute clusters across workers for balanced load
   */
  distributeClusterLoad(clusters: StateCluster[]): void {
    const workers = Array.from(this.workers.values());
    
    if (workers.length === 0) return;
    
    // Sort clusters by size (largest first)
    const sortedClusters = [...clusters].sort(
      (a, b) => b.states.size - a.states.size
    );
    
    // Track worker loads
    const workerLoads = new Map<string, number>();
    workers.forEach(w => workerLoads.set(w.workerId, 0));
    
    // Assign clusters using greedy algorithm (assign to least-loaded worker)
    for (const cluster of sortedClusters) {
      // Find worker with minimum load
      let minLoad = Infinity;
      let targetWorker: QuantumWorker | null = null;
      
      for (const worker of workers) {
        const load = workerLoads.get(worker.workerId) || 0;
        if (load < minLoad) {
          minLoad = load;
          targetWorker = worker;
        }
      }
      
      if (targetWorker) {
        targetWorker.assignClusters([cluster.clusterId]);
        workerLoads.set(targetWorker.workerId, minLoad + cluster.states.size);
      }
    }
  }
  
  /**
   * Rebalance load across workers
   */
  async rebalanceLoad(): Promise<void> {
    const workers = Array.from(this.workers.values());
    const workerStats = workers.map(w => w.getStats());
    
    // Calculate average load
    const totalClusters = workerStats.reduce((sum, s) => sum + s.assignedClusters.length, 0);
    const avgClusters = totalClusters / workers.length;
    
    // Find overloaded and underloaded workers
    const overloaded = workerStats.filter(s => s.assignedClusters.length > avgClusters * 1.2);
    const underloaded = workerStats.filter(s => s.assignedClusters.length < avgClusters * 0.8);
    
    // Transfer clusters from overloaded to underloaded
    for (const over of overloaded) {
      const worker = this.workers.get(over.workerId)!;
      const excess = Math.floor(over.assignedClusters.length - avgClusters);
      
      for (let i = 0; i < excess && underloaded.length > 0; i++) {
        const clusterId = over.assignedClusters[i];
        const targetStats = underloaded[0];
        const targetWorker = this.workers.get(targetStats.workerId)!;
        
        worker.unassignCluster(clusterId);
        targetWorker.assignClusters([clusterId]);
        
        targetStats.assignedClusters.push(clusterId);
        
        if (targetStats.assignedClusters.length >= avgClusters) {
          underloaded.shift();
        }
      }
    }
  }
  
  // ── Statistics ────────────────────────────────────────────────────────────────
  
  /**
   * Get pool statistics
   */
  getStats(): WorkerPoolStats {
    const workers = Array.from(this.workers.values());
    const workerStats = workers.map(w => w.getStats());
    
    const activeWorkers = workers.filter(w => w.hasCapacity()).length;
    const idleWorkers = workers.length - activeWorkers;
    
    const totalCompleted = workerStats.reduce((sum, s) => sum + s.tasksCompleted, 0);
    const totalFailed = workerStats.reduce((sum, s) => sum + s.tasksFailed, 0);
    const avgTaskTime = workerStats.reduce((sum, s) => sum + s.avgExecutionTimeMs, 0) / workers.length;
    
    const uptimeSeconds = (Date.now() - this.startTime) / 1000;
    const throughput = totalCompleted / uptimeSeconds;
    
    return {
      totalWorkers: workers.length,
      activeWorkers,
      idleWorkers,
      totalTasksCompleted: totalCompleted,
      totalTasksFailed: totalFailed,
      avgTaskTimeMs: avgTaskTime,
      queueSize: this.taskQueue.length,
      throughput,
    };
  }
  
  /**
   * Get individual worker statistics
   */
  getWorkerStats(): WorkerStats[] {
    return Array.from(this.workers.values()).map(w => w.getStats());
  }
  
  // ── Lifecycle ─────────────────────────────────────────────────────────────────
  
  /**
   * Shutdown all workers
   */
  async shutdown(): Promise<void> {
    const shutdownPromises = Array.from(this.workers.values()).map(w => w.shutdown());
    await Promise.all(shutdownPromises);
    
    this.workers.clear();
    this.taskQueue = [];
    this.pendingTasks.clear();
    this.completedTasks.clear();
    
    this.emit('shutdown');
  }
}

// ── Export Factory ────────────────────────────────────────────────────────────

export function createWorkerPool(config?: Partial<WorkerConfig>): WorkerPool {
  return new WorkerPool(config);
}
