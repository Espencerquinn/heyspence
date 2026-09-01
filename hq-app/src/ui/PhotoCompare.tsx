import { useEffect, useState } from 'react';
import { Frame } from './Frame';
import { signedUrlFor } from '../data/photos';
import type { ProgressPhoto } from '../types';

/**
 * Two date pickers, each backed by the earliest/latest available date so the
 * comparison people actually want — first photo versus most recent — is
 * what shows on first render.
 */
export function PhotoCompare({ photos }: { photos: ProgressPhoto[] }) {
  // `photos` is already ordered taken_on descending (listPhotos' own order).
  const dates = Array.from(new Set(photos.map((p) => p.taken_on))).sort();
  const earliest = dates[0] ?? '';
  const latest = dates[dates.length - 1] ?? '';

  const [leftDate, setLeftDate] = useState(earliest);
  const [rightDate, setRightDate] = useState(latest);
  const [urls, setUrls] = useState<Map<string, string>>(new Map());
  const [error, setError] = useState('');

  // Keep the selections valid as the photo set changes (e.g. right after an
  // upload) without clobbering a choice the viewer already made.
  useEffect(() => {
    if (dates.length === 0) return;
    setLeftDate((cur) => (dates.includes(cur) ? cur : earliest));
    setRightDate((cur) => (dates.includes(cur) ? cur : latest));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dates.join(',')]);

  const leftPhoto = photos.find((p) => p.taken_on === leftDate);
  const rightPhoto = photos.find((p) => p.taken_on === rightDate);

  // Signed URLs expire — resolve fresh ones for whatever is on screen and
  // never persist them beyond this component's state.
  useEffect(() => {
    const targets = [leftPhoto, rightPhoto].filter((p): p is ProgressPhoto => !!p);
    if (targets.length === 0) return;
    let cancelled = false;
    Promise.all(targets.map(async (p) => [p.storage_path, await signedUrlFor(p.storage_path)] as const))
      .then((entries) => { if (!cancelled) setUrls(new Map(entries)); })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : String(e)); });
    return () => { cancelled = true; };
  }, [leftPhoto?.storage_path, rightPhoto?.storage_path]);

  if (dates.length === 0) {
    return (
      <Frame title="Compare">
        <p className="quest__empty">No photos yet to compare.</p>
      </Frame>
    );
  }

  return (
    <Frame title="Compare">
      <div className="compare">
        <CompareSide label="Earlier" date={leftDate} dates={dates}
                     onDate={setLeftDate} photo={leftPhoto} url={urls.get(leftPhoto?.storage_path ?? '')} />
        <CompareSide label="Later" date={rightDate} dates={dates}
                     onDate={setRightDate} photo={rightPhoto} url={urls.get(rightPhoto?.storage_path ?? '')} />
      </div>
      {error && <p className="inline-error">{error}</p>}
    </Frame>
  );
}

function CompareSide(props: {
  label: string; date: string; dates: string[]; onDate: (d: string) => void;
  photo: ProgressPhoto | undefined; url: string | undefined;
}) {
  const { label, date, dates, onDate, photo, url } = props;
  return (
    <div className="compare__side">
      <select className="field" value={date} aria-label={`${label} comparison date`}
              onChange={(e) => onDate(e.target.value)}>
        {dates.map((d) => <option key={d} value={d}>{d}</option>)}
      </select>
      <div className="compare__frame">
        {url
          ? <img className="compare__img" src={url} alt={photo ? `${photo.pose} progress photo` : ''} />
          : <div className="compare__placeholder" aria-hidden="true" />}
      </div>
      <p className="compare__caption">
        {date}
        {photo?.weight_lb != null && ` · ${photo.weight_lb} LB`}
      </p>
    </div>
  );
}
