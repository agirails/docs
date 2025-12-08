import Layout from '@theme/Layout';
import Playground from '../components/playground/Playground';

export default function PlaygroundPage(): JSX.Element {
  return (
    <Layout
      title="SDK Playground"
      description="Try the AGIRAILS SDK directly in your browser"
    >
      <main style={{
        width: '100%',
        maxWidth: '100%',
        padding: '0',
        background: '#0A0A0A',
        minHeight: 'calc(100vh - 60px)'
      }}>
        <Playground />
      </main>
    </Layout>
  );
}
