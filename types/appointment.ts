export interface Appointment {
  id: string;
  title: string;
  description: string | null;
  startTime: string;
  endTime: string;
  location: string | null;
  meetingType: string;
  status: string;
  requiresPayment: boolean;
  paymentAmount: number | null;
  lead?: {
    id: string;
    businessName: string;
    contactPerson: string;
    email: string | null;
    phone: string | null;
  };
  payments?: any[];
}
