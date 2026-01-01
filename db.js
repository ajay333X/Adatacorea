// db.js
import { getFirestore, doc, getDoc, setDoc, updateDoc, serverTimestamp } 
  from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

import { app } from "./firebase.js"; // ✅ app must be exported from firebase.js

export const db = getFirestore(app);


// expose globally only if you still want
window.firebaseDb = db;

export async function ensureUserDocument(user) {
  if (!user?.uid) return;

  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    await setDoc(ref, {
      email: user.email || "",
      displayName: user.displayName || (user.email ? user.email.split("@")[0] : "User"),
      role: "cb",
      createdAt: serverTimestamp(),
      stats: {
        totalEarnings: 0,
        pendingEarnings: 0,
        qualityScore: 0,
        tasksCompleted: 0
      },
      activity: { lastLogin: serverTimestamp() }
    });
  } else {
    await updateDoc(ref, { "activity.lastLogin": serverTimestamp() });
  }
}

export async function getUserData(uid) {
  if (!uid) return null;
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : null;
}
