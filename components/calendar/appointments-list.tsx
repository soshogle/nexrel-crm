"use client";

import { format } from "date-fns";
import { useSession } from "next-auth/react";
import {
  Calendar,
  MapPin,
  Video,
  Phone,
  User,
  Clock,
  Trash2,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { AppointmentDetailDialog } from "./appointment-detail-dialog";
import { MakeCallDialog } from "@/components/voice-agents/make-call-dialog";
import { getIndustryBookingConfig } from "@/lib/industry-booking-config";
import type { Appointment } from "@/types/appointment";

interface AppointmentsListProps {
  appointments: Appointment[];
  onAppointmentUpdated: () => void;
  onAppointmentDeleted: () => void;
}

export function AppointmentsList({
  appointments,
  onAppointmentUpdated,
  onAppointmentDeleted,
}: AppointmentsListProps) {
  const { data: session, status } = useSession() || {};
  const [resolvedIndustry, setResolvedIndustry] = useState<string | null>(
    ((session?.user as any)?.industry as string) || null,
  );
  const industry =
    resolvedIndustry || ((session?.user as any)?.industry as string) || null;
  const config = getIndustryBookingConfig(industry);

  const [selectedAppointment, setSelectedAppointment] =
    useState<Appointment | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [callDialogOpen, setCallDialogOpen] = useState(false);
  const [appointmentForCall, setAppointmentForCall] =
    useState<Appointment | null>(null);

  useEffect(() => {
    const fromSession = ((session?.user as any)?.industry as string) || null;
    if (fromSession) {
      setResolvedIndustry(fromSession);
      return;
    }

    if (status === "authenticated") {
      fetch("/api/session/context")
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          const resolved = (data?.industry as string | null) || null;
          if (resolved) setResolvedIndustry(resolved);
        })
        .catch(() => {});
    }
  }, [status, (session?.user as any)?.industry]);

  const statusColors: Record<string, string> = {
    SCHEDULED: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    CONFIRMED: "bg-green-500/20 text-green-400 border-green-500/30",
    COMPLETED: "gradient-primary text-white border-purple-500/30",
    NO_SHOW: "bg-red-500/20 text-red-400 border-red-500/30",
    CANCELLED: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  };

  const meetingTypeIcons: Record<string, any> = {
    IN_PERSON: MapPin,
    VIDEO_CALL: Video,
    VIDEO: Video,
    PHONE_CALL: Phone,
    PHONE: Phone,
  };

  // Text colors by meeting type - visible on dark glass-effect cards
  const meetingTypeTextColors: Record<string, string> = {
    IN_PERSON: "text-blue-300",
    VIDEO_CALL: "text-green-300",
    VIDEO: "text-green-300",
    PHONE_CALL: "text-amber-300",
    PHONE: "text-amber-300",
  };

  const handleAppointmentClick = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setShowDetailDialog(true);
  };

  const handleMakeCall = (appointment: Appointment, e: React.MouseEvent) => {
    e.stopPropagation();
    setAppointmentForCall(appointment);
    setCallDialogOpen(true);
  };

  const handleDeleteAppointment = async (appointmentId: string) => {
    if (!confirm("Are you sure you want to cancel this appointment?")) return;

    try {
      const response = await fetch(`/api/appointments/${appointmentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CANCELLED" }),
      });

      if (response.ok) {
        toast.success("Appointment cancelled");
        onAppointmentDeleted();
      } else {
        throw new Error("Failed to cancel appointment");
      }
    } catch (error) {
      console.error("Error cancelling appointment:", error);
      toast.error("Failed to cancel appointment");
    }
  };

  // Filter out appointments with invalid dates and sort
  const validAppointments = appointments.filter((apt) => {
    try {
      const date = new Date(apt.startTime);
      return !isNaN(date.getTime());
    } catch {
      return false;
    }
  });

  const sortedAppointments = [...validAppointments].sort((a, b) => {
    return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
  });

  if (sortedAppointments.length === 0) {
    return (
      <Card className="glass-effect border-purple-500/20">
        <div className="text-center py-12 text-purple-300">
          <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50 text-purple-400" />
          <p>No {config.bookingPluralNoun.toLowerCase()} scheduled</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {sortedAppointments.map((apt) => {
        const MeetingIcon = meetingTypeIcons[apt.meetingType] || MapPin;
        const startDate = new Date(apt.startTime);
        const isPast = startDate < new Date();
        const typeKey = apt.meetingType || "PHONE_CALL";
        const aptStatus =
          typeof apt.status === "string" ? apt.status : "SCHEDULED";
        const textColor =
          meetingTypeTextColors[typeKey] || meetingTypeTextColors["PHONE_CALL"];

        return (
          <Card
            key={apt.id}
            className={`
              glass-effect border-purple-500/20 hover:border-purple-500/40 hover:shadow-lg hover:shadow-purple-500/10 transition-all cursor-pointer
              ${aptStatus === "CANCELLED" ? "opacity-50" : ""}
            `}
            onClick={() => handleAppointmentClick(apt)}
          >
            <div className="p-4">
              <div className="flex items-start justify-between gap-4">
                {/* Left Section - Icon & Details */}
                <div className="flex items-start gap-4 flex-1">
                  <div className="flex-shrink-0 mt-1">
                    <div
                      className={`p-3 rounded-lg border ${typeKey === "IN_PERSON" ? "bg-blue-500/20 border-blue-500/30" : typeKey === "VIDEO_CALL" || typeKey === "VIDEO" ? "bg-green-500/20 border-green-500/30" : "bg-amber-500/20 border-amber-500/30"}`}
                    >
                      <MeetingIcon
                        className={`h-5 w-5 ${typeKey === "IN_PERSON" ? "text-blue-400" : typeKey === "VIDEO_CALL" || typeKey === "VIDEO" ? "text-green-400" : "text-amber-400"}`}
                      />
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Title & Status */}
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className={`font-semibold truncate ${textColor}`}>
                        {apt.title}
                      </h3>
                      <Badge
                        className={`${statusColors[aptStatus] || statusColors.SCHEDULED} border`}
                      >
                        {aptStatus.replace("_", " ")}
                      </Badge>
                      {isPast &&
                        aptStatus !== "COMPLETED" &&
                        aptStatus !== "CANCELLED" && (
                          <Badge className="bg-orange-500/10 text-orange-400 border border-orange-500/20">
                            Overdue
                          </Badge>
                        )}
                    </div>

                    {/* Description */}
                    {apt.description && (
                      <p className={`text-sm mb-3 line-clamp-2 ${textColor}`}>
                        {apt.description}
                      </p>
                    )}

                    {/* Metadata Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      {/* Date & Time */}
                      <div className={`flex items-center gap-2 ${textColor}`}>
                        <Clock
                          className={`h-4 w-4 ${typeKey === "IN_PERSON" ? "text-blue-400" : typeKey === "VIDEO_CALL" || typeKey === "VIDEO" ? "text-green-400" : "text-amber-400"}`}
                        />
                        <span>{format(startDate, "MMM d, yyyy • h:mm a")}</span>
                      </div>

                      {/* Lead/Contact */}
                      {apt.lead && (
                        <div className={`flex items-center gap-2 ${textColor}`}>
                          <User
                            className={`h-4 w-4 ${typeKey === "IN_PERSON" ? "text-blue-400" : typeKey === "VIDEO_CALL" || typeKey === "VIDEO" ? "text-green-400" : "text-amber-400"}`}
                          />
                          <span className="truncate">
                            {apt.lead.contactPerson}
                          </span>
                        </div>
                      )}

                      {/* Location */}
                      {apt.location && apt.meetingType === "IN_PERSON" && (
                        <div className={`flex items-center gap-2 ${textColor}`}>
                          <MapPin
                            className={`h-4 w-4 ${typeKey === "IN_PERSON" ? "text-blue-400" : typeKey === "VIDEO_CALL" || typeKey === "VIDEO" ? "text-green-400" : "text-amber-400"}`}
                          />
                          <span className="truncate">{apt.location}</span>
                        </div>
                      )}

                      {/* Payment Info */}
                      {apt.requiresPayment && apt.paymentAmount && (
                        <div className={`flex items-center gap-2 ${textColor}`}>
                          <span className={`font-medium ${textColor}`}>
                            ${(apt.paymentAmount / 100).toFixed(2)}
                          </span>
                          {apt.payments && apt.payments.length > 0 ? (
                            <CheckCircle className="h-4 w-4 text-green-400" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-400" />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Section - Actions */}
                <div
                  className="flex items-center gap-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  {apt.lead?.phone && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => handleMakeCall(apt, e)}
                      className="hover:bg-purple-500/20 hover:text-purple-400 border border-purple-500/20"
                      title="Make Voice AI Call"
                    >
                      <Phone className="h-4 w-4" />
                    </Button>
                  )}
                  {!isPast &&
                    aptStatus !== "CANCELLED" &&
                    aptStatus !== "COMPLETED" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteAppointment(apt.id)}
                        className="hover:bg-red-500/20 hover:text-red-400 border border-red-500/20"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                </div>
              </div>
            </div>
          </Card>
        );
      })}

      {/* Appointment Detail Dialog */}
      <AppointmentDetailDialog
        open={showDetailDialog}
        onClose={() => {
          setShowDetailDialog(false);
          setSelectedAppointment(null);
        }}
        appointment={selectedAppointment}
        onUpdate={() => {
          onAppointmentUpdated();
        }}
        isPast={
          selectedAppointment?.startTime
            ? new Date(selectedAppointment.startTime) < new Date()
            : false
        }
      />

      {/* Voice AI Call Dialog */}
      <MakeCallDialog
        open={callDialogOpen}
        onOpenChange={setCallDialogOpen}
        defaultName={
          appointmentForCall?.lead?.contactPerson ||
          appointmentForCall?.lead?.businessName ||
          ""
        }
        defaultPhone={appointmentForCall?.lead?.phone || ""}
        defaultPurpose={`${config.bookingNoun} reminder: ${appointmentForCall?.title || ""}`}
        leadId={appointmentForCall?.lead?.id}
      />
    </div>
  );
}
