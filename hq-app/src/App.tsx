import { AuthGate } from './auth/AuthGate';
import { Shell } from './ui/Shell';
import { useRoute } from './router';
import { Frame } from './ui/Frame';
import { SystemProvider } from './state/SystemContext';

function Routed() {
  const route = useRoute();
  switch (route.name) {
    case 'status': return <Frame title="Status">STATUS</Frame>;
    case 'domain': return <Frame title={route.domain}>DOMAIN</Frame>;
    case 'body':   return <Frame title="Body Record">BODY</Frame>;
    default:       return <Frame title="Not found">No such page.</Frame>;
  }
}

export default function App() {
  return (
    <AuthGate>
      <SystemProvider>
        <Shell><Routed /></Shell>
      </SystemProvider>
    </AuthGate>
  );
}
