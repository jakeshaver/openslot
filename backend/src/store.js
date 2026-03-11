/**
 * In-memory offer store.
 * Interface matches Firestore patterns — swap to real Firestore later.
 */

const crypto = require('crypto');

const offers = new Map();

function createOffer({ ownerEmail, windows, duration, tokens, timezone }) {
  const id = crypto.randomBytes(4).toString('hex');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Generate bookable slots by slicing windows into duration increments
  const slots = [];
  for (const window of windows) {
    const start = new Date(window.start);
    const end = new Date(window.end);
    let cursor = new Date(start);
    while (cursor.getTime() + duration * 60000 <= end.getTime()) {
      slots.push({
        start: cursor.toISOString(),
        end: new Date(cursor.getTime() + duration * 60000).toISOString(),
        status: 'available',
        bookedBy: null,
      });
      cursor = new Date(cursor.getTime() + duration * 60000);
    }
  }

  const offer = {
    id,
    ownerEmail,
    windows,
    duration,
    slots,
    tokens, // owner's OAuth tokens for calendar write on booking
    timezone, // owner's calendar timezone for display on booking page
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    status: 'active',
  };

  offers.set(id, offer);
  return offer;
}

function getOffer(id) {
  const offer = offers.get(id);
  if (!offer) return null;

  // Auto-expire
  if (new Date() > new Date(offer.expiresAt) && offer.status === 'active') {
    offer.status = 'expired';
  }

  return offer;
}

function updateOffer(id, updates) {
  const offer = offers.get(id);
  if (!offer) return null;
  Object.assign(offer, updates);
  offers.set(id, offer);
  return offer;
}

function claimSlot(offerId, slotIndex, bookedBy) {
  const offer = offers.get(offerId);
  if (!offer) return null;
  if (!offer.slots[slotIndex]) return null;

  offer.slots[slotIndex].status = 'claimed';
  offer.slots[slotIndex].bookedBy = bookedBy;

  // Check if all slots are claimed
  const allClaimed = offer.slots.every((s) => s.status === 'claimed');
  if (allClaimed) offer.status = 'claimed';

  offers.set(offerId, offer);
  return offer;
}

// For testing
function clearAll() {
  offers.clear();
}

module.exports = { createOffer, getOffer, updateOffer, claimSlot, clearAll };
