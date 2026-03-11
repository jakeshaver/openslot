import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';

function renderApp(route = '/') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <App />
    </MemoryRouter>
  );
}

beforeEach(() => {
  global.fetch = jest.fn(() =>
    Promise.resolve({ ok: false, status: 401 })
  );
});

afterEach(() => {
  jest.restoreAllMocks();
});

test('renders sign-in page when not authenticated', async () => {
  renderApp();
  const signInButton = await screen.findByText(/sign in with google/i);
  expect(signInButton).toBeInTheDocument();
});

test('displays app logo', async () => {
  renderApp();
  const logo = await screen.findByText(/Slot/);
  expect(logo).toBeInTheDocument();
});

test('shows owner view when authenticated', async () => {
  global.fetch = jest.fn((url) => {
    if (url.includes('/auth/me')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ user: { name: 'Test', email: 'test@test.com' } }),
      });
    }
    if (url.includes('/api/availability')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ slots: [], config: {} }),
      });
    }
    return Promise.resolve({ ok: false, status: 404 });
  });

  renderApp();
  const heading = await screen.findByText(/pick your slots/i);
  expect(heading).toBeInTheDocument();
});

test('never displays event details in any view', async () => {
  global.fetch = jest.fn((url) => {
    if (url.includes('/auth/me')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ user: { name: 'Test', email: 'test@test.com' } }),
      });
    }
    if (url.includes('/api/availability')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          slots: [
            { start: '2026-03-10T14:00:00Z', end: '2026-03-10T15:00:00Z', durationMinutes: 60 },
          ],
          config: {},
        }),
      });
    }
    return Promise.resolve({ ok: false, status: 404 });
  });

  renderApp();
  await screen.findByText(/pick your slots/i);

  expect(screen.queryByText(/summary/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/attendee/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/description/i)).not.toBeInTheDocument();
});

test('routes /book/:offerId to public booking page', async () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(14, 0, 0, 0);
  const slotEnd = new Date(tomorrow);
  slotEnd.setMinutes(30);

  global.fetch = jest.fn((url) => {
    if (url.includes('/api/offers/')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          offer: {
            id: 'abc123',
            duration: 30,
            status: 'active',
            slots: [
              { start: tomorrow.toISOString(), end: slotEnd.toISOString(), status: 'available' },
            ],
          },
        }),
      });
    }
    return Promise.resolve({ ok: false, status: 401 });
  });

  renderApp('/book/abc123');
  const heading = await screen.findByText(/book a time/i);
  expect(heading).toBeInTheDocument();
});
