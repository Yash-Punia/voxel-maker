import { createRoot } from 'react-dom/client';
import App from './App.tsx';

// StrictMode disabled — R3F doesn't play well with double-invoke effects
createRoot(document.getElementById('root')!).render(<App />);
