import { createClient } from "@supabase/supabase-js";
import { auth } from "./firebase-admin-client.js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const bucketName = "auvne-images";

export const imageStorageConfigError = !supabaseUrl || !supabasePublishableKey
  ? "Add the Supabase project URL and publishable key to .env.local, then restart the app."
  : "";

const supabase = imageStorageConfigError ? null : createClient(supabaseUrl, supabasePublishableKey, {
  accessToken: async () => auth?.currentUser?.getIdToken() ?? null
});

const acceptedImageTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"]
]);

export async function uploadStoreImage(file, folder) {
  if (!supabase) throw new Error(imageStorageConfigError);
  if (!auth?.currentUser) throw new Error("Please sign in again before uploading an image.");
  if (!acceptedImageTypes.has(file.type)) throw new Error("Choose a JPEG, PNG, or WebP image.");
  if (file.size > 5 * 1024 * 1024) throw new Error("Images must be 5 MB or smaller.");

  const uid = auth.currentUser.uid;
  const path = `admin/${uid}/${folder}/${crypto.randomUUID()}.${acceptedImageTypes.get(file.type)}`;
  const { data, error } = await supabase.storage.from(bucketName).upload(path, file, {
    cacheControl: "31536000",
    contentType: file.type,
    upsert: false
  });
  if (error) throw error;

  return {
    url: supabase.storage.from(bucketName).getPublicUrl(data.path).data.publicUrl,
    path: data.path
  };
}

export async function deleteStoreImage(url) {
  if (!supabase || !auth?.currentUser || typeof url !== "string") return;

  const publicPrefix = `${supabaseUrl}/storage/v1/object/public/${bucketName}/`;
  if (!url.startsWith(publicPrefix)) return;

  const path = url.slice(publicPrefix.length);
  if (!path.startsWith(`admin/${auth.currentUser.uid}/`)) return;

  const { error } = await supabase.storage.from(bucketName).remove([path]);
  if (error) throw error;
}
