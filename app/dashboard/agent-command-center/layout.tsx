import { CommandCenterLayout } from "@/components/command-center/command-center-layout";

export default function AgentCommandCenterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <CommandCenterLayout>{children}</CommandCenterLayout>;
}
