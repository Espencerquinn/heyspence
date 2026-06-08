import { AuthGate } from './auth/AuthGate';
import { Board } from './board/Board';

export default function App() {
  return (
    <AuthGate>
      <Board />
    </AuthGate>
  );
}
