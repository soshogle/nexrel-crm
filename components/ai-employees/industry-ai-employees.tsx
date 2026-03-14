/**
 * Industry AI Employees Component
 * Same layout and functions as RealEstateAIEmployees - for Dental, Medical, etc.
 * Each industry has its own specialized AI employees with voice provisioning
 */

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import {
  Calendar,
  FileText,
  Users,
  CreditCard,
  Play,
  Settings,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Bot,
  Sparkles,
  RefreshCw,
  Package,
  Mic,
  Award,
  Zap,
  Home,
  Clock,
  Heart,
  BarChart3,
  TrendingUp,
  Search,
  Presentation,
  Phone,
  MessageSquare,
  Target,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Industry } from "@prisma/client";
import { TwilioPhoneSelector } from "@/components/shared/twilio-phone-selector";
import { ConnectPhoneDialog } from "@/components/shared/connect-phone-dialog";
import PurchasePhoneNumberDialog from "@/components/voice-agents/purchase-phone-number-dialog";
import { TaskDashboardDialog } from "@/components/ai-employees/task-dashboard-dialog";
import { LiveRunDialog } from "@/components/ai-employees/live-run-dialog";
import { buildAiTarget } from "@/lib/ai-employees/ai-targets";
import type { IndustryEmployeeConfig } from "@/lib/industry-ai-employees/types";
import { getIndustryAIEmployeeModule } from "@/lib/industry-ai-employees/registry";
import { cn } from "@/lib/utils";

const ICON_MAP: Record<string, LucideIcon> = {
  Calendar,
  FileText,
  Users,
  CreditCard,
  Zap,
  Home,
  Clock,
  Heart,
  BarChart3,
  TrendingUp,
  Search,
  Presentation,
  Phone,
  MessageSquare,
  Target,
  UserPlus,
  Sparkles,
  Package,
  RefreshCw,
};

interface ProvisionedAgent {
  id: string;
  employeeType: string;
  name: string;
  elevenLabsAgentId: string;
  twilioPhoneNumber?: string;
  status: string;
  callCount: number;
  createdAt: string;
}

const INDUSTRY_LABELS: Record<string, string> = {
  ACCOUNTING: "Accounting",
  RESTAURANT: "Restaurant",
  SPORTS_CLUB: "Sports Club",
  CONSTRUCTION: "Construction",
  LAW: "Law",
  MEDICAL: "Medical",
  DENTIST: "Dental",
  MEDICAL_SPA: "Medical Spa",
  OPTOMETRIST: "Optometrist",
  HEALTH_CLINIC: "Health Clinic",
  HOSPITAL: "Hospital",
  TECHNOLOGY: "Technology",
  ORTHODONTIST: "Orthodontist",
};

const INDUSTRY_COMPLIANCE: Record<string, { title: string; text: string }> = {
  DENTIST: {
    title: "Healthcare Compliant",
    text: "This AI employee follows healthcare privacy best practices. It identifies as an AI assistant, handles patient information carefully, and escalates clinical questions to human staff.",
  },
  ORTHODONTIST: {
    title: "Healthcare Compliant",
    text: "This AI employee follows healthcare privacy best practices. It identifies as an AI assistant, handles patient information carefully, and escalates clinical questions to human staff.",
  },
  MEDICAL: {
    title: "HIPAA/PIPEDA Aware",
    text: "This AI employee is designed for healthcare settings. It identifies as an AI assistant and escalates sensitive health matters to qualified staff.",
  },
  MEDICAL_SPA: {
    title: "HIPAA/PIPEDA Aware",
    text: "This AI employee is designed for medical spa settings. It identifies as an AI assistant and escalates sensitive matters to qualified staff.",
  },
  OPTOMETRIST: {
    title: "HIPAA/PIPEDA Aware",
    text: "This AI employee is designed for eye care settings. It identifies as an AI assistant and escalates clinical matters to qualified staff.",
  },
  HEALTH_CLINIC: {
    title: "HIPAA/PIPEDA Aware",
    text: "This AI employee is designed for healthcare settings. It identifies as an AI assistant and escalates sensitive health matters to qualified staff.",
  },
  HOSPITAL: {
    title: "HIPAA/PIPEDA Aware",
    text: "This AI employee is designed for hospital settings. It identifies as an AI assistant and escalates sensitive health matters to qualified staff.",
  },
  LAW: {
    title: "Legal Compliant",
    text: "This AI employee does not provide legal advice. It identifies as an AI assistant and escalates all legal questions to licensed attorneys.",
  },
  ACCOUNTING: {
    title: "Professional Compliant",
    text: "This AI employee does not provide tax or financial advice. It identifies as an AI assistant and escalates advice questions to licensed professionals.",
  },
  default: {
    title: "Industry Compliant",
    text: "This AI employee is trained for your industry. It identifies as an AI assistant and escalates matters requiring human expertise.",
  },
};

