
/**
 * Workflow Conditional Logic Engine
 * 
 * Evaluates conditions for IF/THEN/ELSE branching in workflows.
 */

export interface Condition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'is_empty' | 'is_not_empty';
  value?: any;
  logic?: 'AND' | 'OR';
}

export interface ConditionalBranch {
  conditions: Condition[];
  trueActions: string[]; // Action IDs to execute if true
  falseActions: string[]; // Action IDs to execute if false
}

export class WorkflowConditionEvaluator {
  /**
   * Evaluate a set of conditions against data
   */
  evaluate(conditions: Condition[], data: any): boolean {
    if (!conditions.length) return true;

    let result = this.evaluateCondition(conditions[0], data);

    for (let i = 1; i < conditions.length; i++) {
      const condition = conditions[i];
      const conditionResult = this.evaluateCondition(condition, data);

      if (condition.logic === 'OR') {
        result = result || conditionResult;
      } else {
        result = result && conditionResult;
      }
    }

    return result;
  }

  /**
   * Evaluate a single condition
   */
  private evaluateCondition(condition: Condition, data: any): boolean {
    const fieldValue = this.getFieldValue(condition.field, data);

    switch (condition.operator) {
      case 'equals':
        return fieldValue == condition.value;
      
      case 'not_equals':
        return fieldValue != condition.value;
      
      case 'contains':
        return String(fieldValue || '').toLowerCase().includes(String(condition.value || '').toLowerCase());
      
      case 'not_contains':
        return !String(fieldValue || '').toLowerCase().includes(String(condition.value || '').toLowerCase());
      
      case 'greater_than':
        return Number(fieldValue || 0) > Number(condition.value || 0);
      
      case 'less_than':
        return Number(fieldValue || 0) < Number(condition.value || 0);
      
      case 'is_empty':
        return !fieldValue || fieldValue === '' || fieldValue === null || fieldValue === undefined;
      
      case 'is_not_empty':
        return !!fieldValue && fieldValue !== '' && fieldValue !== null && fieldValue !== undefined;
      
      default:
        return false;
    }
  }

  /**
   * Get field value from nested object using dot notation
   */
  private getFieldValue(field: string, data: any): any {
    const parts = field.split('.');
    let value = data;

    for (const part of parts) {
      if (value === null || value === undefined) return undefined;
      value = value[part];
    }

    return value;
  }

  /**
   * Get branch path based on conditions
   */
  getBranchPath(branch: ConditionalBranch, data: any): 'true' | 'false' {
    return this.evaluate(branch.conditions, data) ? 'true' : 'false';
  }
}

export const conditionEvaluator = new WorkflowConditionEvaluator();

