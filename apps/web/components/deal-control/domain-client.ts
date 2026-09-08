"use client";

import { useRef } from "react";

export async function readDomain<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, { cache: "no-store", signal });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body.detail ?? "The requested records could not be loaded.");
    Object.assign(error, { code: body.code, status: response.status });
    throw error;
  }
  return body.data as T;
}

/** Preserve a command identity while its exact reviewed request is retried. */
export function useDomainCommand() {
  const keys = useRef(new Map<string, string>());
  return async function command<T>(url: string, body: object, version?: number | string): Promise<T> {
    const identity = JSON.stringify([url, body, version]);
    let key = keys.current.get(identity);
    if (!key) { key = crypto.randomUUID(); keys.current.set(identity, key); }
    const response = await fetch(url, { method: "POST", headers: { "content-type": "application/json", "idempotency-key": key, ...(version === undefined ? {} : { "if-match": typeof version === "number" ? `"${version}"` : version }) }, body: JSON.stringify(body) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.detail ?? "The command was not accepted. Reload its current scope and retry.");
    return result.data as T;
  };
}

export const words = (value: string | null | undefined) => value?.replaceAll("_", " ") ?? "Not recorded";
export const lines = (value: string) => value.split("\n").map((line) => line.trim()).filter(Boolean);
export const shortId = (value: string) => value.slice(0, 8);