export function IndustryAIEmployees({
  industry,
  isAdmin = true,
}: {
  industry: Industry;
  isAdmin?: boolean;
}) {
  const module = getIndustryAIEmployeeModule(industry);
  if (!module) return null;

  const employees = Object.values(module.configs).map((c) => ({
    ...c,
    id: c.type,
    priority: c.defaultPriority,
  })) as Array<IndustryEmployeeConfig & { id: string; priority: string }>;

  const categories = Array.from(new Set(employees.map((e) => e.category))).map(
    (cat) => ({
      id: cat,
      label: cat.charAt(0).toUpperCase() + cat.slice(1),
      count: employees.filter((e) => e.category === cat).length,
    }),
  );
  categories.unshift({
    id: "all",
    label: "All Employees",
    count: employees.length,
  });

  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedEmployee, setSelectedEmployee] = useState<
    (typeof employees)[0] | null
  >(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [runningEmployee, setRunningEmployee] = useState<string | null>(null);
  const [provisionedAgents, setProvisionedAgents] = useState<
    ProvisionedAgent[]
  >([]);
  const [isLoadingAgents, setIsLoadingAgents] = useState(true);
  const [testingAgentId, setTestingAgentId] = useState<string | null>(null);
  const [autoRunSettings, setAutoRunSettings] = useState<
    Record<string, boolean>
  >({});
  const [autoRunUpdating, setAutoRunUpdating] = useState<string | null>(null);
  const [showPurchaseDialog, setShowPurchaseDialog] = useState(false);
  const [phoneRefreshTrigger, setPhoneRefreshTrigger] = useState(0);
  const [assigningPhone, setAssigningPhone] = useState<string | null>(null);
  const [showTaskDashboard, setShowTaskDashboard] = useState(false);
  const [showLiveRun, setShowLiveRun] = useState(false);
  const [showConnectPhone, setShowConnectPhone] = useState(false);
  const [connectPhoneEmployee, setConnectPhoneEmployee] = useState<
    (typeof employees)[0] | null
  >(null);

  useEffect(() => {
    fetchProvisionedAgents();
  }, [industry]);

  useEffect(() => {
    fetch(`/api/ai-employees/auto-run?industry=${industry}`)
      .then((res) => (res.ok ? res.json() : { settings: {} }))
      .then((data) => setAutoRunSettings(data.settings || {}))
      .catch(() => setAutoRunSettings({}));
  }, [industry]);

  const getAutoRunKey = (employeeType: string) => `${employeeType}:${industry}`;
  const isAutoRunEnabled = (employeeType: string) =>
    !!autoRunSettings[getAutoRunKey(employeeType)];

  const router = useRouter();

  const handleAutoRunChange = async (
    employeeType: string,
    enabled: boolean,
  ) => {
    setAutoRunUpdating(employeeType);
    try {
      const res = await fetch("/api/ai-employees/auto-run", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeType,
          industry,
          autoRunEnabled: enabled,
        }),
      });
      const data = res.ok ? await res.json() : null;
      if (res.ok) {
        setAutoRunSettings((prev) => ({
          ...prev,
          [getAutoRunKey(employeeType)]: enabled,
        }));
        toast.success(enabled ? "Auto-run enabled" : "Auto-run disabled");
        if (enabled && data?.createdWorkflowId) {
          router.push(
            `/dashboard/ai-employees?tab=workflows&openBuilder=1&draftId=${data.createdWorkflowId}`,
          );
        }
      } else {
        toast.error("Failed to update auto-run");
      }
    } catch {
      toast.error("Failed to update auto-run");
    } finally {
      setAutoRunUpdating(null);
    }
  };

  const fetchProvisionedAgents = async () => {
    try {
      setIsLoadingAgents(true);
      const response = await fetch(
        `/api/industry-ai-employees/provision?industry=${industry}`,
      );
      if (response.ok) {
        const data = await response.json();
        setProvisionedAgents(data.agents || []);
      }
    } catch (error) {
      console.error("Failed to fetch provisioned agents:", error);
    } finally {
      setIsLoadingAgents(false);
    }
  };

  const isAgentProvisioned = (employeeId: string) =>
    provisionedAgents.some((a) => a.employeeType === employeeId);
  const getProvisionedAgent = (employeeId: string) =>
    provisionedAgents.find((a) => a.employeeType === employeeId);

  const handleTestAgent = async (employeeId: string) => {
    let agent = getProvisionedAgent(employeeId);
    if (!agent) {
      setTestingAgentId(employeeId);
      try {
        toast.loading("Setting up voice agent...", { id: "test-agent" });
        const res = await fetch("/api/industry-ai-employees/provision", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ industry, employeeTypes: [employeeId] }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.success && data.agents?.length) {
          toast.success("Voice agent ready!", { id: "test-agent" });
          setProvisionedAgents(data.agents);
          agent = data.agents.find(
            (a: ProvisionedAgent) => a.employeeType === employeeId,
          );
        } else {
          const errMsg =
            data.error ||
            data.message ||
            (res.status === 401 ? "Please sign in" : "Failed to set up agent");
          toast.error(errMsg, { id: "test-agent", duration: 6000 });
        }
      } catch (error) {
        const msg =
          error instanceof Error ? error.message : "Network or server error";
        toast.error(`Failed to set up agent: ${msg}`, {
          id: "test-agent",
          duration: 6000,
        });
      } finally {
        setTestingAgentId(null);
      }
    }
    if (agent?.id) {
      const params = new URLSearchParams({
        agentId: agent.id,
        returnTo: "ai-employees",
        agentName: agent.name || "",
      });
      window.location.href = `/dashboard/voice-agents/preview?${params.toString()}`;
    }
  };

  const filteredEmployees =
    selectedCategory === "all"
      ? employees
      : employees.filter((e) => e.category === selectedCategory);

  const handleRunEmployee = async (employeeId: string) => {
    setRunningEmployee(employeeId);
    try {
      const response = await fetch("/api/industry-ai-employees/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ industry, employeeType: employeeId }),
      });
      if (response.ok) toast.success("AI Employee task started!");
      else throw new Error("Failed to start task");
    } catch (error) {
      toast.error("Failed to run AI Employee");
    } finally {
      setRunningEmployee(null);
    }
  };

  const handleAssignPhone = async (employeeId: string, phoneNumber: string) => {
    if (!phoneNumber?.trim()) return;
    const current = getProvisionedAgent(employeeId)?.twilioPhoneNumber;
    if (current === phoneNumber.trim()) return;
    setAssigningPhone(employeeId);
    try {
      const res = await fetch("/api/industry-ai-employees/assign-phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          industry,
          employeeType: employeeId,
          phoneNumber: phoneNumber.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("Phone number assigned");
        setProvisionedAgents((prev) =>
          prev.map((a) =>
            a.employeeType === employeeId
              ? { ...a, twilioPhoneNumber: data.twilioPhoneNumber }
              : a,
          ),
        );
      } else {
        toast.error(data.error || "Failed to assign phone");
      }
    } catch {
      toast.error("Failed to assign phone");
    } finally {
      setAssigningPhone(null);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "URGENT":
        return "bg-red-100 text-red-700 border-red-200";
      case "HIGH":
        return "bg-orange-100 text-orange-700 border-orange-200";
      case "MEDIUM":
        return "bg-amber-100 text-amber-700 border-amber-200";
      case "LOW":
        return "bg-green-100 text-green-700 border-green-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const industryLabel = INDUSTRY_LABELS[industry] || industry;
  const compliance =
    INDUSTRY_COMPLIANCE[industry] || INDUSTRY_COMPLIANCE.default;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Bot className="w-7 h-7 text-purple-400" />
            {industryLabel} AI Team
          </h2>
          <p className="text-gray-600 mt-1">
            {employees.length} specialized AI employees for{" "}
            {industryLabel.toLowerCase()} practices
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Auto-provisioned when you set your industry
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge
            variant="outline"
            className="bg-green-100 text-green-700 border-green-200"
          >
            <Mic className="w-3 h-3 mr-1" />
            {provisionedAgents.length} / {employees.length} Voice Agents
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchProvisionedAgents}
            className="text-gray-500 hover:text-gray-700"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 flex-wrap">
        {categories.map((cat) => (
          <Button
            key={cat.id}
            variant={selectedCategory === cat.id ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory(cat.id)}
            className={
              selectedCategory === cat.id
                ? "bg-purple-600 hover:bg-purple-700 text-white"
                : "border-purple-200 hover:bg-purple-50"
            }
          >
            {cat.label}
            <Badge
              variant="secondary"
              className="ml-2 bg-purple-100 text-purple-700"
            >
              {cat.count}
            </Badge>
          </Button>
        ))}
      </div>

      {/* Employee Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <AnimatePresence mode="popLayout">
          {filteredEmployees.map((employee, index) => {
            const Icon = ICON_MAP[employee.icon] || Users;
            const isRunning = runningEmployee === employee.id;

            return (
              <motion.div
                key={employee.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card
                  className="border-2 border-purple-200/50 bg-white/80 backdrop-blur-sm shadow-sm hover:border-purple-300 transition-all cursor-pointer group"
                  onClick={() => {
                    setSelectedEmployee(employee);
                    setShowDetailDialog(true);
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div
                        className={`p-2.5 rounded-xl bg-gradient-to-br ${employee.color}`}
                      >
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex items-center gap-2">
                        {isAgentProvisioned(employee.id) ? (
                          <Badge
                            variant="outline"
                            className="text-xs bg-green-100 text-green-700 border-green-200"
                          >
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Ready
                          </Badge>
                        ) : employee.voiceEnabled ? (
                          <Badge
                            variant="outline"
                            className="text-xs bg-amber-100 text-amber-700 border-amber-200"
                          >
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Not Provisioned
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                    <h3 className="font-bold text-gray-900 text-lg">
                      {employee.name}
                    </h3>
                    <p className="text-sm text-gray-600 mb-2">
                      {employee.title}
                    </p>
                    <p className="text-xs text-gray-500 mb-4 line-clamp-2">
                      {employee.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <Badge
                        className={`text-xs ${getPriorityColor(employee.priority)}`}
                      >
                        {employee.priority}
                      </Badge>
                      <div className="flex items-center gap-1">
                        {isAgentProvisioned(employee.id) &&
                          employee.voiceEnabled && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setConnectPhoneEmployee(employee);
                                setShowConnectPhone(true);
                              }}
                              className={cn(
                                "p-2 rounded-lg",
                                getProvisionedAgent(employee.id)
                                  ?.twilioPhoneNumber
                                  ? "text-green-600 hover:bg-green-50"
                                  : "text-gray-500 hover:bg-purple-50",
                              )}
                              title={
                                getProvisionedAgent(employee.id)
                                  ?.twilioPhoneNumber
                                  ? "Change phone"
                                  : "Connect phone"
                              }
                            >
                              <Phone className="w-4 h-4" />
                            </button>
                          )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-purple-600 hover:bg-purple-50 p-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRunEmployee(employee.id);
                          }}
                          disabled={isRunning}
                        >
                          {isRunning ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Play className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Employee Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="bg-white border-2 border-purple-200/50 max-w-2xl">
          {selectedEmployee && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-4">
                  <div
                    className={`p-3 rounded-xl bg-gradient-to-br ${selectedEmployee.color}`}
                  >
                    {(() => {
                      const IconComponent =
                        ICON_MAP[selectedEmployee.icon] || Users;
                      return <IconComponent className="w-6 h-6 text-white" />;
                    })()}
                  </div>
                  <div>
                    <DialogTitle className="text-xl text-gray-900">
                      {selectedEmployee.name} - {selectedEmployee.title}
                    </DialogTitle>
                    <DialogDescription className="text-gray-600">
                      {selectedEmployee.fullDescription}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              <div className="space-y-6 mt-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">
                    Capabilities
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedEmployee.capabilities.map((cap, i) => (
                      <Badge
                        key={i}
                        variant="secondary"
                        className="bg-purple-50 text-gray-700 border border-purple-200"
                      >
                        <CheckCircle2 className="w-3 h-3 mr-1 text-green-600" />
                        {cap}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 bg-white/80 rounded-lg border-2 border-purple-200/50">
                  <div className="flex items-center gap-3">
                    <Settings className="w-5 h-5 text-gray-500" />
                    <div>
                      <p className="text-gray-900 font-medium">Auto-Run</p>
                      <p className="text-xs text-gray-600">
                        Automatically trigger on events
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={
                      selectedEmployee
                        ? isAutoRunEnabled(selectedEmployee.id)
                        : false
                    }
                    onCheckedChange={(checked) =>
                      selectedEmployee &&
                      handleAutoRunChange(selectedEmployee.id, !!checked)
                    }
                    disabled={!!autoRunUpdating}
                  />
                </div>
                {selectedEmployee.voiceEnabled && (
                  <div
                    className={`p-4 rounded-lg border ${isAgentProvisioned(selectedEmployee.id) ? "bg-green-100 border-green-200" : "bg-purple-50/50 border-purple-200"}`}
                  >
                    <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <Mic className="w-4 h-4" />
                      Setup — Voice Agent
                    </h4>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {isAgentProvisioned(selectedEmployee.id) ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-green-400" />
                            <span className="text-green-400 font-medium">
                              Voice Agent Ready
                            </span>
                          </>
                        ) : (
                          <>
                            <Mic className="w-4 h-4 text-gray-500" />
                            <span className="text-gray-700 font-medium">
                              Voice Agent
                            </span>
                          </>
                        )}
                      </div>
                      {isAgentProvisioned(selectedEmployee.id) && (
                        <Badge className="bg-green-100 text-green-700 border-green-200">
                          {getProvisionedAgent(selectedEmployee.id)
                            ?.callCount || 0}{" "}
                          calls
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-3">
                      {isAgentProvisioned(selectedEmployee.id)
                        ? `Voice AI agent configured for ${industryLabel.toLowerCase()} workflows. Test in browser or assign a phone for calls.`
                        : "Click Test Voice Agent to set up automatically on first use."}
                    </p>
                    {isAgentProvisioned(selectedEmployee.id) &&
                      !getProvisionedAgent(selectedEmployee.id)
                        ?.twilioPhoneNumber && (
                        <div className="mt-3 pt-3 border-t border-purple-200">
                          {isAdmin ? (
                            <>
                              <p className="text-xs text-amber-400 mb-2">
                                This agent can make phone calls. Assign a number
                                from your Soshogle Call account:
                              </p>
                              <TwilioPhoneSelector
                                value={
                                  getProvisionedAgent(selectedEmployee.id)
                                    ?.twilioPhoneNumber || ""
                                }
                                onChange={(v) =>
                                  handleAssignPhone(selectedEmployee.id, v)
                                }
                                required={false}
                                onPurchaseClick={() =>
                                  setShowPurchaseDialog(true)
                                }
                                showPurchaseButton={true}
                                refreshTrigger={phoneRefreshTrigger}
                                label="Phone Number (for calls)"
                                description="Select from your Soshogle Call account. Required for inbound/outbound calls."
                              />
                              {assigningPhone === selectedEmployee.id && (
                                <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  Assigning...
                                </div>
                              )}
                            </>
                          ) : (
                            <p className="text-sm text-amber-400 flex items-center gap-2">
                              <AlertCircle className="w-4 h-4 flex-shrink-0" />
                              Admin rights required to assign a phone number to
                              this agent. Please ask your administrator.
                            </p>
                          )}
                        </div>
                      )}
                    {isAgentProvisioned(selectedEmployee.id) &&
                      getProvisionedAgent(selectedEmployee.id)
                        ?.twilioPhoneNumber && (
                        <div className="mt-3 pt-3 border-t border-purple-200">
                          <TwilioPhoneSelector
                            value={
                              getProvisionedAgent(selectedEmployee.id)
                                ?.twilioPhoneNumber || ""
                            }
                            onChange={(v) =>
                              handleAssignPhone(selectedEmployee.id, v)
                            }
                            required={false}
                            onPurchaseClick={() => setShowPurchaseDialog(true)}
                            showPurchaseButton={true}
                            refreshTrigger={phoneRefreshTrigger}
                            label="Phone Number"
                            description="Select from your Soshogle Call account. Assigned to agent in Soshogle Voice AI."
                          />
                          {assigningPhone === selectedEmployee.id && (
                            <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Assigning...
                            </div>
                          )}
                        </div>
                      )}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTestAgent(selectedEmployee.id);
                        }}
                        disabled={testingAgentId === selectedEmployee.id}
                      >
                        {testingAgentId === selectedEmployee.id ? (
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        ) : (
                          <Mic className="w-3 h-3 mr-1" />
                        )}
                        Talk to {selectedEmployee.name}
                      </Button>
                      {isAgentProvisioned(selectedEmployee.id) && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-purple-200 text-purple-600 hover:bg-purple-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowTaskDashboard(true);
                          }}
                        >
                          <Settings className="w-3 h-3 mr-1" />
                          Manage Tasks
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-purple-200 text-purple-600 hover:bg-purple-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowLiveRun(true);
                        }}
                        {...buildAiTarget("employee_card.start_live_run")}
                      >
                        <Play className="w-3 h-3 mr-1" />
                        Start Live Run
                      </Button>
                      <p className="text-xs text-gray-500 w-full">
                        Talk opens voice conversation. Manage Tasks: toggles,
                        history, run.
                      </p>
                    </div>
                  </div>
                )}
                <div className="p-4 bg-white/80 rounded-lg border-2 border-purple-200/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Award className="w-4 h-4 text-purple-400" />
                    <span className="text-purple-400 font-medium">
                      {compliance.title}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600">{compliance.text}</p>
                </div>
              </div>
              <DialogFooter className="mt-6">
                <Button
                  variant="outline"
                  onClick={() => setShowDetailDialog(false)}
                  className="border-purple-200 text-gray-700 hover:bg-purple-50"
                >
                  Close
                </Button>
                {isAgentProvisioned(selectedEmployee.id) && (
                  <Button
                    variant="outline"
                    className="border-purple-200 text-purple-600 hover:bg-purple-50"
                    onClick={() => setShowTaskDashboard(true)}
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Manage Tasks
                  </Button>
                )}
                <Button
                  variant="outline"
                  className="border-purple-200 text-purple-600 hover:bg-purple-50"
                  onClick={() => setShowLiveRun(true)}
                  {...buildAiTarget("employee_detail.start_live_run")}
                >
                  <Play className="w-4 h-4 mr-2" />
                  Start Live Run
                </Button>
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => {
                    handleTestAgent(selectedEmployee.id);
                    setShowDetailDialog(false);
                  }}
                >
                  <Mic className="w-4 h-4 mr-2" />
                  Talk to {selectedEmployee.name}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <PurchasePhoneNumberDialog
        open={showPurchaseDialog}
        onClose={() => setShowPurchaseDialog(false)}
        onSuccess={(phoneNumber) => {
          setShowPurchaseDialog(false);
          setPhoneRefreshTrigger((n) => n + 1);
          if (
            selectedEmployee?.voiceEnabled &&
            isAgentProvisioned(selectedEmployee.id)
          ) {
            handleAssignPhone(selectedEmployee.id, phoneNumber);
          }
        }}
      />
      {connectPhoneEmployee && (
        <ConnectPhoneDialog
          open={showConnectPhone}
          onOpenChange={(open) => {
            if (!open) setConnectPhoneEmployee(null);
            setShowConnectPhone(open);
          }}
          agent={{
            source: "industry",
            agentName: connectPhoneEmployee.name,
            industry,
            employeeType: connectPhoneEmployee.id,
            currentPhone: getProvisionedAgent(connectPhoneEmployee.id)
              ?.twilioPhoneNumber,
          }}
          onSuccess={() => {
            fetchProvisionedAgents();
            setShowConnectPhone(false);
            setConnectPhoneEmployee(null);
          }}
          onPurchaseClick={() => {
            setShowConnectPhone(false);
            setConnectPhoneEmployee(null);
            setShowPurchaseDialog(true);
          }}
        />
      )}

      {selectedEmployee && getProvisionedAgent(selectedEmployee.id)?.id && (
        <TaskDashboardDialog
          open={showTaskDashboard}
          onOpenChange={setShowTaskDashboard}
          agentId={getProvisionedAgent(selectedEmployee.id)!.id}
          agentName={selectedEmployee.name}
          employeeType={selectedEmployee.id}
          source="industry"
          industry={industry}
          isAdmin={isAdmin}
        />
      )}

      {selectedEmployee && (
        <LiveRunDialog
          open={showLiveRun}
          onOpenChange={setShowLiveRun}
          employeeRef={
            getProvisionedAgent(selectedEmployee.id)?.id || selectedEmployee.id
          }
          employeeType={selectedEmployee.id}
          employeeName={selectedEmployee.name}
        />
      )}
    </div>
  );
}
