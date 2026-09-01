import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Frame } from '../ui/Frame';
import { PhotoCompare } from '../ui/PhotoCompare';
import { useSystem } from '../state/SystemContext';
import { useNotify } from '../state/useNotifications';
import { signedUrlFor, uploadPhoto } from '../data/photos';
import { award } from '../data/xpEvents';
import { addDays, todayISO } from '../system/dates';
import { XP } from '../system/xp';
import type { Pose, ProgressPhoto } from '../types';

const POSES: Pose[] = ['front', 'side', 'back', 'other'];

export function BodyRecord() {
  const { snapshot, reload } = useSystem();
  const notify = useNotify();
  const photos = snapshot.photos;
  const today = todayISO();
  // Matches the 400-day catch-up horizon (see SystemContext's runCatchup):
  // a photo dated outside this window could otherwise make the next load
  // try to penalize years of "missed" days.
  const minTakenOn = addDays(today, -400);

  const fileRef = useRef<HTMLInputElement>(null);
  const [takenOn, setTakenOn] = useState(today);
  const [pose, setPose] = useState<Pose>('front');
  const [weightLb, setWeightLb] = useState('');
  const [bodyfatPct, setBodyfatPct] = useState('');
  const [hasFile, setHasFile] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function onUpload(e: FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setError('');
    setBusy(true);

    try {
      await uploadPhoto({
        file, takenOn, pose,
        weightLb: weightLb.trim() === '' ? null : Number(weightLb),
        bodyfatPct: bodyfatPct.trim() === '' ? null : Number(bodyfatPct),
        note: null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
      return;
    }

    // The object is uploaded and the row inserted successfully. Clear the
    // pending selection now — there is no unique index on kind='photo' the
    // way journal's (kind, occurred_on) index backstops a double award, so a
    // second click after this point must never re-upload the same file.
    if (fileRef.current) fileRef.current.value = '';
    setHasFile(false);
    setWeightLb('');
    setBodyfatPct('');

    try {
      // Photo has no unique index backstop the way journal's (kind,
      // occurred_on) index does (a migration to add one is queued but not
      // yet applied — see hq-backend/supabase/migrations/0005). Enforce the
      // once-per-day rule client-side in the meantime: check the CURRENT
      // snapshot at submit time, mirroring how JournalCapture derives
      // `isNew`, so re-uploading (e.g. a second pose the same day) never
      // pays EXP twice for one day.
      const alreadyAwarded = snapshot.events.some(
        (ev) => ev.kind === 'photo' && ev.occurred_on === takenOn,
      );
      if (!alreadyAwarded) {
        await award({ amount: XP.photo, kind: 'photo', domain: 'physical', occurredOn: takenOn });
      }
      await reload();
      notify({ kind: 'RECORD UPDATED', huge: 'BODY RECORD', lead: 'Progress photo archived.' });
    } catch (err) {
      setError(`Photo saved, but recording EXP failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="body-record">
      <Frame title="Capture" meta={`+${XP.photo} EXP`}>
        <form className="photo-form" onSubmit={(e) => void onUpload(e)}>
          <input ref={fileRef} className="field" type="file" accept="image/*" capture="environment"
                 aria-label="Progress photo" onChange={(e) => setHasFile(!!e.target.files?.[0])} />
          <div className="photo-form__row">
            <input className="field field--date" type="date" value={takenOn}
                   min={minTakenOn} max={today}
                   onChange={(e) => setTakenOn(e.target.value)} aria-label="Date taken" />
            <select className="field" value={pose} aria-label="Pose"
                    onChange={(e) => setPose(e.target.value as Pose)}>
              {POSES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <input className="field field--num" type="number" step="0.1" placeholder="Weight (lb)"
                   value={weightLb} onChange={(e) => setWeightLb(e.target.value)}
                   aria-label="Weight in pounds (optional)" />
            <input className="field field--num" type="number" step="0.1" placeholder="Body fat %"
                   value={bodyfatPct} onChange={(e) => setBodyfatPct(e.target.value)}
                   aria-label="Body fat percent (optional)" />
            <button className="btn" type="submit" disabled={busy || !hasFile}>
              {busy ? 'Uploading…' : 'Upload'}
            </button>
          </div>
          {error && <p className="inline-error">{error}</p>}
        </form>
      </Frame>

      <Timeline photos={photos} />

      <PhotoCompare photos={photos} />
    </div>
  );
}

/** Photos grouped by date, newest first (matches `listPhotos`' own order). */
function Timeline({ photos }: { photos: ProgressPhoto[] }) {
  const [urls, setUrls] = useState<Map<string, string>>(new Map());
  const [error, setError] = useState('');

  useEffect(() => {
    if (photos.length === 0) return;
    let cancelled = false;
    Promise.all(photos.map(async (p) => [p.storage_path, await signedUrlFor(p.storage_path)] as const))
      .then((entries) => { if (!cancelled) setUrls(new Map(entries)); })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : String(e)); });
    return () => { cancelled = true; };
  }, [photos]);

  const groups: Array<{ date: string; photos: ProgressPhoto[] }> = [];
  for (const p of photos) {
    const g = groups[groups.length - 1];
    if (g && g.date === p.taken_on) g.photos.push(p);
    else groups.push({ date: p.taken_on, photos: [p] });
  }

  return (
    <Frame title="Timeline" meta={`${photos.length} PHOTOS`}>
      {photos.length === 0 ? (
        <p className="quest__empty">No progress photos yet.</p>
      ) : (
        <div className="timeline">
          {groups.map((g) => (
            <div className="timeline__group" key={g.date}>
              <span className="timeline__date">{g.date}</span>
              <div className="timeline__row">
                {g.photos.map((p) => {
                  const url = urls.get(p.storage_path);
                  return (
                    <div className="thumb" key={p.id}>
                      {url
                        ? <img className="thumb__img" src={url} alt={`${p.pose} progress photo`} />
                        : <div className="thumb__placeholder" aria-hidden="true" />}
                      <span className="thumb__pose">{p.pose}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
      {error && <p className="inline-error">{error}</p>}
    </Frame>
  );
}
