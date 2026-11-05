import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyCwQGsFPBIs_gk0Xc1hscpG-7n6M16gqWc",
  authDomain: "rnhkbp-pelikan.firebaseapp.com",
  projectId: "rnhkbp-pelikan",
  storageBucket: "rnhkbp-pelikan.firebasestorage.app",
  messagingSenderId: "202813062166",
  appId: "1:202813062166:web:eb3d963d5965a5e6f48937"
};

const app = initializeApp(firebaseConfig);

window.auth = getAuth(app);
window.db = getFirestore(app);
window.storage = getStorage(app);  