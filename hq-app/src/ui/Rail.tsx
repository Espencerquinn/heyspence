import { DOMAINS, DOMAIN_LABEL } from '../types';
import { navigate, useRoute } from '../router';

export function Rail() {
  const route = useRoute();
  const isDomain = route.name === 'domain';

  const item = (
    key: string,
    label: string,
    to: string,
    active: boolean,
    extraClass = '',
  ) => (
    <button
      key={key}
      className={`rail__item ${extraClass}`}
      aria-current={active ? 'page' : undefined}
      onClick={() => navigate(to)}
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

      {/* Six domains do not fit a phone bottom bar — mobile collapses them
          behind one entry that jumps to the first domain. */}
      {item('domains', 'Domains', DOMAINS[0], isDomain, 'only-mobile')}

      {item('body', 'Body', 'body', route.name === 'body')}
    </nav>
  );
}
