import { useEffect, useRef, useState, type Ref } from 'react';
import { DOMAINS, DOMAIN_LABEL, type Domain } from '../types';
import { navigate, useRoute } from '../router';

export function Rail() {
  const route = useRoute();
  const isDomain = route.name === 'domain';
  const [pickerOpen, setPickerOpen] = useState(false);
  const domainsBtnRef = useRef<HTMLButtonElement>(null);

  const item = (
    key: string,
    label: string,
    to: string,
    active: boolean,
    extraClass = '',
    onClick: () => void = () => navigate(to),
    ref?: Ref<HTMLButtonElement>,
  ) => (
    <button
      key={key}
      ref={ref}
      className={`rail__item ${extraClass}`}
      aria-current={active ? 'page' : undefined}
      onClick={onClick}
    >
      <i className="pip" />
      <span>{label}</span>
    </button>
  );

  return (
    <nav className="rail" aria-label="Sections">
      {item('status', 'Status', 'status', route.name === 'status')}

      <div className="rail__group only-desktop">[ DOMAINS ]</div>
      {DOMAINS.map((d) =>
        item(d, DOMAIN_LABEL[d], d, isDomain && route.domain === d, 'rail__item--sub only-desktop'))}

      {/* Seven domains do not fit a phone bottom bar — mobile collapses them
          behind one entry that opens a picker sheet listing all seven. */}
      {item('domains', 'Domains', '', isDomain, 'only-mobile',
        () => setPickerOpen(true), domainsBtnRef)}

      {item('body', 'Body', 'body', route.name === 'body')}

      {pickerOpen && (
        <DomainPicker
          activeDomain={isDomain ? route.domain : null}
          onClose={() => { setPickerOpen(false); domainsBtnRef.current?.focus(); }}
        />
      )}
    </nav>
  );
}

function DomainPicker(props: {
  activeDomain: Domain | null;
  onClose: () => void;
}) {
  const { activeDomain, onClose } = props;
  const panelRef = useRef<HTMLDivElement>(null);
  const firstRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    firstRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const onPointerDown = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onPointerDown);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onPointerDown);
    };
  }, [onClose]);

  return (
    <div className="domain-picker" role="dialog" aria-modal="true" aria-label="Choose a domain">
      <div className="domain-picker__panel" ref={panelRef}>
        <i className="c tl" /><i className="c tr" /><i className="c bl" /><i className="c br" />
        {DOMAINS.map((d, i) => (
          <button
            key={d}
            ref={i === 0 ? firstRef : undefined}
            type="button"
            className="domain-picker__item"
            aria-current={activeDomain === d ? 'page' : undefined}
            onClick={() => { navigate(d); onClose(); }}
          >
            <i className="pip" />
            <span>{DOMAIN_LABEL[d]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
