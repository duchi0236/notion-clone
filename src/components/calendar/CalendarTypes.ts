export type CalendarEvent = {
  id: string;
  title: string;
  description?: string | null;
  location?: string | null;
  startsAt: string;
  endsAt: string;
  allDay: boolean;
  color: string;
  status: "TENTATIVE" | "CONFIRMED" | "CANCELLED" | "DONE";
  source: "MANUAL" | "TASK" | "DOCUMENT" | "IMPORTED" | "AI";
  sourceId?: string | null;
  documentId?: string | null;
};

export type CalendarViewMode = "month" | "week" | "agenda";
