export const dynamic = 'force-dynamic';


import { Metadata } from 'next';
import ContactsPage from '@/components/contacts/contacts-page';

export const metadata: Metadata = {
  title: 'Contacts | CRM Dashboard',
  description: 'Manage your contacts and relationships',
};

export default function ContactsDashboardPage() {
  return <ContactsPage />;
}
