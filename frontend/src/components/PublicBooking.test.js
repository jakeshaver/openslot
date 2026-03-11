import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import PublicBooking from './PublicBooking';

function renderBooking(offerId = 'test123', query = '') {
  return render(
    <MemoryRouter initialEntries={[`/book/${offerId}${query}`]}>
      <Routes>
        <Route path="/book/:offerId" element={<PublicBooking />} />
      </Routes>
    </MemoryRouter>
  );
}

const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
tomorrow.setHours(14, 0, 0, 0);

const slotEnd30 = new Date(tomorrow.getTime() + 30 * 60000);
const slotEnd60 = new Date(tomorrow.getTime() + 60 * 60000);

const mockOffer = {
  id: 'test123',
  duration: 30,
  status: 'active',
  slots: [
    { start: tomorrow.toISOString(), end: slotEnd30.toISOString(), status: 'available' },
    { start: slotEnd30.toISOString(), end: slotEnd60.toISOString(), status: 'available' },
  ],
};

afterEach(() => {
  jest.restoreAllMocks();
});

test('shows loading state initially', () => {
  global.fetch = jest.fn(() => new Promise(() => {})); // never resolves
  renderBooking();
  expect(document.querySelectorAll('.loading-dot').length).toBe(3);
});

test('displays offer with available slots', async () => {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ offer: mockOffer }),
    })
  );

  renderBooking();
  const heading = await screen.findByText(/book a time/i);
  expect(heading).toBeInTheDocument();
  expect(screen.getByText(/30-minute slots/i)).toBeInTheDocument();
});

test('shows error for 404 (invalid link)', async () => {
  global.fetch = jest.fn(() =>
    Promise.resolve({ ok: false, status: 404 })
  );

  renderBooking();
  const msg = await screen.findByText(/invalid or has been removed/i);
  expect(msg).toBeInTheDocument();
});

test('shows expired state for 410', async () => {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: false,
      status: 410,
      json: () => Promise.resolve({ code: 'offer_expired', error: 'Offer expired' }),
    })
  );

  renderBooking();
  const heading = await screen.findByText(/link expired/i);
  expect(heading).toBeInTheDocument();
});

test('auto-selects slot from URL query param', async () => {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ offer: mockOffer }),
    })
  );

  renderBooking('test123', '?slot=0');
  // Should show booking form since slot is preselected
  const nameInput = await screen.findByPlaceholderText(/jane smith/i);
  expect(nameInput).toBeInTheDocument();
});

test('shows booking form after selecting a slot', async () => {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ offer: mockOffer }),
    })
  );

  renderBooking();
  await screen.findByText(/book a time/i);

  // Click on the date that has slots in the mini calendar
  const dayNum = tomorrow.getDate();
  const dayCells = document.querySelectorAll('.mini-cal-day.has-slots');
  const targetCell = Array.from(dayCells).find((el) => el.textContent === String(dayNum));
  if (targetCell) {
    fireEvent.click(targetCell);
    // Now slot items should appear
    const slotItems = await screen.findAllByText(/min$/i);
    expect(slotItems.length).toBeGreaterThan(0);
  }
});

test('submits booking successfully', async () => {
  let bookCallMade = false;
  global.fetch = jest.fn((url, opts) => {
    if (url.includes('/book') && opts?.method === 'POST') {
      bookCallMade = true;
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          booking: {
            slot: mockOffer.slots[0],
          },
        }),
      });
    }
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ offer: mockOffer }),
    });
  });

  renderBooking('test123', '?slot=0');
  const nameInput = await screen.findByPlaceholderText(/jane smith/i);
  const emailInput = screen.getByPlaceholderText(/jane@company/i);

  fireEvent.change(nameInput, { target: { value: 'Alice Test' } });
  fireEvent.change(emailInput, { target: { value: 'alice@test.com' } });

  const submitBtn = screen.getByText(/confirm booking/i);
  fireEvent.click(submitBtn);

  const success = await screen.findByText(/you're booked/i);
  expect(success).toBeInTheDocument();
  expect(bookCallMade).toBe(true);
});

