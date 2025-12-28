// db.js
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

// ✅ Use the global db your app already uses
const db = window.db;

export async function ensureUserDocument(user) {
  if (!user || !user.uid) return;

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
      activity: {
        lastLogin: serverTimestamp()
      }
    });
  } else {
    await updateDoc(ref, {
      "activity.lastLogin": serverTimestamp()
    });
  }
}

export async function getUserData(uid) {
  if (!uid) return null;
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : null;
}
