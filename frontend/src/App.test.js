import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

// Mock fetch globally
beforeEach(() => {
  global.fetch = jest.fn(() =>
    Promise.resolve({ ok: false, status: 401 })
  );
});

afterEach(() => {
  jest.restoreAllMocks();
});

test('renders sign-in page when not authenticated', async () => {
  render(<App />);
  const signInButton = await screen.findByText(/sign in with google/i);
  expect(signInButton).toBeInTheDocument();
});

test('displays app title', async () => {
  render(<App />);
  const title = await screen.findByText(/openslot/i);
  expect(title).toBeInTheDocument();
});
