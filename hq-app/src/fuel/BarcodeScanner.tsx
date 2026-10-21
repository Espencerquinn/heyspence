import { useEffect, useRef, useState } from 'react';

/**
 * Rear-camera barcode scanner. iOS Safari still has no native BarcodeDetector,
 * so this uses the zxing-wasm ponyfill (loaded only when the scanner opens).
 */
export function BarcodeScanner({ onCode }: { onCode: (code: string) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState('');
  const [typed, setTyped] = useState('');

  useEffect(() => {
    let stream: MediaStream | null = null;
    let timer: number | undefined;
    let stopped = false;

    (async () => {
      try {
        const { BarcodeDetector } = await import('barcode-detector/ponyfill');
        const detector = new BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'] });
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }, audio: false,
        });
        if (stopped || !video.current) return;
        video.current.srcObject = stream;
        await video.current.play();
        const tick = async () => {
          if (stopped || !video.current) return;
          try {
            const hits = await detector.detect(video.current);
            if (hits[0]?.rawValue) { stopped = true; onCode(hits[0].rawValue); return; }
          } catch { /* frame not ready yet */ }
          timer = window.setTimeout(() => void tick(), 250);
        };
        void tick();
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    })();

    return () => {
      stopped = true;
      window.clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [onCode]);

  return (
    <div className="scanner">
      {error
        ? <p className="inline-error">Camera unavailable — {error}. Type the barcode instead.</p>
        : <video ref={video} className="scanner__video" playsInline muted />}
      <div className="mini-form">
        <input className="field" inputMode="numeric" placeholder="or type the barcode digits"
               value={typed} onChange={(e) => setTyped(e.target.value.replace(/\D/g, ''))} />
        <button type="button" className="btn btn--sm" disabled={typed.length < 8}
                onClick={() => onCode(typed)}>Look up</button>
      </div>
    </div>
  );
}
