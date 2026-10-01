import { NextResponse } from "next/server";
import { getRouteUser } from "@/lib/supabase/route";

export const runtime = "nodejs";

const BUCKET = "closeflow-files";
const MAX_FILE_SIZE = 20 * 1024 * 1024;

async function getWorkspaceId(
  supabase: Awaited<ReturnType<typeof getRouteUser>>["supabase"],
  userId: string,
  requestedWorkspaceId: string | null,
) {
  let query = supabase
    .from("workspace_members")
    .select("workspace_id, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (requestedWorkspaceId) query = query.eq("workspace_id", requestedWorkspaceId);
  const { data, error } = await query.limit(1).maybeSingle();
  if (error) throw error;
  return data?.workspace_id as string | undefined;
}

function safeFilename(value: string) {
  const cleaned = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(-120);
  return cleaned || "file";
}

export async function GET(request: Request) {
  const { supabase, user, error } = await getRouteUser(request);
  if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  let workspaceId: string | undefined;
  try {
    workspaceId = await getWorkspaceId(supabase, user.id, url.searchParams.get("workspaceId"));
  } catch {
    return NextResponse.json({ error: "Could not resolve workspace." }, { status: 500 });
  }
  if (!workspaceId) return NextResponse.json({ error: "Workspace access required." }, { status: 403 });

  const path = url.searchParams.get("path");
  if (path) {
    if (!path.startsWith(`${workspaceId}/`) || path.includes("..")) {
      return NextResponse.json({ error: "File not found." }, { status: 404 });
    }
    const { data, error: downloadError } = await supabase.storage.from(BUCKET).download(path);
    if (downloadError || !data) return NextResponse.json({ error: "File not found." }, { status: 404 });
    const filename = path.split("/").at(-1)?.replace(/^[0-9a-f-]+-/i, "") || "download";
    return new Response(await data.arrayBuffer(), {
      headers: {
        "Content-Type": data.type || "application/octet-stream",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
        "Content-Length": String(data.size),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }

  const { data, error: listError } = await supabase.storage.from(BUCKET).list(workspaceId, {
    limit: 100,
    sortBy: { column: "created_at", order: "desc" },
  });
  if (listError) return NextResponse.json({ error: "Could not load files." }, { status: 500 });
  const files = (data || []).filter((item) => item.id && item.name).map((item) => ({
    name: item.name.replace(/^[0-9a-f-]+-/i, ""),
    path: `${workspaceId}/${item.name}`,
    size: item.metadata?.size ?? 0,
    contentType: item.metadata?.mimetype ?? "application/octet-stream",
    createdAt: item.created_at ?? item.updated_at ?? null,
  }));
  return NextResponse.json({ workspaceId, files });
}

export async function POST(request: Request) {
  const { supabase, user, error } = await getRouteUser(request);
  if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "A file is required." }, { status: 400 });
  }
  const file = form.get("file");
  const requestedWorkspaceId = form.get("workspaceId");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Choose a non-empty file." }, { status: 400 });
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "Files must be 20 MB or smaller." }, { status: 413 });
  }

  let workspaceId: string | undefined;
  try {
    workspaceId = await getWorkspaceId(
      supabase,
      user.id,
      typeof requestedWorkspaceId === "string" ? requestedWorkspaceId : null,
    );
  } catch {
    return NextResponse.json({ error: "Could not resolve workspace." }, { status: 500 });
  }
  if (!workspaceId) return NextResponse.json({ error: "Workspace access required." }, { status: 403 });

  const path = `${workspaceId}/${crypto.randomUUID()}-${safeFilename(file.name)}`;
  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });
  if (uploadError) return NextResponse.json({ error: "File upload failed." }, { status: 500 });
  return NextResponse.json({ uploaded: true }, { status: 201 });
}

export async function DELETE(request: Request) {
  const { supabase, user, error } = await getRouteUser(request);
  if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { workspaceId?: unknown; path?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const { workspaceId: requestedWorkspaceId, path } = body;
  if (typeof path !== "string" || typeof requestedWorkspaceId !== "string") {
    return NextResponse.json({ error: "Invalid file." }, { status: 400 });
  }

  let workspaceId: string | undefined;
  try {
    workspaceId = await getWorkspaceId(supabase, user.id, requestedWorkspaceId);
  } catch {
    return NextResponse.json({ error: "Could not resolve workspace." }, { status: 500 });
  }
  if (!workspaceId) return NextResponse.json({ error: "Workspace access required." }, { status: 403 });
  if (!path.startsWith(`${workspaceId}/`) || path.includes("..")) {
    return NextResponse.json({ error: "File not found." }, { status: 404 });
  }

  const { error: deleteError } = await supabase.storage.from(BUCKET).remove([path]);
  if (deleteError) return NextResponse.json({ error: "File deletion failed." }, { status: 500 });
  return NextResponse.json({ deleted: true });
}
