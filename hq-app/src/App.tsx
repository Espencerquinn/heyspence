import { AuthGate } from './auth/AuthGate';

export default function App() {
  return (
    <AuthGate>
      <div style={{ color: '#5ad8ff', padding: 24 }}>SYSTEM ONLINE</div>
    </AuthGate>
  );
}
