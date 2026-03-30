"use server";

import { revalidatePath } from "next/cache";

import { createProxy, deleteProxy } from "@/lib/api";

function parseTags(raw: FormDataEntryValue | null) {
  if (typeof raw !== "string" || !raw.trim()) {
    return [];
  }

  return raw
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function parseOptional(raw: FormDataEntryValue | null) {
  if (typeof raw !== "string") {
    return undefined;
  }

  const trimmed = raw.trim();
  return trimmed ? trimmed : undefined;
}

export async function createProxyAction(formData: FormData) {
  const host = parseOptional(formData.get("host"));
  const scheme = parseOptional(formData.get("scheme")) ?? "http";
  const portValue = parseOptional(formData.get("port"));

  if (!host || !portValue) {
    throw new Error("Host and port are required.");
  }

  const port = Number(portValue);

  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error("Port must be a valid integer between 1 and 65535.");
  }

  await createProxy({
    scheme,
    host,
    port,
    username: parseOptional(formData.get("username")),
    password: parseOptional(formData.get("password")),
    tags: parseTags(formData.get("tags")),
  });

  revalidatePath("/");
  revalidatePath("/metrics");
  revalidatePath("/proxies");
}

export async function deleteProxyAction(formData: FormData) {
  const id = parseOptional(formData.get("id"));

  if (!id) {
    throw new Error("Proxy id is required.");
  }

  await deleteProxy(id);

  revalidatePath("/");
  revalidatePath("/metrics");
  revalidatePath("/proxies");
}
