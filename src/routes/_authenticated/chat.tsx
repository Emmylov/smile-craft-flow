import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { ChatPage } from "@/routes/_authenticated/chat.impl";

export const Route = createFileRoute("/_authenticated/chat")({
  component: () => (
    <AppShell>
      <ChatPage />
    </AppShell>
  ),
});
