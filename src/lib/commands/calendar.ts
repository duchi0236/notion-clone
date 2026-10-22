import type { CommandContext } from "./types";
import { CommandError } from "./types";
import { createChangeSet, runCommand } from "./core";
import type { CalendarEventStatus, Prisma } from "@prisma/client";

export type CalendarEventInput = {
  title: string;
  startsAt: string;
  endsAt: string;
  allDay?: boolean;
  description?: string;
  location?: string;
  color?: string;
  calendarId?: string | null;
  repeat?: string | null;
  repeatUntil?: string | null;
  reminderMinutes?: number | null;
  status?: CalendarEventStatus;
  attendees?: string[];
};

export async function createCalendarEvents(ctx: CommandContext, inputs: CalendarEventInput[]) {
  return runCommand(ctx, "calendar-events.created", "calendar:write", async (tx) => {
    const events = [];
    for (const input of inputs) {
      const startsAt = new Date(input.startsAt);
      const endsAt = new Date(input.endsAt);
      if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || endsAt <= startsAt) {
        throw new CommandError("日程时间无效", 400, "INVALID_EVENT_TIME");
      }
      events.push(await tx.calendarEvent.create({
        data: {
          workspaceId: ctx.workspaceId,
          projectId: ctx.projectId,
          createdById: ctx.actor.userId,
          title: input.title?.trim() || "新建事件",
          startsAt,
          endsAt,
          allDay: Boolean(input.allDay),
          description: input.description,
          location: input.location,
          color: input.color ?? "blue",
          calendarId: input.calendarId,
          repeat: input.repeat && input.repeat !== "none" ? input.repeat : null,
          repeatUntil: input.repeatUntil ? new Date(input.repeatUntil) : null,
          reminderMinutes: input.reminderMinutes,
          status: input.status,
          source: ctx.actor.type === "agent" ? "AI" : "MANUAL",
          metadata: {
            sourceIds: ctx.sourceIds ?? [],
            agentJobId: ctx.actor.agentJobId ?? null,
            attendees: input.attendees ?? [],
          },
        },
      }));
    }
    const changeSet = await createChangeSet(tx, ctx, `创建 ${events.length} 个日程`, events.map((event) => ({
      resourceType: "calendar-event",
      resourceId: event.id,
      action: "create",
      after: event,
    })));
    return { events, changeSetId: changeSet.id };
  });
}

export type CalendarEventPatch = Partial<CalendarEventInput>;

export async function updateCalendarEvent(
  ctx: CommandContext,
  eventId: string,
  patch: CalendarEventPatch,
  expectedVersion?: number,
) {
  return runCommand(ctx, "calendar-event.updated", "calendar:write", async (tx) => {
    const before = await tx.calendarEvent.findFirst({ where: { id: eventId, workspaceId: ctx.workspaceId } });
    if (!before) throw new CommandError("日程不存在", 404, "EVENT_NOT_FOUND");
    if (ctx.projectId && before.projectId !== ctx.projectId) {
      throw new CommandError("日程不属于授权项目", 403, "PROJECT_FORBIDDEN");
    }
    const startsAt = patch.startsAt ? new Date(patch.startsAt) : before.startsAt;
    const endsAt = patch.endsAt ? new Date(patch.endsAt) : before.endsAt;
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || endsAt <= startsAt) {
      throw new CommandError("日程时间无效", 400, "INVALID_EVENT_TIME");
    }
    const metadata = patch.attendees === undefined
      ? undefined
      : {
        ...((before.metadata ?? {}) as Record<string, Prisma.JsonValue>),
        attendees: patch.attendees,
      } as Prisma.InputJsonValue;
    const changed = await tx.calendarEvent.updateMany({
      where: { id: before.id, version: expectedVersion ?? ctx.expectedVersion ?? before.version },
      data: {
        title: patch.title?.trim() || before.title,
        description: patch.description === undefined ? before.description : patch.description,
        location: patch.location === undefined ? before.location : patch.location,
        startsAt,
        endsAt,
        allDay: patch.allDay ?? before.allDay,
        color: patch.color ?? before.color,
        calendarId: patch.calendarId === undefined ? before.calendarId : patch.calendarId,
        repeat: patch.repeat === undefined ? before.repeat : patch.repeat === "none" ? null : patch.repeat,
        repeatUntil: patch.repeatUntil === undefined ? before.repeatUntil : patch.repeatUntil ? new Date(patch.repeatUntil) : null,
        reminderMinutes: patch.reminderMinutes === undefined ? before.reminderMinutes : patch.reminderMinutes,
        status: patch.status ?? before.status,
        metadata,
        version: { increment: 1 },
      },
    });
    if (!changed.count) throw new CommandError("日程已被其他人修改，请刷新后重试", 409, "VERSION_CONFLICT");
    const event = await tx.calendarEvent.findUniqueOrThrow({ where: { id: before.id } });
    const changeSet = await createChangeSet(tx, ctx, `更新日程「${event.title}」`, [{
      resourceType: "calendar-event",
      resourceId: event.id,
      action: "update",
      before,
      after: event,
    }]);
    return { event, changeSetId: changeSet.id };
  });
}

export async function archiveCalendarEvent(ctx: CommandContext, eventId: string, expectedVersion?: number) {
  return runCommand(ctx, "calendar-event.archived", "resources:archive", async (tx) => {
    const before = await tx.calendarEvent.findFirst({ where: { id: eventId, workspaceId: ctx.workspaceId } });
    if (!before) throw new CommandError("日程不存在", 404, "EVENT_NOT_FOUND");
    if (ctx.projectId && before.projectId !== ctx.projectId) {
      throw new CommandError("日程不属于授权项目", 403, "PROJECT_FORBIDDEN");
    }
    const changed = await tx.calendarEvent.updateMany({
      where: { id: before.id, version: expectedVersion ?? ctx.expectedVersion ?? before.version },
      data: {
        status: "CANCELLED",
        metadata: { ...((before.metadata ?? {}) as object), archived: true } as Prisma.InputJsonValue,
        version: { increment: 1 },
      },
    });
    if (!changed.count) throw new CommandError("日程已被其他人修改，请刷新后重试", 409, "VERSION_CONFLICT");
    const event = await tx.calendarEvent.findUniqueOrThrow({ where: { id: before.id } });
    const changeSet = await createChangeSet(tx, ctx, `归档日程「${event.title}」`, [{
      resourceType: "calendar-event",
      resourceId: event.id,
      action: "archive",
      before,
      after: event,
    }]);
    return { event, changeSetId: changeSet.id };
  });
}
