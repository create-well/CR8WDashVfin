import { createBrowserRouter } from 'react-router';
import { RootLayout } from './RootLayout';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: RootLayout,
    children: [
      { index: true, lazy: () => import('./pages/ThisWeekPage').then(module => ({ Component: module.ThisWeekPage })) },
      { path: 'moves', lazy: () => import('./pages/MovesPage').then(module => ({ Component: module.MovesPage })) },
      { path: 'care', lazy: () => import('./pages/CarePage').then(module => ({ Component: module.CarePage })) },
      { path: 'flows', lazy: () => import('./pages/FlowsPage').then(module => ({ Component: module.FlowsPage })) },
      { path: 'money', lazy: () => import('./pages/MoneyPage').then(module => ({ Component: module.MoneyPage })) },
      // The legacy path remains stable; the alias supports the user-facing The Source language.
      { path: 'source', lazy: () => import('./pages/MoneyPage').then(module => ({ Component: module.MoneyPage })) },
      { path: 'decisions', lazy: () => import('./pages/DecisionsPage').then(module => ({ Component: module.DecisionsPage })) },
      { path: 'system', lazy: () => import('./pages/SystemPage').then(module => ({ Component: module.SystemPage })) },
    ],
  },
]);
