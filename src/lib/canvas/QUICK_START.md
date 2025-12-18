# AGIRAILS Canvas - Quick Start Guide

## 5-Minute Developer Onboarding

### What is AGIRAILS Canvas?

A visual programming environment for building AI agent workflows. Think "Figma for AI agents" - drag, connect, run.

### Basic Concepts

**Agent** - A node on the canvas with code, balance, and connections
**Connection** - A transaction between two agents (requester → provider)
**Runtime** - Simulates ACTP protocol state transitions
**Share** - URL-encoded canvas state for collaboration

### Project Structure

```
src/lib/canvas/           # Core logic (no UI)
  ├── types.ts            # TypeScript definitions
  ├── useCanvasState.ts   # State management
  ├── runtime.ts          # Mock execution engine
  ├── share.ts            # URL serialization
  └── templates.ts        # Agent starter code

src/components/canvas/    # React components
  ├── Canvas.tsx          # Main container
  ├── Toolbar.tsx         # Top actions
  ├── nodes/              # Agent visuals
  ├── edges/              # Connection visuals
  ├── panels/             # Inspector, code editor
  └── modals/             # Dialogs

src/css/canvas.css        # All styles (1100+ lines)
```

### Key Files to Read

1. **`types.ts`** - Understand the data model
2. **`useCanvasState.ts`** - Learn state management
3. **`Canvas.tsx`** - See integration

### Common Tasks

#### Add a New Agent Type

```typescript
// 1. Add to templates.ts
export const AGENT_TEMPLATES = {
  // ... existing templates
  myNewAgent: {
    id: 'myNewAgent',
    name: 'My New Agent',
    description: 'Does something cool',
    type: 'provider',
    icon: '🚀',
    defaultCode: `// Your code here`,
    initialBalanceMicro: 0,
  },
};
```

#### Add a New Action

```typescript
// 1. Add action type to useCanvasState.ts
export type CanvasAction =
  | { type: 'MY_ACTION'; payload: { ... } }
  | ...

// 2. Add case to reducer
case 'MY_ACTION': {
  const { ... } = action.payload;
  return { ...state, ... };
}

// 3. Add action creator
const actions = {
  myAction: (params) => dispatch({ type: 'MY_ACTION', payload: params }),
  ...
};
```

#### Add Runtime Behavior

```typescript
// In runtime.ts, add to runTick()
export async function runTick(ctx: RuntimeContext): Promise<void> {
  // Your logic here
  const { state, dispatch, addEvent } = ctx;

  // Example: Check condition and transition
  state.connections.forEach((connection) => {
    if (/* condition */) {
      transitionConnectionState(ctx, connection.id, 'NEXT_STATE');
    }
  });
}
```

#### Add UI Panel

```typescript
// 1. Create component in components/canvas/panels/
export function MyPanel({ data, onClose }: MyPanelProps) {
  return (
    <div className="cv-my-panel">
      {/* Your UI */}
    </div>
  );
}

// 2. Add styles to canvas.css
.cv-my-panel {
  /* Your styles */
}

// 3. Wire into Canvas.tsx
const [showMyPanel, setShowMyPanel] = useState(false);

// In render:
{showMyPanel && <MyPanel onClose={() => setShowMyPanel(false)} />}
```

### State Management Patterns

#### Read State
```typescript
const { state, getAgent, getConnection } = useCanvasState();

const agent = getAgent('agent-id');
const connection = getConnection('connection-id');
const allAgents = state.agents;
```

#### Update State
```typescript
const { actions } = useCanvasState();

// Update agent
actions.updateAgent('agent-id', { balanceMicro: 1000000 });

// Update connection
actions.updateConnectionState('connection-id', 'SETTLED');

// Add event
actions.addRuntimeEvent({
  id: generateId('event'),
  type: 'success',
  timestamp: Date.now(),
  payload: { message: 'Something happened' },
});
```

### Runtime Context

When working with runtime functions, always use `RuntimeContext`:

```typescript
import { RuntimeContext } from './runtime';

const ctx: RuntimeContext = {
  state,           // Current canvas state
  dispatch,        // Dispatch actions
  addEvent,        // Log to console
};

