
import { FraudDetectionDashboard } from '@/components/payments/fraud-detection-dashboard';

export const metadata = {
  title: 'Fraud Detection - Soshogle CRM',
  description: 'Monitor and manage suspicious transactions',
};

export default function FraudDetectionPage() {
  return <FraudDetectionDashboard />;
}
