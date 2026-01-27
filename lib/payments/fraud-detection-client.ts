
/**
 * Fraud Detection Client
 * Integrates with Python AI Trust Score Service on port 8000
 */

export interface TrustScoreRequest {
  customer_id: string;
  merchant_id: string;
  amount: number;
  payment_method: 'soshogle_pay' | 'credit_card' | 'debit_card' | 'ach';
  device_fingerprint: string;
  ip_address: string;
  location?: string;
}

export interface TrustScoreResponse {
  score: number; // 0-1000
  risk_tier: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  confidence: number; // 0-1
  decision: 'APPROVE' | 'DECLINE' | 'MANUAL_REVIEW';
  model_version: string;
  features: Record<string, any>;
  timestamp: string;
}

export class FraudDetectionClient {
  private baseURL: string;

  constructor() {
    // Connect to Python AI Trust Score service
    this.baseURL =
      process.env.AI_TRUST_SCORE_URL || 'http://localhost:8000';
  }

  /**
   * Calculate trust score for a transaction
   */
  async calculateTrustScore(
    request: TrustScoreRequest
  ): Promise<TrustScoreResponse> {
    try {
      const response = await fetch(`${this.baseURL}/trust-score/calculate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(
          `AI Trust Score API error: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      return data as TrustScoreResponse;
    } catch (error) {
      console.error('[Fraud Detection] Error calculating trust score:', error);

      // Fallback: Return a default approval for non-critical errors
      // In production, you might want to decline or flag for review
      return {
        score: 500,
        risk_tier: 'MEDIUM',
        confidence: 0,
        decision: 'MANUAL_REVIEW',
        model_version: 'fallback',
        features: {},
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Check if AI Trust Score service is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseURL}/health`);
      return response.ok;
    } catch (error) {
      console.error('[Fraud Detection] Health check failed:', error);
      return false;
    }
  }

  /**
   * Map payment method type to AI service format
   */
  mapPaymentMethod(
    type: string
  ): 'soshogle_pay' | 'credit_card' | 'debit_card' | 'ach' {
    const methodMap: Record<
      string,
      'soshogle_pay' | 'credit_card' | 'debit_card' | 'ach'
    > = {
      WALLET: 'soshogle_pay',
      CREDIT_CARD: 'credit_card',
      DEBIT_CARD: 'debit_card',
      BANK_TRANSFER: 'ach',
      ACH: 'ach',
    };

    return methodMap[type.toUpperCase()] || 'credit_card';
  }
}

export const fraudDetectionClient = new FraudDetectionClient();
