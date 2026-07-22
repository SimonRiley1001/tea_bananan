/* TapConnect — consent-based networking via QR codes.
 * No face recognition, no servers, no tracking.
 * Your card lives in this browser; contacts are saved only on this device. */

(function () {
  "use strict";

  var LS_PROFILE = "tapconnect.profile";
  var LS_CONTACTS = "tapconnect.contacts";
  var PREFIX = "TAPCONNECT1:"; // marks QR payloads as ours

  // ---- social link definitions: how to turn a handle into a real URL ----
  var SOCIALS = [
    { key: "instagram", label: "Instagram", url: function (v) { return "https://instagram.com/" + strip(v); } },
    { key: "x",         label: "X",         url: function (v) { return "https://x.com/" + strip(v); } },
    { key: "linkedin",  label: "LinkedIn",  url: function (v) { return isUrl(v) ? v : "https://linkedin.com/in/" + strip(v); } },
    { key: "tiktok",    label: "TikTok",    url: function (v) { return "https://tiktok.com/@" + strip(v); } },
    { key: "whatsapp",  label: "WhatsApp",  url: function (v) { return "https://wa.me/" + v.replace(/[^0-9]/g, ""); } },
    { key: "email",     label: "Email",     url: function (v) { return "mailto:" + v; } },
    { key: "website",   label: "Website",   url: function (v) { return isUrl(v) ? v : "https://" + v; } }
  ];

  function strip(v) { return String(v).replace(/^@+/, "").trim(); }
  function isUrl(v) { return /^https?:\/\//i.test(v); }
  function $(id) { return document.getElementById(id); }
  function initials(name) {
    var p = (name || "?").trim().split(/\s+/);
    return ((p[0] || "?")[0] + (p[1] ? p[1][0] : "")).toUpperCase();
  }
  function load(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) || fallback; }
    catch (e) { return fallback; }
  }
  function save(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

  var toastTimer;
  function toast(msg) {
    var t = $("toast");
    t.textContent = msg;
    t.classList.remove("hidden");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.add("hidden"); }, 2200);
  }

  // =================== TABS ===================
  var tabs = document.querySelectorAll(".tab-btn");
  tabs.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var name = btn.dataset.tab;
      tabs.forEach(function (b) { b.classList.toggle("active", b === btn); });
      document.querySelectorAll(".tab-panel").forEach(function (p) {
        p.classList.toggle("active", p.id === "tab-" + name);
      });
      if (name !== "scan") stopScan();
      if (name === "contacts") renderContacts();
    });
  });

  // =================== PROFILE / MY CARD ===================
  var form = $("profile-form");

  function readForm() {
    var p = {
      name: $("p-name").value.trim(),
      headline: $("p-headline").value.trim(),
      socials: {}
    };
    SOCIALS.forEach(function (s) {
      var v = ($("s-" + s.key) ? $("s-" + s.key).value.trim() : "");
      if (v) p.socials[s.key] = v;
    });
    return p;
  }

  function fillForm(p) {
    if (!p) return;
    $("p-name").value = p.name || "";
    $("p-headline").value = p.headline || "";
    SOCIALS.forEach(function (s) {
      var el = $("s-" + s.key);
      if (el) el.value = (p.socials && p.socials[s.key]) || "";
    });
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var p = readForm();
    if (!p.name) { toast("Add your name first"); $("p-name").focus(); return; }
    if (Object.keys(p.socials).length === 0) { toast("Add at least one link"); return; }
    save(LS_PROFILE, p);
    showQR(p);
    toast("Card saved ✓");
  });

  $("edit-btn").addEventListener("click", function () {
    form.classList.remove("hidden");
    $("qr-wrap").classList.add("hidden");
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  function showQR(p) {
    // compact payload: only what we need, base64 so QR stays scannable
    var payload = { n: p.name, h: p.headline, s: p.socials };
    var text = PREFIX + b64encode(JSON.stringify(payload));

    var qr = qrcode(0, "M"); // type 0 = auto-size, medium error correction
    qr.addData(text);
    qr.make();

    $("qrcode").innerHTML = qr.createImgTag(5, 0); // cell size 5, no margin
    var img = $("qrcode").querySelector("img");
    if (img) { img.style.width = "220px"; img.style.height = "220px"; }

    $("qr-name").textContent = p.name;
    $("qr-headline").textContent = p.headline || "";
    form.classList.add("hidden");
    $("qr-wrap").classList.remove("hidden");
  }

  function b64encode(str) { return btoa(unescape(encodeURIComponent(str))); }
  function b64decode(str) { return decodeURIComponent(escape(atob(str))); }

  // =================== SCANNING ===================
  var video = $("video");
  var stream = null;
  var rafId = null;
  var canvas = document.createElement("canvas");
  var ctx = canvas.getContext("2d", { willReadFrequently: true });

  $("start-scan").addEventListener("click", startScan);
  $("stop-scan").addEventListener("click", stopScan);

  function startScan() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      $("scan-status").textContent = "Camera not supported on this browser.";
      return;
    }
    $("scan-status").textContent = "Requesting camera…";
    navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false })
      .then(function (s) {
        stream = s;
        video.srcObject = s;
        video.play();
        $("start-scan").classList.add("hidden");
        $("stop-scan").classList.remove("hidden");
        $("scan-status").textContent = "Point at a TapConnect QR…";
        rafId = requestAnimationFrame(tick);
      })
      .catch(function (err) {
        $("scan-status").textContent = "Couldn't open camera: " + err.message +
          " (On iPhone/Android the page must be served over HTTPS or localhost.)";
      });
  }

  function stopScan() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
    if (stream) { stream.getTracks().forEach(function (t) { t.stop(); }); stream = null; }
    video.srcObject = null;
    $("start-scan").classList.remove("hidden");
    $("stop-scan").classList.add("hidden");
  }

  function tick() {
    if (!stream) return;
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      var img = ctx.getImageData(0, 0, canvas.width, canvas.height);
      var code = jsQR(img.data, img.width, img.height, { inversionAttempts: "dontInvert" });
      if (code && code.data) {
        handleScan(code.data);
        return; // stop the loop; handleScan restarts if needed
      }
    }
    rafId = requestAnimationFrame(tick);
  }

  function handleScan(data) {
    if (data.indexOf(PREFIX) !== 0) {
      $("scan-status").textContent = "That's not a TapConnect code — try again.";
      rafId = requestAnimationFrame(tick);
      return;
    }
    var contact;
    try {
      var obj = JSON.parse(b64decode(data.slice(PREFIX.length)));
      contact = { name: obj.n || "Unknown", headline: obj.h || "", socials: obj.s || {}, added: Date.now() };
    } catch (e) {
      $("scan-status").textContent = "Couldn't read that code.";
      rafId = requestAnimationFrame(tick);
      return;
    }
    saveContact(contact);
    stopScan();
    toast("Connected with " + contact.name + " ✓");
    $("scan-status").textContent = "Saved! Check the Contacts tab.";
  }

  function saveContact(c) {
    var contacts = load(LS_CONTACTS, []);
    // de-dupe by name + first social value
    var sig = c.name + "|" + JSON.stringify(c.socials);
    contacts = contacts.filter(function (x) {
      return (x.name + "|" + JSON.stringify(x.socials)) !== sig;
    });
    contacts.unshift(c);
    save(LS_CONTACTS, contacts);
  }

  // =================== CONTACTS ===================
  function renderContacts() {
    var contacts = load(LS_CONTACTS, []);
    var list = $("contacts-list");
    $("contact-count").textContent = contacts.length;
    $("contacts-empty").classList.toggle("hidden", contacts.length > 0);
    list.innerHTML = "";

    contacts.forEach(function (c, idx) {
      var el = document.createElement("div");
      el.className = "contact";

      var links = SOCIALS.filter(function (s) { return c.socials[s.key]; }).map(function (s) {
        var href = s.url(c.socials[s.key]);
        return '<a href="' + escapeAttr(href) + '" target="_blank" rel="noopener noreferrer">' + s.label + "</a>";
      }).join("");

      el.innerHTML =
        '<div class="avatar">' + escapeHtml(initials(c.name)) + "</div>" +
        '<div class="contact-info">' +
          '<div class="name">' + escapeHtml(c.name) + "</div>" +
          (c.headline ? '<div class="headline">' + escapeHtml(c.headline) + "</div>" : "") +
          '<div class="contact-links">' + links + "</div>" +
        "</div>" +
        '<button class="contact-del" data-idx="' + idx + '" title="Remove">×</button>';
      list.appendChild(el);
    });

    list.querySelectorAll(".contact-del").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var contacts = load(LS_CONTACTS, []);
        contacts.splice(parseInt(btn.dataset.idx, 10), 1);
        save(LS_CONTACTS, contacts);
        renderContacts();
      });
    });
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function escapeAttr(s) { return escapeHtml(s); }

  // =================== INIT ===================
  var saved = load(LS_PROFILE, null);
  if (saved) { fillForm(saved); showQR(saved); }
  renderContacts();
})();
