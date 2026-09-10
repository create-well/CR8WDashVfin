import React, { Suspense } from 'react';
import { createBrowserRouter } from 'react-router';
import { RootLayout } from './RootLayout';

// Lazy-load all page components for automatic code splitting
const ThisWeekPage = React.lazy(() => import('./pages/ThisWeekPage').then(m => ({ default: m.ThisWeekPage })));
const MovesPage = React.lazy(() => import('./pages/MovesPage').then(m => ({ default: m.MovesPage })));
const CarePage = React.lazy(() => import('./pages/CarePage').then(m => ({ default: m.CarePage })));
const FlowsPage = React.lazy(() => import('./pages/FlowsPage').then(m => ({ default: m.FlowsPage })));
const MoneyPage = React.lazy(() => import('./pages/MoneyPage').then(m => ({ default: m.MoneyPage })));
const DecisionsPage = React.lazy(() => import('./pages/DecisionsPage').then(m => ({ default: m.DecisionsPage })));
const SystemPage = React.lazy(() => import('./pages/SystemPage').then(m => ({ default: m.SystemPage })));

// Suspense wrapper for lazy-loaded pages
function LazyPage({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '40vh', opacity: 0.5,
        fontFamily: 'var(--font-label, Montserrat, sans-serif)',
        fontSize: '0.85rem', color: 'var(--text-muted, #8A7D72)',
      }}>
        Loading…
      </div>
    }>
      {children}
    </Suspense>
  );
}

export const router = createBrowserRouter([
  {
    path: '/',
    Component: RootLayout,
    children: [
      { index: true,         element: <LazyPage><ThisWeekPage /></LazyPage> },
      { path: 'moves',       element: <LazyPage><MovesPage /></LazyPage> },
      { path: 'care',        element: <LazyPage><CarePage /></LazyPage> },
      { path: 'flows',       element: <LazyPage><FlowsPage /></LazyPage> },
      { path: 'money',       element: <LazyPage><MoneyPage /></LazyPage> },
      { path: 'decisions',   element: <LazyPage><DecisionsPage /></LazyPage> },
      { path: 'system',      element: <LazyPage><SystemPage /></LazyPage> },
    ],
  },
]);
