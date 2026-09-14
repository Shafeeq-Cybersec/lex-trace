import type {
  AppState,
  Capabilities,
  CaseListItem,
  Job,
  TraceCase,
} from "../shared/types.js";
export async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch("/api" + path, {
      ...options,
      headers: {
        "X-Trace-Request": "1",
        ...(options.body && !(options.body instanceof FormData)
          ? { "Content-Type": "application/json" }
          : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new Error(
      "Cannot reach TRACE. Check your connection. Your saved review remains available.",
    );
  }
  const data = await response.json().catch(() => ({
    error:
      "The server returned an unreadable response. Your saved review remains available.",
  }));
  if (!response.ok)
    throw new Error(
      data.error || "This request could not finish. Please retry.",
    );
  return data;
}
export const fetchCapabilities = () => request<Capabilities>("/capabilities");
export const fetchCases = () => request<CaseListItem[]>("/cases");
export const fetchCase = (id: string) =>
  request<AppState>("/case/" + encodeURIComponent(id));
export async function createCase(title: string) {
  return (
    await request<{ case: TraceCase }>("/cases", {
      method: "POST",
      body: JSON.stringify({ title }),
    })
  ).case;
}
export async function loadDemoCase() {
  return (
    await request<{ case: TraceCase }>("/case/example/load", {
      method: "POST",
      body: "{}",
    })
  ).case;
}
export const resetDemoCase = loadDemoCase;
export async function uploadBatchFiles(id: string, files: File[]) {
  const form = new FormData();
  files.forEach((f) => form.append("files", f));
  return request<{ jobId: string | null; message?: string }>(
    "/case/" + id + "/upload-batch",
    { method: "POST", body: form },
  );
}
export const uploadFile = (id: string, file: File) =>
  uploadBatchFiles(id, [file]);
export const fetchJob = (id: string, jid: string) =>
  request<Job>("/case/" + id + "/jobs/" + jid);
export const addDemoAddition = (id: string) =>
  request<{ jobId: string | null; message?: string }>(
    "/case/" + id + "/add-demo-addition",
    { method: "POST", body: "{}" },
  );
export const retryReview = (id: string) =>
  request<{ jobId: string }>("/case/" + id + "/review", {
    method: "POST",
    body: "{}",
  });
export const addStatement = (id: string, text: string, title: string) =>
  request<{ jobId: string | null; message?: string }>(
    "/case/" + id + "/statement",
    { method: "POST", body: JSON.stringify({ text, title }) },
  );
export const deleteCase = (id: string) =>
  request("/case/" + id, { method: "DELETE" });