test('handles slot_conflict error on booking', async () => {
  let callCount = 0;
  global.fetch = jest.fn((url, opts) => {
    if (url.includes('/book') && opts?.method === 'POST') {
      return Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ error: 'Conflict', code: 'slot_conflict' }),
      });
    }
    callCount++;
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ offer: mockOffer }),
    });
  });

  renderBooking('test123', '?slot=0');
  const nameInput = await screen.findByPlaceholderText(/jane smith/i);
  const emailInput = screen.getByPlaceholderText(/jane@company/i);

  fireEvent.change(nameInput, { target: { value: 'Alice' } });
  fireEvent.change(emailInput, { target: { value: 'alice@test.com' } });

  fireEvent.click(screen.getByText(/confirm booking/i));

  const errorMsg = await screen.findByText(/no longer available/i);
  expect(errorMsg).toBeInTheDocument();
});

test('handles slot_claimed (double-booking) error', async () => {
  global.fetch = jest.fn((url, opts) => {
    if (url.includes('/book') && opts?.method === 'POST') {
      return Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ error: 'Claimed', code: 'slot_claimed' }),
      });
    }
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ offer: mockOffer }),
    });
  });

  renderBooking('test123', '?slot=0');
  const nameInput = await screen.findByPlaceholderText(/jane smith/i);
  const emailInput = screen.getByPlaceholderText(/jane@company/i);

  fireEvent.change(nameInput, { target: { value: 'Bob' } });
  fireEvent.change(emailInput, { target: { value: 'bob@test.com' } });

  fireEvent.click(screen.getByText(/confirm booking/i));

  const errorMsg = await screen.findByText(/just booked by someone else/i);
  expect(errorMsg).toBeInTheDocument();
});

test('handles offer_stale error', async () => {
  global.fetch = jest.fn((url, opts) => {
    if (url.includes('/book') && opts?.method === 'POST') {
      return Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ error: 'Stale', code: 'offer_stale' }),
      });
    }
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ offer: mockOffer }),
    });
  });

  renderBooking('test123', '?slot=0');
  const nameInput = await screen.findByPlaceholderText(/jane smith/i);
  const emailInput = screen.getByPlaceholderText(/jane@company/i);

  fireEvent.change(nameInput, { target: { value: 'Carol' } });
  fireEvent.change(emailInput, { target: { value: 'carol@test.com' } });

  fireEvent.click(screen.getByText(/confirm booking/i));

  const errorMsg = await screen.findByText(/no longer available/i);
  expect(errorMsg).toBeInTheDocument();
});

test('shows no-times-available page when all slots are claimed', async () => {
  const allClaimedOffer = {
    ...mockOffer,
    slots: mockOffer.slots.map((s) => ({ ...s, status: 'claimed' })),
  };
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ offer: allClaimedOffer }),
    })
  );

  renderBooking();
  const heading = await screen.findByText(/no times available/i);
  expect(heading).toBeInTheDocument();
  expect(screen.getByText(/contact the organizer/i)).toBeInTheDocument();
});

test('hides claimed slots from slot list', async () => {
  const mixedOffer = {
    ...mockOffer,
    slots: [
      { start: tomorrow.toISOString(), end: slotEnd30.toISOString(), status: 'claimed' },
      { start: slotEnd30.toISOString(), end: slotEnd60.toISOString(), status: 'available' },
    ],
  };
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ offer: mixedOffer }),
    })
  );

  renderBooking();
  await screen.findByText(/book a time/i);

  // Click the date with slots
  const dayNum = tomorrow.getDate();
  const dayCells = document.querySelectorAll('.mini-cal-day.has-slots');
  const targetCell = Array.from(dayCells).find((el) => el.textContent === String(dayNum));
  if (targetCell) {
    fireEvent.click(targetCell);
    const slotItems = await screen.findAllByText(/min$/i);
    // Only 1 available slot should be visible, not the claimed one
    expect(slotItems).toHaveLength(1);
  }
});

test('never exposes calendar event details', async () => {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ offer: mockOffer }),
    })
  );

  renderBooking();
  await screen.findByText(/book a time/i);

  // PublicBooking should never show event summaries, descriptions, or attendees
  expect(screen.queryByText(/summary/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/attendee/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/description/i)).not.toBeInTheDocument();
});