// Example usage
simulateEscrowLock(ctx, connectionId);
transitionConnectionState(ctx, connectionId, 'COMMITTED');
```

### Styling Guidelines

**CSS Class Naming**:
- Prefix: `cv-` (canvas)
- Component: `cv-component-name`
- Element: `cv-component-name__element`
- Modifier: `cv-component-name--modifier`

**Example**:
```css
.cv-agent-node { /* Component */ }
.cv-agent-node__header { /* Element */ }
.cv-agent-node--running { /* Modifier */ }
```

**Variables**:
```css
var(--cv-primary)      /* #00E4E4 (cyan) */
var(--cv-bg)           /* #0A0A0A (dark) */
var(--cv-card)         /* #141414 (card bg) */
var(--cv-border)       /* #2A2A2A (borders) */
var(--cv-text)         /* #FFFFFF (text) */
var(--cv-text-muted)   /* #888888 (muted) */
var(--cv-success)      /* #00C853 (green) */
var(--cv-error)        /* #FF1744 (red) */
var(--cv-warning)      /* #FF9100 (orange) */
```

### Debugging

#### Enable Verbose Logging
```typescript
// In Canvas.tsx, add to runtime tick loop
console.log('Tick:', state.tick, 'Agents:', state.agents.length);
```

#### Inspect State
```typescript
// In browser console
window.__CANVAS_STATE__ = state; // Set breakpoint in Canvas.tsx

// Then in console:
__CANVAS_STATE__.agents
__CANVAS_STATE__.connections
__CANVAS_STATE__.events
```

#### Test Share URL
```typescript
// Generate share URL
const { serializeState } = useCanvasState();
const serialized = serializeState();
const shareUrl = generateShareUrl(JSON.parse(serialized));
console.log(shareUrl);

// Decode share URL
const decoded = parseShareUrl(shareUrl);
console.log(decoded);
```

### Common Pitfalls

**1. Mutating State Directly**
```typescript
// ❌ DON'T
state.agents[0].balanceMicro = 1000000;

// ✅ DO
actions.updateAgent(agentId, { balanceMicro: 1000000 });
```

**2. Missing Cleanup**
```typescript
// ❌ DON'T
useEffect(() => {
  const interval = setInterval(() => { /* ... */ }, 1000);
  // Missing cleanup!
}, []);

// ✅ DO
useEffect(() => {
  const interval = setInterval(() => { /* ... */ }, 1000);
  return () => clearInterval(interval);
}, []);
```

**3. Circular Dependencies**
```typescript
// ❌ DON'T
// Canvas.tsx imports runtime.ts
// runtime.ts imports Canvas.tsx

// ✅ DO
// Keep runtime.ts pure logic (no UI imports)
// Canvas.tsx imports runtime.ts (one-way)
```

### Testing

#### Build Test
```bash
npm run build
```

#### Type Check
```bash
npx tsc --noEmit
```

#### Local Dev
```bash
npm start
# Visit http://localhost:3000/canvas
```

### Performance Tips

**Avoid Re-renders**:
```typescript
// Use useMemo for expensive computations
const nodes = useMemo(() => {
  return state.agents.map(agent => ({ /* ... */ }));
}, [state.agents]);

// Use useCallback for handlers
const handleClick = useCallback(() => {
  /* ... */
}, [dependencies]);
```

**Throttle State Updates**:
```typescript
// Don't update every frame
let lastUpdate = 0;
if (Date.now() - lastUpdate > 100) {
  actions.updateAgent(...);
  lastUpdate = Date.now();
}
```

### Next Steps

1. Read `/src/lib/canvas/README.md` for full architecture
2. Explore existing components in `/src/components/canvas/`
3. Check `CANVAS_WEEK3_COMPLETION.md` for implementation details
4. Browse `canvas.css` for styling examples

### Getting Help

- Check types in `types.ts` for data structures
- Look at existing components for patterns
- Read JSDoc comments in source files
- Check browser console for errors

### Quick Reference

**Import Core Library**:
```typescript
import {
  Agent, Connection, RuntimeEvent,
  useCanvasState,
  runTick, simulateEscrowLock,
  encodeShareState, parseShareUrl,
  AGENT_TEMPLATES,
} from '../../lib/canvas';
```

**Import Components**:
```typescript
import { Canvas } from '../../components/canvas';
import { AgentNode } from '../../components/canvas/nodes/AgentNode';
import { InspectorPanel } from '../../components/canvas/panels/InspectorPanel';
```

**Import CSS**:
```typescript
import '../../css/canvas.css';
```

---

**Happy Coding!** 🚀
