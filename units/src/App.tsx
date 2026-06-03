import { PasswordGate } from './components/password-gate'
import { SellPlanner } from './components/sell-planner'

export function App() {
  return (
    <PasswordGate>
      <SellPlanner />
    </PasswordGate>
  )
}
