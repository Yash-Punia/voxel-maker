import './theme.css';
import './App.css';
import { Toolbar } from './components/layout/Toolbar';
import { StatusBar } from './components/layout/StatusBar';
import { PaintEditor } from './components/PaintEditor/PaintEditor';
import { DepthEditor } from './components/DepthEditor/DepthEditor';
import { Preview3D } from './components/Preview3D/Preview3D';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

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
