"use server";

import { createClient } from "@supabase/supabase-js";

export async function deleteUserAccount(accessToken: string, userId: string) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Missing Supabase Server Credentials.");
  }

  // 1. Initialize the powerful Admin client using the Service Role Key
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  // 2. Security Check: Verify the token matches the user trying to be deleted
  const { data: { user }, error: verifyError } = await supabaseAdmin.auth.getUser(accessToken);

  if (verifyError || !user || user.id !== userId) {
    throw new Error("Unauthorized: Invalid user session.");
  }

  // 3. Destroy the user record in auth.users
  // Note: If your database has "Cascade Delete" set up on the foreign keys,
  // this will automatically wipe their directory profile and saved contacts too!
  const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

  if (deleteError) {
    throw new Error(deleteError.message);
  }

  return { success: true };
}