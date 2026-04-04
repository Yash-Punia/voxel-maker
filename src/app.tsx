import './styles/theme.css';
import './styles/app.css';
import { Toolbar } from './components/layout/toolbar';
import { StatusBar } from './components/layout/status-bar';
import { PaintEditor } from './components/paint-editor/paint-editor';
import { DepthEditor } from './components/depth-editor/depth-editor';
import { Preview3D } from './components/preview-3d/preview-3d';
import { useKeyboardShortcuts } from './hooks/use-keyboard-shortcuts';

function App() {
  useKeyboardShortcuts();

  return (
    <div className="app-shell">
      <Toolbar />
      <div className="panels-container">
        <PaintEditor />
        <DepthEditor />
        <Preview3D />
      </div>
      <StatusBar />
    </div>
  );
}

export default App;
