// Offline page behaviour (kept out of offline.html so no inline script is
// needed): retry on tap, and reload on its own once the connection is back.
document.getElementById("retry").addEventListener("click", () => window.location.reload());
window.addEventListener("online", () => window.location.reload());
