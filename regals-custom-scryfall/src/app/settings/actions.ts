"use server";

import { revalidatePath } from "next/cache";
import { ObjectId } from "mongodb";
import userData, { AccountInputError } from "@/data/users";
import { authenticatedOwnerId, authenticatedUserId } from "@/server/auth";

export async function saveProfile(formData: FormData) {
  try {
    const id = await authenticatedUserId();
    if (!id) return { error: "Sign in to update your account." };

    const newPassword = String(formData.get("newPassword") ?? "");
    if (newPassword !== String(formData.get("confirmPassword") ?? "")) {
      return { error: "New passwords do not match." };
    }

    const profile = await userData.updateProfile(id, {
      username: String(formData.get("username") ?? ""),
      email: String(formData.get("email") ?? ""),
    }, String(formData.get("currentPassword") ?? ""), newPassword);

    revalidatePath("/settings");
    return { profile };
  } catch (error) {
    if (error instanceof AccountInputError) return { error: error.message };
    console.error("Profile save failed", error instanceof Error ? error.name : undefined);
    return { error: "Could not save your account. Please try again." };
  }
}

export async function saveAccount(accountId: string, formData: FormData) {
  try {
    const ownerId = await authenticatedOwnerId();
    if (!ownerId) return { error: "Owner access is required." };
    if (accountId && (typeof accountId !== "string" || !ObjectId.isValid(accountId))) {
      return { error: "Invalid account ID." };
    }

    const details = {
      username: String(formData.get("username") ?? ""),
      email: String(formData.get("email") ?? ""),
      permissionLevel: String(formData.get("permissionLevel") ?? ""),
    };
    const password = String(formData.get("password") ?? "");

    if (accountId) {
      const id = new ObjectId(accountId);
      if (ownerId.equals(id)) return { error: "Select another account to edit." };
      await userData.updateAccount(id, details, password);
    } else {
      await userData.addUser(details, password);
    }
    revalidatePath("/settings");
    return { message: accountId ? "Account updated." : "Account created." };
  } catch (error) {
    if (error instanceof AccountInputError) return { error: error.message };
    console.error("Account save failed", error instanceof Error ? error.name : undefined);
    return { error: "Could not save the account. Please try again." };
  }
}
