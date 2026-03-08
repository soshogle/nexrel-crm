/**
 * Retail Industry AI Employee Configurations
 */

import type { IndustryEmployeeConfig } from "../types";

export const RETAIL_EMPLOYEE_CONFIGS: Record<string, IndustryEmployeeConfig> = {
  ORDER_CONCIERGE: {
    type: "ORDER_CONCIERGE",
    name: "Sarah",
    title: "Order Concierge",
    description: "Handles order confirmations, updates, and customer questions",
    fullDescription:
      "Supports order status updates, confirmations, shipping questions, and escalates payment or fulfillment issues to staff.",
    capabilities: [
      "Order confirmation",
      "Order status updates",
      "Shipping ETA communication",
      "Escalation routing",
    ],
    voiceEnabled: true,
    defaultPriority: "HIGH",
    category: "orders",
    color: "from-blue-500 to-indigo-500",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30",
    icon: "Package",
  },
  INVENTORY_ALERT_SPECIALIST: {
    type: "INVENTORY_ALERT_SPECIALIST",
    name: "Michael",
    title: "Inventory Alert Specialist",
    description: "Monitors low stock and back-in-stock notifications",
    fullDescription:
      "Coordinates low-stock alerts, restock notifications, and item availability messaging to customers and staff.",
    capabilities: [
      "Low-stock alerting",
      "Back-in-stock updates",
      "Availability messaging",
      "Restock coordination",
    ],
    voiceEnabled: true,
    defaultPriority: "MEDIUM",
    category: "inventory",
    color: "from-green-500 to-emerald-500",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500/30",
    icon: "BarChart3",
  },
  LOYALTY_RETENTION_SPECIALIST: {
    type: "LOYALTY_RETENTION_SPECIALIST",
    name: "Jessica",
    title: "Loyalty & Retention Specialist",
    description: "Manages loyalty points and repeat-customer follow-up",
    fullDescription:
      "Supports loyalty enrollment, points updates, promotion follow-up, and retention messaging for repeat customers.",
    capabilities: [
      "Loyalty enrollment",
      "Points updates",
      "Promotion follow-up",
      "Retention messaging",
    ],
    voiceEnabled: true,
    defaultPriority: "MEDIUM",
    category: "retention",
    color: "from-purple-500 to-violet-500",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500/30",
    icon: "Award",
  },
  RETURNS_EXCHANGE_COORDINATOR: {
    type: "RETURNS_EXCHANGE_COORDINATOR",
    name: "David",
    title: "Returns & Exchange Coordinator",
    description: "Guides customers through returns, exchanges, and resolutions",
    fullDescription:
      "Handles return/exchange intake, process explanations, eligibility checks, and routes complex cases to human support.",
    capabilities: [
      "Returns intake",
      "Exchange coordination",
      "Resolution routing",
      "Policy explanation",
    ],
    voiceEnabled: true,
    defaultPriority: "HIGH",
    category: "support",
    color: "from-amber-500 to-orange-500",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/30",
    icon: "RefreshCw",
  },
};
