export type NodeType = 'branch' | 'bottleneck';

export interface NarrativeNode {
  id: string;
  type: NodeType;
  description: string;
  nextNodes: string[]; // IDs of possible next nodes
}

/**
 * The Branch and Bottleneck Graph Topology models the narrative structure.
 * It allows for branching paths (player/character choices) that eventually
 * converge on narrative bottlenecks (required plot points).
 * This ensures the story remains coherent while providing agency.
 */
export class BranchAndBottleneckGraph {
  private nodes: Map<string, NarrativeNode>;
  private currentNodeId: string | null;

  constructor(initialNodes: NarrativeNode[] = []) {
    this.nodes = new Map();
    initialNodes.forEach(node => this.nodes.set(node.id, node));
    this.currentNodeId = initialNodes.length > 0 ? initialNodes[0].id : null;
  }

  /**
   * Adds a new node to the graph.
   */
  public addNode(node: NarrativeNode): void {
    this.nodes.set(node.id, node);
  }

  /**
   * Returns the current node.
   */
  public getCurrentNode(): NarrativeNode | null {
    if (!this.currentNodeId) return null;
    return this.nodes.get(this.currentNodeId) || null;
  }

  /**
   * Returns the available paths from the current node.
   */
  public getAvailablePaths(): NarrativeNode[] {
    const currentNode = this.getCurrentNode();
    if (!currentNode) return [];

    return currentNode.nextNodes
      .map(id => this.nodes.get(id))
      .filter((node): node is NarrativeNode => node !== undefined);
  }

  /**
   * Transitions to the next node in the graph.
   * Throws an error if the transition is invalid.
   */
  public transitionTo(nodeId: string): void {
    const currentNode = this.getCurrentNode();
    if (!currentNode) {
      throw new Error(`BranchAndBottleneck Error: No current node set.`);
    }

    if (!currentNode.nextNodes.includes(nodeId)) {
      throw new Error(`BranchAndBottleneck Error: Invalid transition from '${this.currentNodeId}' to '${nodeId}'.`);
    }

    this.currentNodeId = nodeId;
  }

  /**
   * Checks if the current node is a bottleneck.
   */
  public isAtBottleneck(): boolean {
    const currentNode = this.getCurrentNode();
    return currentNode?.type === 'bottleneck';
  }
}
