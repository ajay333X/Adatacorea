// db.js
import { doc, getDoc, setDoc, serverTimestamp } 
from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

import { db } from "./firebase.js";

export async function ensureUserDocument(user) {
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    await setDoc(ref, {
      email: user.email,
      displayName: user.displayName || user.email.split("@")[0],
      role: "cb",
      createdAt: serverTimestamp(),
      stats: {
        totalEarnings: 0,
        pendingEarnings: 0,
        qualityScore: 0,
        tasksCompleted: 0
      },
      activity: {
        lastLogin: serverTimestamp()
      }
    });
  } else {
    await setDoc(
      ref,
      { activity: { lastLogin: serverTimestamp() } },
      { merge: true }
    );
  }
}

export async function getUserData(uid) {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : null;
}
