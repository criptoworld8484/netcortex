"use server";

import { redirect } from "next/navigation";
import { createSession, destroySession, hasPassword, setPassword, verifyPassword } from "../auth";

export interface FormState {
  error?: string;
  ok?: boolean;
}

export async function setupAction(_prev: FormState, fd: FormData): Promise<FormState> {
  if (hasPassword()) redirect("/login");
  const pw = String(fd.get("password") ?? "");
  const confirm = String(fd.get("confirm") ?? "");
  if (pw.length < 8) return { error: "Password must be at least 8 characters." };
  if (pw !== confirm) return { error: "Passwords do not match." };
  await setPassword(pw);
  await createSession();
  redirect("/");
}

export async function loginAction(_prev: FormState, fd: FormData): Promise<FormState> {
  if (!hasPassword()) redirect("/setup");
  const pw = String(fd.get("password") ?? "");
  if (!verifyPassword(pw)) return { error: "Incorrect password." };
  await createSession();
  redirect("/");
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/login");
}
