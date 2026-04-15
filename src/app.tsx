import './styles/index.css';
import { Toolbar } from './components/layout/toolbar';
import { StatusBar } from './components/layout/status-bar';
import { PaintEditor } from './components/paint-editor/paint-editor';
import { DepthEditor } from './components/depth-editor/depth-editor';
import { Preview3D } from './components/preview-3d/preview-3d';
import { useKeyboardShortcuts } from './hooks/use-keyboard-shortcuts';
import { useDirtyState } from './hooks/use-dirty-state';

function App() {
  useKeyboardShortcuts();
  useDirtyState();

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Toolbar />
      <div className="panels-responsive flex flex-1 overflow-hidden gap-px bg-border">
        <PaintEditor />
        <DepthEditor />
        <Preview3D />
      </div>
      <StatusBar />
    </div>
  );
}

export default App;
