import type {
  CouncilBodySummary,
  CouncilDocumentSummary,
  CouncilEventDetail,
  CouncilEventItemSummary,
  CouncilEventSummary,
  CouncilMatterSummary
} from "./civic-types";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^\d{2}:\d{2}(?::\d{2}(?:\.\d{1,6})?)?$/;
const EVENT_STATUSES = new Set<CouncilEventSummary["status"]>([
  "scheduled",
  "tbd",
  "deferred",
  "cancelled",
  "completed",
  "unknown"
]);

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function positiveInteger(value: unknown): number | null {
  return Number.isInteger(value) && Number(value) > 0 ? Number(value) : null;
}

function nullableInteger(value: unknown): number | null | undefined {
  return value === null ? null : Number.isInteger(value) ? Number(value) : undefined;
}

function requiredString(value: unknown, max = 20_000): string | null {
  return typeof value === "string" && value.length <= max ? value : null;
}

function nullableString(value: unknown, max = 20_000): string | null | undefined {
  return value === null ? null : typeof value === "string" && value.length <= max ? value : undefined;
}

function nullableBoolean(value: unknown): boolean | null | undefined {
  return value === null ? null : typeof value === "boolean" ? value : undefined;
}

function nullableUrl(value: unknown): string | null | undefined {
  if (value === null) return null;
  if (typeof value !== "string" || value.length > 2_048) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

function parseBody(value: unknown): CouncilBodySummary | null {
  const item = record(value);
  if (!item) return null;
  const bodyId = positiveInteger(item.body_id);
  const name = requiredString(item.name, 500);
  const bodyType = nullableString(item.body_type, 500);
  if (bodyId === null || name === null || bodyType === undefined) return null;
  return { body_id: bodyId, name, body_type: bodyType };
}

function parseEventSummary(value: unknown): CouncilEventSummary | null {
  const item = record(value);
  if (!item) return null;
  const eventId = positiveInteger(item.event_id);
  const body = parseBody(item.body);
  const title = requiredString(item.title, 1_000);
  const eventDate = requiredString(item.event_date, 10);
  const startTime = nullableString(item.start_time, 32);
  const endTime = nullableString(item.end_time, 32);
  const rawEventTime = nullableString(item.raw_event_time, 200);
  const rawEventEndTime = nullableString(item.raw_event_end_time, 200);
  const statusEvidence = requiredString(item.status_evidence, 2_000);
  const providerStatus = nullableString(item.provider_status, 500);
  const locationName = nullableString(item.location_name, 1_000);
  const locationAddress = nullableString(item.location_address, 1_000);
  const agendaUrl = nullableUrl(item.agenda_url);
  const minutesUrl = nullableUrl(item.minutes_url);
  const videoUrl = nullableUrl(item.video_url);
  const detailsUrl = nullableUrl(item.details_url);
  const publicCommentUrl = nullableUrl(item.public_comment_url);
  const agendaStatus = nullableString(item.agenda_status, 500);
  const minutesStatus = nullableString(item.minutes_status, 500);
  const videoStatus = nullableString(item.video_status, 500);

  if (
    eventId === null ||
    body === null ||
    title === null ||
    eventDate === null ||
    !DATE_PATTERN.test(eventDate) ||
    startTime === undefined ||
    (startTime !== null && !TIME_PATTERN.test(startTime)) ||
    endTime === undefined ||
    (endTime !== null && !TIME_PATTERN.test(endTime)) ||
    rawEventTime === undefined ||
    rawEventEndTime === undefined ||
    typeof item.time_tbd !== "boolean" ||
    typeof item.status !== "string" ||
    !EVENT_STATUSES.has(item.status as CouncilEventSummary["status"]) ||
    statusEvidence === null ||
    providerStatus === undefined ||
    locationName === undefined ||
    locationAddress === undefined ||
    agendaUrl === undefined ||
    minutesUrl === undefined ||
    videoUrl === undefined ||
    detailsUrl === undefined ||
    publicCommentUrl === undefined ||
    agendaStatus === undefined ||
    minutesStatus === undefined ||
    videoStatus === undefined
  ) {
    return null;
  }

  return {
    event_id: eventId,
    body,
    title,
    event_date: eventDate,
    start_time: startTime,
    end_time: endTime,
    raw_event_time: rawEventTime,
    raw_event_end_time: rawEventEndTime,
    time_tbd: item.time_tbd,
    status: item.status as CouncilEventSummary["status"],
    status_evidence: statusEvidence,
    provider_status: providerStatus,
    location_name: locationName,
    location_address: locationAddress,
    agenda_url: agendaUrl,
    minutes_url: minutesUrl,
    video_url: videoUrl,
    details_url: detailsUrl,
    public_comment_url: publicCommentUrl,
    agenda_status: agendaStatus,
    minutes_status: minutesStatus,
    video_status: videoStatus
  };
}

function parseDocument(value: unknown): CouncilDocumentSummary | null {
  const item = record(value);
  if (!item) return null;
  const documentId = positiveInteger(item.document_id);
  const name = requiredString(item.name, 1_000);
  const fileName = nullableString(item.file_name, 1_000);
  const description = nullableString(item.description);
  const documentType = nullableString(item.document_type, 500);
  const officialUrl = nullableUrl(item.official_url);
  const matterVersion = nullableString(item.matter_version, 200);
  const sortOrder = nullableInteger(item.sort_order);
  const showOnInternet = nullableBoolean(item.show_on_internet);
  const printWithReports = nullableBoolean(item.print_with_reports);
  if (
    documentId === null ||
    name === null ||
    fileName === undefined ||
    description === undefined ||
    documentType === undefined ||
    officialUrl === undefined ||
    matterVersion === undefined ||
    sortOrder === undefined ||
    showOnInternet === undefined ||
    printWithReports === undefined
  ) return null;
  return {
    document_id: documentId,
    file_name: fileName,
    name,
    description,
    document_type: documentType,
    official_url: officialUrl,
    matter_version: matterVersion,
    sort_order: sortOrder,
    show_on_internet: showOnInternet,
    print_with_reports: printWithReports
  };
}

function parseMatter(value: unknown): CouncilMatterSummary | null {
  const item = record(value);
  if (!item || !Array.isArray(item.documents) || item.documents.length > 250) return null;
  const matterId = positiveInteger(item.matter_id);
  const title = requiredString(item.title, 5_000);
  const documents = item.documents.map(parseDocument);
  const values = {
    file_number: nullableString(item.file_number, 500),
    name: nullableString(item.name, 1_000),
    matter_type: nullableString(item.matter_type, 500),
    matter_status: nullableString(item.matter_status, 500),
    introduction_date: nullableString(item.introduction_date, 10),
    agenda_date: nullableString(item.agenda_date, 10),
    passed_date: nullableString(item.passed_date, 10),
    enactment_date: nullableString(item.enactment_date, 10),
    enactment_number: nullableString(item.enactment_number, 500),
    requester: nullableString(item.requester, 1_000),
    notes: nullableString(item.notes),
    matter_version: nullableString(item.matter_version, 200)
  };
  const dateValues = [values.introduction_date, values.agenda_date, values.passed_date, values.enactment_date];
  if (
    matterId === null ||
    title === null ||
    documents.some((document) => document === null) ||
    Object.values(values).some((field) => field === undefined) ||
    dateValues.some((date) => date !== null && date !== undefined && !DATE_PATTERN.test(date))
  ) return null;
  return {
    matter_id: matterId,
    title,
    documents: documents as CouncilDocumentSummary[],
    ...(values as Omit<CouncilMatterSummary, "matter_id" | "title" | "documents">)
  };
}

function parseEventItem(value: unknown): CouncilEventItemSummary | null {
  const item = record(value);
  if (!item) return null;
  const eventItemId = positiveInteger(item.event_item_id);
  const matter = item.matter === null ? null : parseMatter(item.matter);
  const values = {
    agenda_sequence: nullableInteger(item.agenda_sequence),
    minutes_sequence: nullableInteger(item.minutes_sequence),
    agenda_number: nullableString(item.agenda_number, 500),
    title: nullableString(item.title, 5_000),
    action_name: nullableString(item.action_name, 1_000),
    action_text: nullableString(item.action_text, 5_000),
    agenda_note: nullableString(item.agenda_note),
    minutes_note: nullableString(item.minutes_note),
    passed_flag: nullableBoolean(item.passed_flag),
    roll_call_flag: nullableBoolean(item.roll_call_flag),
    tally: nullableString(item.tally, 1_000)
  };
  if (
    eventItemId === null ||
    (item.matter !== null && matter === null) ||
    Object.values(values).some((field) => field === undefined)
  ) return null;
  return { event_item_id: eventItemId, matter, ...(values as Omit<CouncilEventItemSummary, "event_item_id" | "matter">) };
}

export function parseCouncilEventDetail(value: unknown): CouncilEventDetail | null {
  const item = record(value);
  const summary = parseEventSummary(value);
  if (!item || !summary || !Array.isArray(item.items) || item.items.length > 1_000) return null;
  const publicComment = nullableString(item.public_comment);
  const items = item.items.map(parseEventItem);
  if (publicComment === undefined || items.some((eventItem) => eventItem === null)) return null;
  return { ...summary, public_comment: publicComment, items: items as CouncilEventItemSummary[] };
}
