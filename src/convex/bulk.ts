import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation } from "./_generated/server";

/**
 * Bulk create clients from parsed data.
 * Expects an array of client objects with the required fields.
 */
export const bulkCreateClients = mutation({
  args: {
    clients: v.array(
      v.object({
        firstName: v.string(),
        lastName: v.string(),
        middleName: v.optional(v.string()),
        dateOfBirth: v.string(), // ISO date string
        gender: v.union(v.literal("male"), v.literal("female"), v.literal("other")),
        contactNumber: v.string(),
        email: v.optional(v.string()),
        address: v.string(),
        city: v.string(),
        province: v.string(),
        zipCode: v.string(),
        occupation: v.optional(v.string()),
        beneficiaryName: v.string(),
        beneficiaryRelationship: v.string(),
        beneficiaryContact: v.optional(v.string()),
        notes: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const user = await ctx.db.get(userId);
    const userName = user?.name || user?.email || "Unknown";

    const results = {
      success: 0,
      failed: 0,
      errors: [] as Array<{ row: number; error: string }>,
      created: [] as string[],
    };

    for (let i = 0; i < args.clients.length; i++) {
      const client = args.clients[i];
      try {
        // Parse date of birth
        const dob = new Date(client.dateOfBirth);
        if (isNaN(dob.getTime())) {
          throw new Error(`Invalid date of birth: ${client.dateOfBirth}`);
        }

        // Create client
        const clientId = await ctx.db.insert("clients", {
          firstName: client.firstName,
          lastName: client.lastName,
          middleName: client.middleName || undefined,
          dateOfBirth: dob.getTime(),
          gender: client.gender,
          contactNumber: client.contactNumber,
          email: client.email || undefined,
          address: client.address,
          city: client.city,
          province: client.province,
          zipCode: client.zipCode,
          occupation: client.occupation || undefined,
          beneficiaryName: client.beneficiaryName,
          beneficiaryRelationship: client.beneficiaryRelationship,
          beneficiaryContact: client.beneficiaryContact || undefined,
          notes: client.notes || undefined,
          createdAt: Date.now(),
          createdBy: userId,
        });

        // Log audit entry
        await ctx.db.insert("audit_log", {
          action: "create",
          entityType: "client",
          entityId: clientId,
          userId,
          userName,
          description: `Client ${client.firstName} ${client.lastName} created via bulk upload`,
          newValues: {
            firstName: client.firstName,
            lastName: client.lastName,
            contactNumber: client.contactNumber,
            city: client.city,
          },
          timestamp: Date.now(),
        });

        results.success++;
        results.created.push(clientId);
      } catch (error) {
        results.failed++;
        results.errors.push({
          row: i + 1,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    // Log bulk upload summary
    await ctx.db.insert("audit_log", {
      action: "create",
      entityType: "client",
      entityId: "bulk-upload",
      userId,
      userName,
      description: `Bulk upload completed: ${results.success} created, ${results.failed} failed`,
      newValues: {
        totalRows: args.clients.length,
        success: results.success,
        failed: results.failed,
        errors: results.errors,
      },
      timestamp: Date.now(),
    });

    return results;
  },
});
