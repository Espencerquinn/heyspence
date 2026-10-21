import { AuthGate } from './auth/AuthGate';
import { Shell } from './ui/Shell';
import { useRoute } from './router';
import { Frame } from './ui/Frame';
import { SystemProvider } from './state/SystemContext';
import { NotificationProvider } from './state/useNotifications';
import { NotificationHost } from './ui/NotificationHost';
import { Status } from './screens/Status';
import { DomainScreen } from './screens/DomainScreen';
import { BodyRecord } from './screens/BodyRecord';
import { Protocol } from './screens/Protocol';
import { Fuel } from './screens/Fuel';
import { Train } from './screens/Train';

function Routed() {
  const route = useRoute();
  switch (route.name) {
    case 'status': return <Status />;
    case 'domain': return <DomainScreen domain={route.domain} />;
    case 'body':   return <BodyRecord />;
    case 'protocol': return <Protocol />;
    case 'fuel':   return <Fuel />;
    case 'train':  return <Train />;
    default:       return <Frame title="Not found">No such page.</Frame>;
  }
}

export default function App() {
  return (
    <AuthGate>
      <NotificationProvider>
        <SystemProvider>
          <Shell><Routed /></Shell>
          <NotificationHost />
        </SystemProvider>
      </NotificationProvider>
    </AuthGate>
  );
}
