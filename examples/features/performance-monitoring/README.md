# Performance Monitoring Example

This example demonstrates how to use the PerformanceCounter API to monitor and analyze document viewer performance with Vue 3.

## Features

- **Real-time Performance Tracking** - Monitor operations as they happen
- **Summary Statistics** - View aggregated metrics by operation type
- **Timeline View** - See recent performance events in chronological order
- **Export Functionality** - Download performance data as JSON for analysis
- **Visual Breakdown** - Bar charts showing time distribution across operations

## UI Preview

```
┌─────────────────────────────────────────────────────────┐
│  [←] [→] [🔍] [🖨️] [⚙️] ... [📊 Performance] [⋯]       │
├─────────────────────────────────┬───────────────────────┤
│                               │  Performance Monitor  │
│      Document Viewer            │  [Reset] [Export]     │
│      (PDF display area)         │  ─────────────────────│
│                               │  Summary              │
│                               │  ┌─────┬─────┬─────┐ │
│                               │  │ 42  │2.5s │59ms │ │
│                               │  │events│total│avg  │ │
│                               │  └─────┴─────┴─────┘ │
│                               │  ─────────────────────│
│                               │  Breakdown            │
│                               │  • Document Load      │
│                               │    3 calls | Avg: 1.2s│
│                               │  • Page Render        │
│                               │    30 calls| Avg: 45ms│
└─────────────────────────────────┴───────────────────────┘
```

**Note**: 
- The Performance button (📊) is integrated into the toolbar, next to other buttons like search and print
- The performance panel is hidden by default
- Click the Performance button in the toolbar to show/hide the panel

## Key Concepts

### 1. Understanding the Slot Mechanism

UDoc Viewer uses a **slot-based architecture** that allows you to insert custom UI components into predefined positions. This is the recommended way to extend the viewer's UI.

#### Available Slots

```
┌─────────────────────────────────────────────────────────┐
│  .udoc-toolbar-slot (Toolbar container)                │
│  └─ .udoc-toolbar                                       │
│      ├─ .udoc-toolbar__left (Left section)             │
│      ├─ .udoc-toolbar__center (Center section)         │
│      └─ .udoc-toolbar__right (Right section - buttons) │
├─────────────────────────────────────────────────────────┤
│  .udoc-subtoolbar-slot (Sub-toolbar container)         │
├───────────┬─────────────────────────┬───────────────────┤
│           │                         │                   │
│  .udoc-   │   .udoc-viewport-slot   │   .udoc-right-    │
│  left-    │   (Viewport container)  │   panel-slot      │
│  panel-   │                         │   (Right panel    │
│  slot     │   .udoc-body-slot       │    container)     │
│  (Left    │   (Body container)      │                   │
│  panel    │                         │                   │
│  container)│                        │                   │
└───────────┴─────────────────────────┴───────────────────┘
```

#### How to Use Slots

```typescript
// 1. Find the slot container
const toolbarRight = container.querySelector('.udoc-toolbar__right');

// 2. Create your custom button
const customButton = document.createElement('button');
customButton.className = 'udoc-toolbar__btn';
customButton.innerHTML = `<svg>...</svg>`;
customButton.title = 'My Custom Button';

// 3. Add click handler
customButton.addEventListener('click', () => {
  // Your custom logic
});

// 4. Insert into the slot
const overflowMenu = toolbarRight.querySelector('.udoc-overflow-menu');
if (overflowMenu) {
  toolbarRight.insertBefore(customButton, overflowMenu);
} else {
  toolbarRight.appendChild(customButton);
}
```

### 2. Accessing PerformanceCounter

```typescript
const client = await UDocClient.create();
const viewer = await client.createViewer({
  container: document.getElementById('viewer'),
  enablePerformanceCounter: true,  // Enable performance tracking
});

const performanceCounter = viewer.performanceCounter;
```

### 2. Listening for Performance Events

```typescript
performanceCounter.onLog((entry) => {
  console.log(`${entry.type}: ${entry.phase}`);
  if (entry.phase === 'end') {
    console.log(`Duration: ${entry.duration}ms`);
  }
});
```

### 3. Getting Performance Summary

```typescript
const summary = performanceCounter.getSummary();

// Summary structure
{
  breakdown: {
    load: {
      count: 3,
      totalDuration: 3500,
      avgDuration: 1166.67,
      minDuration: 800,
      maxDuration: 1500
    },
    renderPage: {
      count: 30,
      totalDuration: 1350,
      avgDuration: 45,
      minDuration: 30,
      maxDuration: 120
    }
  }
}
```

### 4. Performance Entry Structure

```typescript
interface PerformanceLogEntry {
  id: string;           // Unique event ID
  type: string;         // Operation type (load, renderPage, etc.)
  phase: 'start' | 'end';
  timestamp: number;    // Relative time in ms
  duration?: number;    // Duration in ms (only for 'end' phase)
  success?: boolean;    // Operation success status
  error?: string;       // Error message if failed
  context?: any;        // Additional context (pageIndex, etc.)
}
```

