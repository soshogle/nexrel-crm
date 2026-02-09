/**
 * Change Approval Service
 * Handles preview, approval, and application of website changes
 */

import type { WebsiteChange, ApprovalStatus } from './types';

export class ChangeApprovalService {
  /**
   * Generate preview of changes
   */
  generatePreview(currentStructure: any, changes: WebsiteChange[]): any {
    // Create a deep copy for preview
    const previewStructure = JSON.parse(JSON.stringify(currentStructure));
    
    // Apply changes to preview structure
    for (const change of changes) {
      this.applyChange(previewStructure, change);
    }
    
    return previewStructure;
  }

  /**
   * Apply a single change to structure
   */
  private applyChange(structure: any, change: WebsiteChange): void {
    const pathParts = change.path.split('.');
    let current = structure;
    
    // Navigate to the target location
    for (let i = 0; i < pathParts.length - 1; i++) {
      const part = pathParts[i];
      if (part.includes('[')) {
        // Array access
        const [key, index] = part.split('[');
        const idx = parseInt(index.replace(']', ''));
        current = current[key][idx];
      } else {
        current = current[part];
      }
    }
    
    // Apply the change
    const lastPart = pathParts[pathParts.length - 1];
    if (lastPart.includes('[')) {
      const [key, index] = lastPart.split('[');
      const idx = parseInt(index.replace(']', ''));
      
      if (change.type === 'add') {
        current[key].splice(idx, 0, change.data);
      } else if (change.type === 'update') {
        current[key][idx] = { ...current[key][idx], ...change.data };
      } else if (change.type === 'delete') {
        current[key].splice(idx, 1);
      }
    } else {
      if (change.type === 'add' || change.type === 'update') {
        current[lastPart] = change.data;
      } else if (change.type === 'delete') {
        delete current[lastPart];
      }
    }
  }

  /**
   * Create change approval request
   */
  createApprovalRequest(
    websiteId: string,
    changes: WebsiteChange[],
    currentStructure: any,
    requestedBy: string
  ): {
    changes: WebsiteChange[];
    preview: any;
    status: ApprovalStatus;
  } {
    const preview = this.generatePreview(currentStructure, changes);
    
    return {
      changes,
      preview,
      status: 'PENDING',
    };
  }

  /**
   * Apply approved changes
   */
  applyApprovedChanges(
    currentStructure: any,
    changes: WebsiteChange[]
  ): any {
    const newStructure = JSON.parse(JSON.stringify(currentStructure));
    
    for (const change of changes) {
      this.applyChange(newStructure, change);
    }
    
    return newStructure;
  }
}

export const changeApproval = new ChangeApprovalService();
