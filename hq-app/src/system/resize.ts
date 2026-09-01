/**
 * Downscale to fit within `maxEdge` and re-encode as JPEG. Runs entirely in
 * the browser so a 12MP phone photo becomes a ~300KB upload.
 */
export async function resizeImage(
  file: File, maxEdge = 1600, quality = 0.82,
): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not prepare the image for upload.');
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', quality));
  if (!blob) throw new Error('Could not encode the image.');
  return blob;
}
