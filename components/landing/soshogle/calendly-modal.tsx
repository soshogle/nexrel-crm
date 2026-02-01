"use client";

import { PopupModal } from "react-calendly";

interface CalendlyModalProps {
  isOpen: boolean;
  onClose: () => void;
  url?: string;
}

export function CalendlyModal({
  isOpen,
  onClose,
  url = "https://calendly.com/soshogle/30min",
}: CalendlyModalProps) {
  const root = typeof document !== "undefined"
    ? (document.getElementById("__next") as HTMLElement)
    : undefined;

  if (!root) {
    return null;
  }

  return (
    <PopupModal
      url={url}
      onModalClose={onClose}
      open={isOpen}
      rootElement={root}
    />
  );
}