### 5. Tracked Operations

| Operation | Description |
|-----------|-------------|
| `load` | Document loading |
| `loadPdf` | PDF-specific loading |
| `loadDocx` | DOCX-specific loading |
| `renderPage` | Page rendering |
| `getLayoutPage` | Layout queries |
| `getFontUsage` | Font information queries |
| `search` | Search operations |
| `initUI` | UI initialization |
| `initWorker` | Worker initialization |

## Project Structure

```
performance-monitoring/
├── public/
│   └── sample.pdf          # Sample document
├── src/
│   ├── components/
│   │   ├── DocumentViewer.vue   # Viewer with performance tracking
│   │   └── PerformancePanel.vue # Performance dashboard
│   ├── App.vue             # Main application
│   └── main.ts             # Entry point
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Running the Example

```bash
# Navigate to the example directory
cd examples/features/performance-monitoring

# Install dependencies
npm install

# Start the development server
npm run dev
```

Then open http://localhost:5173/ in your browser.

## Usage

1. **Open Performance Panel**: Click the Performance button (📊) in the toolbar to show the performance panel

2. **View Real-time Metrics**: As you interact with the document (load, navigate, search), performance metrics are automatically collected and displayed

3. **Analyze Performance**: 
   - Check the summary cards for overall statistics
   - Review the breakdown by operation type
   - Examine the timeline for recent events

4. **Export Data**: Click the "Export" button to download a JSON file with:
   - Complete performance summary
   - All performance entries
   - Environment information (user agent, document URL)

5. **Reset Metrics**: Click "Reset" to clear all collected data and start fresh

6. **Close Panel**: Click the Performance button (📊) again to hide the panel

## Export Format

```json
{
  "timestamp": "2026-04-08T12:34:56.789Z",
  "summary": {
    "breakdown": {
      "load": {
        "count": 1,
        "totalDuration": 1234,
        "avgDuration": 1234,
        "minDuration": 1234,
        "maxDuration": 1234
      }
    }
  },
  "entries": [
    {
      "id": "load_1",
      "type": "load",
      "phase": "start",
      "timestamp": 0
    },
    {
      "id": "load_1",
      "type": "load",
      "phase": "end",
      "timestamp": 1234,
      "duration": 1234,
      "success": true
    }
  ],
  "userAgent": "Mozilla/5.0...",
  "url": "/sample.pdf"
}
```

## Use Cases

### 1. Performance Optimization

Identify slow operations:
```typescript
const summary = performanceCounter.getSummary();
const slowOperations = Object.entries(summary.breakdown)
  .filter(([_, stats]) => stats.avgDuration > 100)
  .sort((a, b) => b[1].avgDuration - a[1].avgDuration);
```

### 2. Regression Detection

Compare performance across versions:
```typescript
// Export from version A
const baselineData = await fetch('baseline-perf.json').then(r => r.json());

// Compare with current
const currentSummary = performanceCounter.getSummary();
// ... compare metrics
```

### 3. User Experience Monitoring

Track real-world performance:
```typescript
// Send to analytics
const report = {
  loadTime: summary.breakdown.load?.avgDuration,
  renderTime: summary.breakdown.renderPage?.avgDuration,
  searchTime: summary.breakdown.search?.avgDuration,
};
// sendToAnalytics(report);
```

### 4. Performance Budgets

Set alerts for performance thresholds:
```typescript
performanceCounter.onLog((entry) => {
  if (entry.phase === 'end' && entry.duration) {
    if (entry.type === 'renderPage' && entry.duration > 100) {
      console.warn(`Slow page render: ${entry.duration}ms`);
    }
  }
});
```

## Disabling Performance Tracking

For production, you can disable performance tracking:

```typescript
const client = await UDocClient.create({
  disablePerformanceCounter: true
});
```

This returns a NoOpPerformanceCounter that has zero overhead.

## API Reference

### PerformanceCounter Methods

| Method | Description |
|--------|-------------|
| `getSummary()` | Get aggregated statistics |
| `entries` | Array of all performance entries |
| `onLog(callback)` | Subscribe to performance events |
| `reset()` | Clear all collected data |
| `enabled` | Whether tracking is enabled |

### PerformanceCounterSummary

```typescript
interface PerformanceCounterSummary {
  breakdown: {
    [operationType: string]: {
      count: number;
      totalDuration: number;
      avgDuration: number;
      minDuration: number;
      maxDuration: number;
    };
  };
}
```

## Related Examples

- [Basic Vue Example](../../vue-vite/) - Basic viewer integration
- [Custom Search UI](../custom-search-ui/) - Custom search interface
- [React Example](../../react-vite/) - React implementation

## Further Reading

- [PerformanceCounter API Documentation](../../../packages/udoc-viewer/docs/performance.md)
- [Performance Best Practices](../../../docs/performance.md)
