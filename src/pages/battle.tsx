import Layout from '@theme/Layout';
import AgentBattle from '../components/battle/AgentBattle';
import '../components/playground/playground.css';

export default function BattlePage(): JSX.Element {
  return (
    <Layout
      title="Agent Battle"
      description="Dual-agent transaction simulator for the ACTP protocol"
    >
      <main style={{
        width: '100%',
        maxWidth: '100%',
        padding: '0',
        background: '#0A0A0A',
        minHeight: 'calc(100vh - 60px)'
      }}>
        <AgentBattle />
      </main>
    </Layout>
  );
}
