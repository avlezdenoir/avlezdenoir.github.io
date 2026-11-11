(() => {
  const cfg = window.AVLEZ_CONFIG || {};
  if (location.hostname.endsWith("github.io") &&
      cfg.VERCEL_SYSTEM_URL &&
      !cfg.VERCEL_SYSTEM_URL.includes("YOUR-VERCEL-PROJECT")) {
    document.querySelectorAll('a[href="system.html"]').forEach(link => {
      link.href = cfg.VERCEL_SYSTEM_URL;
    });
  }
  const intro = document.getElementById("intro");
  if (!intro) return;
  const bar = document.getElementById("loadingBar");
  const copy = document.getElementById("loadingCopy");
  const start = document.getElementById("startButton");
  let progress = 0;
  const tick = () => {
    progress = Math.min(100, progress + Math.ceil(Math.random() * 13));
    bar.style.width = `${progress}%`;
    copy.textContent = `INITIALIZING INTERFACE · ${String(progress).padStart(2, "0")}%`;
    if (progress < 100) {
      window.setTimeout(tick, 90 + Math.random() * 120);
    } else {
      copy.textContent = "INTERFACE READY · ACCESS GRANTED";
      start.disabled = false;
      start.classList.add("ready");
    }
  };
  window.setTimeout(tick, 250);
  start.addEventListener("click", () => {
    intro.classList.add("intro-exit");
    document.body.classList.remove("intro-pending");
    window.setTimeout(() => intro.remove(), 850);
  });
  // GitHub Pages is the static mirror; send protected System access to Vercel.
  if (location.hostname.endsWith("github.io")) {
    document.querySelectorAll('a[href="system.html"]').forEach(link => {
      link.addEventListener("click", event => {
        event.preventDefault();
        location.href = window.AVLEZ_CONFIG.VERCEL_SYSTEM_URL;
      });
    });
  }
  const menu = document.getElementById("mobileMenu");
  const nav = document.getElementById("mainNav");
  menu?.addEventListener("click", () => nav.classList.toggle("nav-open"));
  nav?.querySelectorAll("a").forEach(a => a.addEventListener("click", () => nav.classList.remove("nav-open")));
  document.querySelectorAll(".nav-link[href^='#']").forEach(link => {
    link.addEventListener("click", () => {
      document.querySelectorAll(".nav-link").forEach(item => item.classList.remove("active"));
      link.classList.add("active");
    });
  });
})();
