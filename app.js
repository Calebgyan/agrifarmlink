// app.js (type="module")
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import {
  getFirestore, collection, addDoc, query, orderBy, getDocs, onSnapshot, where
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

const cfg = window.FIREBASE_CONFIG || {};
if (!cfg || Object.keys(cfg).length === 0) {
  alert("Firebase config missing. Rename firebase-config.js.example -> firebase-config.js and paste your config.");
  throw new Error("Firebase config missing");
}

const app = initializeApp(cfg);
const db = getFirestore(app);

const listingsCol = collection(db, "listings");

const $ = id => document.getElementById(id);
const listingForm = $("listingForm");
const postBtn = $("postBtn");
const clearBtn = $("clearBtn");
const formMsg = $("formMsg");
const listingsEl = $("listings");
const loading = $("loading");
const searchInput = $("search");
const refreshBtn = $("refreshBtn");
$("timestamp").textContent = new Date().toLocaleString();

// Helper: render a single listing card
function renderListing(doc) {
  const data = doc.data ? doc.data() : doc; // handle snapshot or plain object
  const id = doc.id || "";
  const div = document.createElement("div");
  div.className = "col";
  div.innerHTML = `
    <div class="card p-3 listing-card shadow-sm">
      <div class="d-flex justify-content-between align-items-start">
        <div>
          <h6 class="mb-1">${escapeHtml(data.title)}</h6>
          <div class="small text-muted mb-2">${escapeHtml(data.description)}</div>
          <div class="small"><strong>Location:</strong> ${escapeHtml(data.location || "—")}</div>
        </div>
        <div class="text-end">
          <div class="h6 mb-1">GHS ${Number(data.price).toFixed(2)}</div>
          <a class="btn btn-sm btn-success mb-1 phone-bubble" href="https://wa.me/${encodeURIComponent(data.phone.replace(/\D/g,''))}" target="_blank">WhatsApp</a>
          <a class="btn btn-sm btn-outline-secondary" href="tel:${encodeURIComponent(data.phone)}">Call</a>
        </div>
      </div>
    </div>`;
  return div;
}

function escapeHtml(str = "") {
  return String(str).replace(/[&<>"']/g, (s) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[s]));
}

async function postListing(payload){
  postBtn.disabled = true;
  formMsg.textContent = "Posting...";
  try {
    await addDoc(listingsCol, {
      ...payload,
      createdAt: new Date().toISOString()
    });
    formMsg.textContent = "Posted!";
    setTimeout(()=> formMsg.textContent = "", 1500);
    listingForm.reset();
    await loadListings(); // refresh after post
  } catch (err){
    console.error(err);
    formMsg.textContent = "Error posting. Check console.";
  } finally { postBtn.disabled = false; }
}

listingForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const payload = {
    title: $("title").value.trim(),
    description: $("description").value.trim(),
    price: parseFloat($("price").value) || 0,
    location: $("location").value.trim(),
    phone: $("phone").value.trim()
  };
  // basic validation
  if (!payload.title || !payload.phone) {
    formMsg.textContent = "Please provide title and phone.";
    return;
  }
  postListing(payload);
});

clearBtn.addEventListener("click", () => listingForm.reset());

refreshBtn.addEventListener("click", loadListings);

searchInput.addEventListener("input", () => {
  const q = searchInput.value.trim().toLowerCase();
  if (q.length === 0) {
    loadListings();
    return;
  }
  // Simple client-side filter: reload then filter
  loadListings(q);
});

async function loadListings(filter = "") {
  listingsEl.innerHTML = "";
  loading.style.display = "block";
  try {
    // Query latest 100 listings
    const q = query(listingsCol, orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    const docs = [];
    snap.forEach(d => docs.push(d));
    let filtered = docs;
    if (filter) {
      filtered = docs.filter(d => {
        const data = d.data();
        const text = ${data.title} ${data.description} ${data.location} ${data.price}.toLowerCase();
        return text.includes(filter);
      });
    }
    if (filtered.length === 0) {
      listingsEl.innerHTML = <div class="text-center text-muted my-4">No listings yet.</div>;
    } else {
      filtered.forEach(d => listingsEl.appendChild(renderListing(d)));
    }
  } catch (err) {
    console.error(err);
    listingsEl.innerHTML = <div class="text-danger">Failed to load listings. Check console.</div>;
  } finally {
    loading.style.display = "none";
  }
}

// initial load
loadListings();