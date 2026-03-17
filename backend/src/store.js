/**
 * Offer store — Firestore in production, in-memory for dev/test.
 * All functions are async.
 */

const crypto = require('crypto');

const useFirestore = process.env.NODE_ENV === 'production';
let db, offersCol;

if (useFirestore) {
  const { Firestore } = require('@google-cloud/firestore');
  db = new Firestore();
  offersCol = db.collection('offers');
}

// In-memory fallback
const memStore = new Map();
const memSettings = new Map();
const memRateLimits = new Map();

// ─── Helpers ────────────────────────────────────────────────────────

function generateSlots(windows, duration) {
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
  return slots;
}

// ─── API ────────────────────────────────────────────────────────────

async function createOffer({ ownerEmail, windows, duration, tokens, timezone, label, expiryDays }) {
  const id = crypto.randomBytes(4).toString('hex');
  const now = new Date();
  const days = expiryDays || 7;
  const expiresAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  const slots = generateSlots(windows, duration);

  const offer = {
    id,
    ownerEmail,
    windows,
    duration,
    slots,
    tokens,
    timezone,
    label: label || null,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    status: 'active',
  };

  if (useFirestore) {
    await offersCol.doc(id).set(offer);
  } else {
    memStore.set(id, offer);
  }

  return offer;
}

async function getOffer(id) {
  let offer;

  if (useFirestore) {
    const doc = await offersCol.doc(id).get();
    if (!doc.exists) return null;
    offer = doc.data();
  } else {
    offer = memStore.get(id);
    if (!offer) return null;
  }

  // Auto-expire
  if (new Date() > new Date(offer.expiresAt) && offer.status === 'active') {
    offer.status = 'expired';
    if (useFirestore) {
      await offersCol.doc(id).update({ status: 'expired' });
    }
  }

  return offer;
}

async function updateOffer(id, updates) {
  if (useFirestore) {
    const doc = await offersCol.doc(id).get();
    if (!doc.exists) return null;
    await offersCol.doc(id).update(updates);
    const updated = await offersCol.doc(id).get();
    return updated.data();
  } else {
    const offer = memStore.get(id);
    if (!offer) return null;
    Object.assign(offer, updates);
    memStore.set(id, offer);
    return offer;
  }
}

async function getOffersByOwner(ownerEmail) {
  let offers = [];

  if (useFirestore) {
    const snapshot = await offersCol.where('ownerEmail', '==', ownerEmail).get();
    offers = snapshot.docs.map((doc) => doc.data());
    offers.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  } else {
    offers = [...memStore.values()]
      .filter((o) => o.ownerEmail === ownerEmail)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  // Auto-expire any stale offers
  const now = new Date();
  for (const offer of offers) {
    if (now > new Date(offer.expiresAt) && offer.status === 'active') {
      offer.status = 'expired';
      if (useFirestore) {
        await offersCol.doc(offer.id).update({ status: 'expired' });
      }
    }
  }

  return offers;
}

async function claimSlot(offerId, slotIndex, bookedBy) {
  if (useFirestore) {
    // Use a transaction for atomic claim
    return db.runTransaction(async (tx) => {
      const ref = offersCol.doc(offerId);
      const doc = await tx.get(ref);
      if (!doc.exists) return null;

      const offer = doc.data();
      if (!offer.slots[slotIndex]) return null;

      offer.slots[slotIndex].status = 'claimed';
      offer.slots[slotIndex].bookedBy = bookedBy;

      const allClaimed = offer.slots.every((s) => s.status === 'claimed');
      if (allClaimed) offer.status = 'claimed';

      tx.update(ref, { slots: offer.slots, status: offer.status });
      return offer;
    });
  } else {
    const offer = memStore.get(offerId);
    if (!offer) return null;
    if (!offer.slots[slotIndex]) return null;

    offer.slots[slotIndex].status = 'claimed';
    offer.slots[slotIndex].bookedBy = bookedBy;

    const allClaimed = offer.slots.every((s) => s.status === 'claimed');
    if (allClaimed) offer.status = 'claimed';

    memStore.set(offerId, offer);
    return offer;
  }
}

// ─── Settings ───────────────────────────────────────────────────────

async function getSettings(userId) {
  if (useFirestore) {
    const doc = await db.collection('settings').doc(userId).get();
    return doc.exists ? doc.data() : null;
  } else {
    return memSettings.get(userId) || null;
  }
}

async function saveSettings(userId, settings) {
  if (useFirestore) {
    await db.collection('settings').doc(userId).set(settings, { merge: true });
  } else {
    memSettings.set(userId, { ...(memSettings.get(userId) || {}), ...settings });
  }
  return settings;
}

// ─── Rate Limiting ───────────────────────────────────────────────────

async function checkRateLimit(ip, maxAttempts, windowMs) {
  const now = Date.now();
  const cutoff = now - windowMs;

  if (useFirestore) {
    const ref = db.collection('rateLimits').doc(ip.replace(/[/.]/g, '_'));
    const doc = await ref.get();

    let attempts = [];
    if (doc.exists) {
      attempts = (doc.data().attempts || []).filter((ts) => ts > cutoff);
    }

    if (attempts.length >= maxAttempts) {
      return { allowed: false, count: attempts.length };
    }

    attempts.push(now);
    await ref.set({ attempts, updatedAt: new Date().toISOString() });
    return { allowed: true, count: attempts.length };
  } else {
    let attempts = memRateLimits.get(ip) || [];
    attempts = attempts.filter((ts) => ts > cutoff);

    if (attempts.length >= maxAttempts) {
      return { allowed: false, count: attempts.length };
    }

    attempts.push(now);
    memRateLimits.set(ip, attempts);
    return { allowed: true, count: attempts.length };
  }
}

// ─── Cleanup ────────────────────────────────────────────────────────

async function clearAll() {
  if (useFirestore) {
    const snapshot = await offersCol.get();
    const batch = db.batch();
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  } else {
    memStore.clear();
    memSettings.clear();
    memRateLimits.clear();
  }
}

module.exports = { createOffer, getOffer, getOffersByOwner, updateOffer, claimSlot, getSettings, saveSettings, checkRateLimit, clearAll };
