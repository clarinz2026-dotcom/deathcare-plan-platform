import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query, MutationCtx } from "./_generated/server";

const LOGO_SETTING_KEY = "app_logo";

/**
 * Public app settings (no auth needed — used on the landing & sign-in pages too).
 * Currently exposes just the configured logo URL (or null when using the default).
 */
export const get = query({
  args: {},
  handler: async (ctx) => {
    const row = await ctx.db
      .query("system_settings")
      .withIndex("by_key", (q) => q.eq("key", LOGO_SETTING_KEY))
      .first();
    return { logoUrl: row?.value && row.value.trim() !== "" ? row.value : null };
  },
});

/** Resolve the acting user and ensure they may change branding (Super Admin or CEO). */
async function requireBrandingAccess(ctx: MutationCtx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not authenticated");

  const user = await ctx.db.get(userId);
  if (!user || (user.role !== "super_admin" && user.role !== "ceo")) {
    throw new Error("Only the Super Admin or CEO can change the logo.");
  }
  return { userId, name: (user.name ?? user.email) || "Unknown" };
}

async function saveLogo(ctx: MutationCtx, url: string, actor: { userId: Id<"users">; name: string }) {
  const existing = await ctx.db
    .query("system_settings")
    .withIndex("by_key", (q) => q.eq("key", LOGO_SETTING_KEY))
    .first();

  if (existing) {
    await ctx.db.patch(existing._id, { value: url });
  } else {
    await ctx.db.insert("system_settings", {
      key: LOGO_SETTING_KEY,
      value: url,
      lockedAt: Date.now(),
      lockedBy: actor.userId,
    });
  }

  await ctx.db.insert("audit_log", {
    action: "update",
    entityType: "client", // reused as a generic system event (existing convention)
    entityId: "branding-logo",
    userId: actor.userId,
    userName: actor.name,
    description: url ? `App logo changed` : "App logo reset to default",
    oldValues: {},
    newValues: { logoUrl: url },
    timestamp: Date.now(),
  });
}

/** Set the logo from a public image URL. Pass an empty string to reset to the default logo. */
export const setLogoFromUrl = mutation({
  args: { url: v.string() },
  handler: async (ctx, args) => {
    const actor = await requireBrandingAccess(ctx);
    const url = args.url.trim();

    if (url !== "") {
      const isHttp = /^https?:\/\//i.test(url);
      const isData = /^data:image\//i.test(url);
      if (!isHttp && !isData) {
        throw new Error("Logo must be a valid image URL (http/https).");
      }
    }

    await saveLogo(ctx, url, actor);
    return { logoUrl: url || null };
  },
});

/** Get a one-time URL used to upload a logo image file. */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireBrandingAccess(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

/** Store an uploaded logo file and activate it. */
export const setLogoFromUpload = mutation({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    const actor = await requireBrandingAccess(ctx);
    const url = await ctx.storage.getUrl(args.storageId);
    if (!url) throw new Error("Upload failed — no URL returned.");

    await saveLogo(ctx, url, actor);
    return { logoUrl: url };
  },
});
