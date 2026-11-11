(() => {
  const $ = (id) => document.getElementById(id);
  const loginPanel = $("loginPanel");
  const dashboard = $("dashboard");
  const loginForm = $("loginForm");
  const loginMessage = $("loginMessage");
  const list = $("deploymentList");
  let selectedId = null;
  let deployments = [];

  async function api(path, options = {}) {
    const response = await fetch(`${window.AVLEZ_CONFIG.API_BASE}/api${path}`, {
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      ...options
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
    return data;
  }

  function showDashboard() {
    loginPanel.classList.add("hidden");
    dashboard.classList.remove("hidden");
    loadDeployments();
  }

  async function checkSession() {
    try {
      const result = await api("/auth/session");
      if (result.authenticated) showDashboard();
    } catch (_) {}
  }

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    loginMessage.textContent = "Authenticating...";
    const password = $("adminPassword").value;
    try {
      await api("/auth/login", { method: "POST", body: JSON.stringify({ password }) });
      $("adminPassword").value = "";
      loginMessage.textContent = "";
      showDashboard();
    } catch (error) {
      loginMessage.textContent = error.message;
    }
  });

  $("logoutButton").addEventListener("click", async () => {
    try { await api("/auth/logout", { method: "POST", body: "{}" }); } catch (_) {}
    dashboard.classList.add("hidden");
    loginPanel.classList.remove("hidden");
  });

  $("refreshButton").addEventListener("click", loadDeployments);
  $("refreshLogs").addEventListener("click", () => selectedId && loadDetails(selectedId));

  async function loadDeployments() {
    list.innerHTML = '<div class="empty-state">Fetching deployments...</div>';
    try {
      const data = await api("/hosting/deployments");
      deployments = Array.isArray(data.deployments) ? data.deployments : [];
      $("totalDeployments").textContent = deployments.length;
      $("runningDeployments").textContent = deployments.filter(d => (d.state || d.status) === "running" || d.state === "active").length;
      $("offlineDeployments").textContent = deployments.length - Number($("runningDeployments").textContent);
      if (!deployments.length) {
        list.innerHTML = '<div class="empty-state">No deployments were returned for this API key.</div>';
        return;
      }
      list.innerHTML = deployments.map((d) => {
        const id = escapeHtml(d.id || "");
        const name = escapeHtml(d.name || "Unnamed deployment");
        const state = String(d.state || d.status || "unknown").toLowerCase();
        return `<button class="deployment-row ${id === selectedId ? "selected" : ""}" data-id="${id}">
          <span class="deployment-icon">⌘</span><span class="deployment-info"><strong>${name}</strong><small>${id}</small></span>
          <span class="state-dot ${state === "running" || state === "active" ? "is-running" : ""}"></span><span class="deployment-state">${escapeHtml(state)}</span>
        </button>`;
      }).join("");
      list.querySelectorAll("[data-id]").forEach(button => button.addEventListener("click", () => {
        selectedId = button.dataset.id;
        list.querySelectorAll(".deployment-row").forEach(row => row.classList.toggle("selected", row.dataset.id === selectedId));
        loadDetails(selectedId);
      }));
      if (!selectedId || !deployments.some(d => d.id === selectedId)) {
        selectedId = deployments[0].id;
        list.querySelector(`[data-id="${CSS.escape(selectedId)}"]`)?.classList.add("selected");
      }
      if (selectedId) await loadDetails(selectedId);
    } catch (error) {
      list.innerHTML = `<div class="empty-state error-state">${escapeHtml(error.message)}<br><small>Check your Vercel environment variables and API key scopes.</small></div>`;
    }
  }

  async function loadDetails(id) {
    $("detailPlaceholder").classList.add("hidden");
    $("detailContent").classList.remove("hidden");
    $("selectedName").textContent = "Loading...";
    $("selectedState").textContent = "…";
    $("logOutput").textContent = "Loading logs...";
    try {
      const [detail, resources, logs] = await Promise.all([
        api(`/hosting/deployments/${encodeURIComponent(id)}`),
        api(`/hosting/deployments/${encodeURIComponent(id)}/resources`).catch(() => ({})),
        api(`/hosting/deployments/${encodeURIComponent(id)}/logs`).catch(() => ({ logs: [] }))
      ]);
      $("selectedName").textContent = detail.name || id;
      const state = String(detail.state || detail.status || resources.state || "unknown").toLowerCase();
      $("selectedState").textContent = state;
      $("selectedState").className = `state-pill ${state === "running" ? "good" : ""}`;
      const cpu = resources.cpu || {};
      const memory = resources.memory || {};
      const disk = resources.disk || {};
      setResource("cpu", cpu.usedPercent, cpu.limitPercent, "%");
      setResource("memory", memory.usedBytes, memory.limitBytes, "bytes");
      setResource("disk", disk.usedBytes, disk.limitBytes, "bytes");
      const logLines = Array.isArray(logs.logs) ? logs.logs : (Array.isArray(logs.lines) ? logs.lines : []);
      $("logOutput").textContent = logLines.length ? logLines.map(line => typeof line === "string" ? line : JSON.stringify(line)).join("\n") : "No recent logs returned.";
    } catch (error) {
      $("selectedName").textContent = id;
      $("logOutput").textContent = error.message;
    }
  }

  function setResource(type, used, limit, unit) {
    const value = (n) => unit === "bytes" ? formatBytes(n) : `${Number(n || 0).toFixed(1)}%`;
    const percent = limit ? Math.max(0, Math.min(100, Number(used || 0) / Number(limit) * 100)) : 0;
    $(`${type}Value`).textContent = unit === "bytes" ? `${value(used)} / ${value(limit)}` : `${value(used)} / ${value(limit)}`;
    $(`${type}Meter`).style.width = `${percent}%`;
  }

  document.querySelectorAll("[data-power]").forEach(button => {
    button.addEventListener("click", async () => {
      if (!selectedId) return;
      const action = button.dataset.power;
      if (!window.confirm(`${action.toUpperCase()} this deployment?`)) return;
      button.disabled = true;
      try {
        const result = await api(`/hosting/deployments/${encodeURIComponent(selectedId)}/power`, {
          method: "POST", body: JSON.stringify({ action })
        });
        $("logOutput").textContent = (result.logs || []).join("\n") || `Action ${action} accepted. Refreshing status...`;
        await loadDeployments();
      } catch (error) {
        $("logOutput").textContent = error.message;
      } finally {
        button.disabled = false;
      }
    });
  });

  function formatBytes(bytes) {
    const n = Number(bytes);
    if (!Number.isFinite(n) || n <= 0) return "0 B";
    const units = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.min(Math.floor(Math.log(n) / Math.log(1024)), units.length - 1);
    return `${(n / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
  }

  checkSession();
})();
