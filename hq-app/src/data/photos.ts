import { supabase } from '../supabaseClient';
import { resizeImage } from '../system/resize';
import type { Pose, ProgressPhoto } from '../types';

const BUCKET = 'hq-photos';

export async function listPhotos(): Promise<ProgressPhoto[]> {
  const { data, error } = await supabase
    .from('progress_photos').select('*').order('taken_on', { ascending: false });
  if (error) throw error;
  return data as ProgressPhoto[];
}

export interface UploadInput {
  file: File;
  takenOn: string;
  pose: Pose;
  weightLb?: number | null;
  bodyfatPct?: number | null;
  note?: string | null;
}

export async function uploadPhoto(input: UploadInput): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) throw new Error('Not signed in.');

  const blob = await resizeImage(input.file);
  const path = `${uid}/${input.takenOn}-${input.pose}-${crypto.randomUUID()}.jpg`;

  const up = await supabase.storage.from(BUCKET)
    .upload(path, blob, { contentType: 'image/jpeg', upsert: false });
  if (up.error) throw up.error;

  const { error } = await supabase.from('progress_photos').insert({
    taken_on: input.takenOn, pose: input.pose, storage_path: path,
    weight_lb: input.weightLb ?? null, bodyfat_pct: input.bodyfatPct ?? null,
    note: input.note ?? null,
  });
  if (error) {
    // Do not leave an orphaned object behind if the row insert fails.
    await supabase.storage.from(BUCKET).remove([path]);
    throw error;
  }
}

/** Photos are private objects; they are only ever read through signed URLs. */
export async function signedUrlFor(path: string, seconds = 3600): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET).createSignedUrl(path, seconds);
  if (error) throw error;
  return data.signedUrl;
}

export async function deletePhoto(id: string, path: string): Promise<void> {
  const { error } = await supabase.from('progress_photos').delete().eq('id', id);
  if (error) throw error;
  await supabase.storage.from(BUCKET).remove([path]);
}
