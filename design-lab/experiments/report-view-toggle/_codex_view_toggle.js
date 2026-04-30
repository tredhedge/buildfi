(function () {
  "use strict";

  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (!document.body || document.body.dataset.codexViewToggle === "1") return;

  document.body.dataset.codexViewToggle = "1";

  var DESKTOP_MIN_WIDTH = 1040;
  var STORAGE_KEY = "codex_report_view_mode";
  var style = document.createElement("style");
  style.textContent = [
    "html{scroll-behavior:smooth}",
    "body.bf-pageify-body{max-width:none !important;background:#ece4d9 !important;padding:0 0 56px !important;color:#1b1712 !important}",
    ".bf-pageify-shell{max-width:1540px;margin:0 auto;padding:24px 22px 72px;display:grid;grid-template-columns:254px minmax(0,1fr);gap:40px;align-items:start}",
    ".bf-pageify-rail{position:sticky;top:18px;align-self:start;max-height:calc(100vh - 36px);overflow:auto;padding-right:4px}",
    ".bf-pageify-rail--hidden,.bf-pageify-source-toc--hidden{display:none !important}",
    ".bf-pageify-main{min-width:0}",
    ".bf-pageify-hidden{display:none !important}",
    ".bf-pageify-body .hdr{display:none !important}",
    ".bf-pageify-body .toc{page-break-after:auto !important}",
    ".bf-pageify-body .narr{line-height:1.8 !important}",
    ".bf-view-toggle{display:flex;gap:8px;align-items:center;margin:0 0 18px;padding:8px;background:rgba(255,250,243,0.82);border:1px solid rgba(169,144,106,0.18);border-radius:999px;backdrop-filter:blur(6px)}",
    ".bf-view-toggle-btn{appearance:none;border:none;background:transparent;color:#6d5b40;font:600 12px/1.2 Inter,sans-serif;padding:10px 14px;border-radius:999px;cursor:pointer;transition:background 0.15s ease,color 0.15s ease,box-shadow 0.15s ease}",
    ".bf-view-toggle-btn.is-active{background:#fffdf9;color:#1b1712;box-shadow:0 2px 10px rgba(49,38,17,0.10)}",
    ".bf-view-toggle-note{font:500 11px/1.3 Inter,sans-serif;color:#8a7556;margin-top:8px;padding-left:2px}",
    ".bf-pageify-rail .toc{max-width:none !important;margin:0 !important;padding:6px 4px 8px 0 !important;background:transparent;border:none;box-shadow:none;page-break-after:auto !important}",
    ".bf-pageify-rail .toc-title{font-family:\"Inter\",sans-serif !important;font-size:10px !important;font-weight:700 !important;letter-spacing:2px !important;text-transform:uppercase !important;color:#9b835d !important;margin:0 0 10px !important;text-align:left !important}",
    ".bf-pageify-rail .toc-chapter{margin:0 0 8px !important;padding:6px 0 4px;background:transparent !important;border:none !important;border-radius:0;opacity:0.74;transition:opacity 0.16s ease}",
    ".bf-pageify-rail .toc-chapter.is-current{opacity:1}",
    ".bf-pageify-rail .toc-chapter-head{display:block !important;gap:0 !important;padding:0 0 0 14px !important;margin:0 0 4px !important;border-bottom:none !important;position:relative}",
    ".bf-pageify-rail .toc-chapter-head:before{content:'';position:absolute;left:0;top:3px;bottom:3px;width:2px;background:transparent;border-radius:999px}",
    ".bf-pageify-rail .toc-chapter.is-current .toc-chapter-head:before{background:#c49a1a}",
    ".bf-pageify-rail .toc-chapter-num{display:block !important;min-width:0 !important;font-size:9px !important;letter-spacing:1.5px !important;margin-bottom:3px !important;color:#9d8967 !important}",
    ".bf-pageify-rail .toc-chapter-title{font-size:15px !important;font-weight:700 !important;line-height:1.24 !important;color:#2c2418 !important}",
    ".bf-pageify-rail .toc-children{padding-left:18px !important;gap:1px !important}",
    ".bf-pageify-rail .toc-chapter:not(.is-current) .toc-children{display:none !important}",
    ".bf-pageify-rail .toc-child{display:flex !important;align-items:flex-start !important;gap:8px !important;padding:5px 4px 5px 10px !important;font-size:11.5px !important;line-height:1.34 !important;border-left:2px solid transparent;border-radius:0 8px 8px 0;transition:border-color 0.15s ease,background 0.15s ease,opacity 0.15s ease;opacity:0.82}",
    ".bf-pageify-rail .toc-child:hover{background:rgba(196,154,26,0.06)}",
    ".bf-pageify-rail .toc-child-num{display:none !important}",
    ".bf-pageify-rail .toc-child-label{line-height:1.34 !important}",
    ".bf-pageify-rail .toc-child-label a{color:#5a4f3a !important;text-decoration:none !important}",
    ".bf-pageify-rail .toc-child.is-active{opacity:1;border-left-color:#c49a1a;background:rgba(196,154,26,0.09)}",
    ".bf-pageify-rail .toc-child.is-active .toc-child-label a{color:#1b1712 !important;font-weight:700}",
    ".bf-pageify-rail .toc-child.is-duplicate{display:none !important}",
    ".bf-pageify-rail::-webkit-scrollbar{width:10px}",
    ".bf-pageify-rail::-webkit-scrollbar-thumb{background:#d0c3b1;border-radius:999px}",
    ".bf-sheet-wrap{max-width:1060px;margin:0 auto 24px;scroll-margin-top:34px}",
    ".bf-sheet-wrap--cover>.cover{margin-bottom:0 !important;border-radius:24px !important;box-shadow:0 18px 46px rgba(45,34,18,0.18)}",
    ".bf-sheet-wrap--executive>.exec-summary{margin-bottom:0 !important;min-height:auto !important;border-radius:18px !important;box-shadow:0 12px 30px rgba(30,24,14,0.12)}",
    ".bf-hybrid-wrap{max-width:1060px;margin:0 auto 34px;scroll-margin-top:34px}",
    ".bf-hybrid-sheet{background:#fffdf9;border:1px solid #e4d9cb;border-radius:26px;box-shadow:0 14px 34px rgba(56,42,19,0.09);overflow:hidden;transition:border-color 0.18s ease,box-shadow 0.18s ease,background 0.18s ease}",
    ".bf-hybrid-sheet>.bf-chapter-cover{margin:0 !important;background:linear-gradient(180deg,#fdf8f0 0%,#fffdfa 68%);border-bottom:1px solid #eadfce;padding:102px 58px 44px !important;transition:padding 0.18s ease}",
    ".bf-hybrid-sheet .bf-chapter-eyebrow{margin-bottom:24px !important}",
    ".bf-hybrid-sheet .bf-chapter-rule{margin:0 auto 32px !important;width:86px !important}",
    ".bf-hybrid-sheet .bf-chapter-title{font-size:58px !important;line-height:1.02 !important;max-width:780px !important;margin:0 auto 22px !important}",
    ".bf-hybrid-sheet .bf-chapter-frame{font-size:17px !important;max-width:620px !important}",
    ".bf-hybrid-body{padding:38px 48px 42px;transition:padding 0.18s ease}",
    ".bf-hybrid-body>*{margin:0 0 34px}",
    ".bf-hybrid-body>*:last-child{margin-bottom:0}",
    ".bf-hybrid-body>.sec-page{padding-top:0 !important;margin-top:0 !important;page-break-before:auto !important;background:transparent !important;border:none !important;box-shadow:none !important;transition:border-color 0.18s ease,background 0.18s ease,box-shadow 0.18s ease,padding 0.18s ease,border-radius 0.18s ease}",
    ".bf-hybrid-body>.sec-page+.sec-page{border-top:1px solid rgba(228,217,203,0.72);padding-top:30px !important}",
    ".bf-hybrid-body>.ft{padding-top:10px !important}",
    "body[data-view-mode='explore'] .bf-pageify-shell{grid-template-columns:286px minmax(0,1fr);gap:30px}",
    "body[data-view-mode='explore'] .bf-view-toggle{background:rgba(255,251,245,0.94);border-color:#dfd3c3;box-shadow:0 8px 18px rgba(39,30,15,0.06)}",
    "body[data-view-mode='explore'] .bf-pageify-rail .toc{padding:14px 12px 16px !important;background:rgba(255,251,245,0.96);border:1px solid #dfd3c3;box-shadow:0 10px 20px rgba(39,30,15,0.08);border-radius:18px}",
    "body[data-view-mode='explore'] .bf-pageify-rail .toc-chapter{padding:10px 10px 8px;border:1px solid transparent;background:rgba(255,255,255,0.48);opacity:0.88}",
    "body[data-view-mode='explore'] .bf-pageify-rail .toc-chapter:not(.is-current) .toc-children{display:flex !important;flex-direction:column;opacity:0.72}",
    "body[data-view-mode='explore'] .bf-pageify-rail .toc-chapter.is-current{background:rgba(196,154,26,0.10);border-color:rgba(196,154,26,0.22);opacity:1}",
    "body[data-view-mode='explore'] .bf-pageify-rail .toc-chapter-head{padding-left:0 !important}",
    "body[data-view-mode='explore'] .bf-pageify-rail .toc-chapter-head:before{display:none}",
    "body[data-view-mode='explore'] .bf-pageify-rail .toc-children{padding-left:10px !important;gap:3px !important}",
    "body[data-view-mode='explore'] .bf-pageify-rail .toc-child{padding:6px 8px 6px 11px !important;border-left-width:3px !important;opacity:0.92}",
    "body[data-view-mode='explore'] .bf-pageify-rail .toc-child.is-active{background:rgba(196,154,26,0.15)}",
    "body[data-view-mode='explore'] .bf-hybrid-sheet{box-shadow:0 16px 38px rgba(56,42,19,0.11)}",
    "body[data-view-mode='explore'] .bf-hybrid-sheet>.bf-chapter-cover{padding:94px 52px 38px !important}",
    "body[data-view-mode='explore'] .bf-hybrid-body{padding:32px 36px 38px}",
    "body[data-view-mode='explore'] .bf-hybrid-body>.sec-page{background:#fffefb !important;border:1px solid #e6dccf !important;border-radius:18px;padding:24px 28px !important;box-shadow:0 8px 18px rgba(53,40,20,0.05) !important}",
    "body[data-view-mode='explore'] .bf-hybrid-body>.sec-page+.sec-page{border-top:none !important;padding-top:24px !important}",
    "@media (max-width:1040px){.bf-pageify-shell{grid-template-columns:1fr;padding:16px 12px 44px}.bf-pageify-rail{position:static;max-height:none;padding-right:0}.bf-view-toggle{margin-bottom:14px}}",
    "@media (max-width:760px){.bf-hybrid-sheet>.bf-chapter-cover{padding:80px 22px 34px !important}.bf-hybrid-sheet .bf-chapter-title{font-size:38px !important}.bf-hybrid-sheet .bf-chapter-frame{font-size:15px !important}.bf-hybrid-body{padding:26px 24px 28px}body[data-view-mode='explore'] .bf-hybrid-body{padding:22px 18px 24px}body[data-view-mode='explore'] .bf-hybrid-body>.sec-page{padding:18px 18px !important}}",
    "@media print{body.bf-pageify-body{background:#fff !important;padding:0 !important}body[data-view-mode='explore'] .bf-view-toggle-wrap,.bf-view-toggle-wrap{display:none !important}.bf-pageify-shell{display:block !important;max-width:none !important;padding:0 !important}.bf-pageify-rail{display:none !important}.bf-pageify-source-toc{display:block !important}.bf-pageify-print-hidden{display:none !important}.bf-sheet-wrap,.bf-hybrid-wrap{max-width:none !important;margin:0 !important}.bf-sheet-wrap>*,.bf-hybrid-sheet{box-shadow:none !important;border:none !important;border-radius:0 !important;background:transparent !important}.bf-hybrid-sheet>.bf-chapter-cover{padding:178px 24px 72px !important;border-bottom:none !important;background:transparent !important}.bf-hybrid-body{padding:0 !important}.bf-hybrid-body>.sec-page,.bf-hybrid-body>.sec-page+.sec-page{border:none !important;box-shadow:none !important;background:transparent !important;padding:0 !important}}"
  ].join("");
  document.head.appendChild(style);

  var currentScript = document.currentScript;
  var body = document.body;
  var shell = document.createElement("div");
  shell.className = "bf-pageify-shell";
  var rail = document.createElement("aside");
  rail.className = "bf-pageify-rail";
  var main = document.createElement("main");
  main.className = "bf-pageify-main";

  body.classList.add("bf-pageify-body");
  body.insertBefore(shell, currentScript);
  shell.appendChild(rail);
  shell.appendChild(main);

  Array.from(body.children).forEach(function (el) {
    if (el === currentScript || el === shell || el.tagName === "SCRIPT") return;
    main.appendChild(el);
  });

  var sourceToc = main.querySelector(".toc");
  var sourceTocUtility = sourceToc ? sourceToc.previousElementSibling : null;
  if (!(sourceTocUtility && sourceTocUtility.querySelector(".grade-ring"))) {
    sourceTocUtility = null;
  }
  var railToc = null;
  if (sourceToc) {
    sourceToc.classList.add("bf-pageify-source-toc");
    railToc = sourceToc.cloneNode(true);
    railToc.classList.add("bf-pageify-rail-toc");
    rail.appendChild(railToc);
  }

  var header = main.querySelector(".hdr");
  if (header) header.classList.add("bf-pageify-hidden", "bf-pageify-print-hidden");

  function wrapChild(el, className) {
    var wrap = document.createElement("section");
    wrap.className = "bf-sheet-wrap" + (className ? " " + className : "");
    wrap.appendChild(el);
    return wrap;
  }

  function startHybridSheet(chapterEl) {
    var wrap = document.createElement("section");
    wrap.className = "bf-hybrid-wrap";
    var sheet = document.createElement("article");
    sheet.className = "bf-hybrid-sheet";
    var bodyEl = document.createElement("div");
    bodyEl.className = "bf-hybrid-body";
    wrap.appendChild(sheet);
    sheet.appendChild(chapterEl);
    sheet.appendChild(bodyEl);
    main.appendChild(wrap);
    return bodyEl;
  }

  var currentHybridBody = null;
  var nodes = Array.from(main.children);
  while (main.firstChild) main.removeChild(main.firstChild);
  nodes.forEach(function (el) {
    if (el.classList.contains("bf-pageify-hidden")) return;
    if (el === sourceToc || el === sourceTocUtility) {
      currentHybridBody = null;
      main.appendChild(el);
      return;
    }
    if (el.classList.contains("cover")) {
      currentHybridBody = null;
      main.appendChild(wrapChild(el, "bf-sheet-wrap--cover"));
      return;
    }
    if (el.classList.contains("exec-summary")) {
      currentHybridBody = null;
      main.appendChild(wrapChild(el, "bf-sheet-wrap--executive"));
      return;
    }
    if (el.classList.contains("bf-chapter-cover")) {
      currentHybridBody = startHybridSheet(el);
      return;
    }
    if (currentHybridBody) currentHybridBody.appendChild(el);
    else main.appendChild(wrapChild(el, ""));
  });

  var toggleWrap = document.createElement("div");
  toggleWrap.className = "bf-view-toggle-wrap";
  var toggle = document.createElement("div");
  toggle.className = "bf-view-toggle";
  var readingBtn = document.createElement("button");
  readingBtn.className = "bf-view-toggle-btn";
  readingBtn.type = "button";
  readingBtn.dataset.viewMode = "reading";
  readingBtn.textContent = "Reading view";
  var exploreBtn = document.createElement("button");
  exploreBtn.className = "bf-view-toggle-btn";
  exploreBtn.type = "button";
  exploreBtn.dataset.viewMode = "explore";
  exploreBtn.textContent = "Explore view";
  var note = document.createElement("div");
  note.className = "bf-view-toggle-note";
  note.textContent = "Same plan, different presentation.";
  toggle.appendChild(readingBtn);
  toggle.appendChild(exploreBtn);
  toggleWrap.appendChild(toggle);
  toggleWrap.appendChild(note);
  main.insertBefore(toggleWrap, main.firstChild);

  function setViewMode(mode) {
    var next = mode === "explore" ? "explore" : "reading";
    body.dataset.viewMode = next;
    readingBtn.classList.toggle("is-active", next === "reading");
    exploreBtn.classList.toggle("is-active", next === "explore");
    try { localStorage.setItem(STORAGE_KEY, next); } catch (err) {}
  }

  readingBtn.addEventListener("click", function () { setViewMode("reading"); });
  exploreBtn.addEventListener("click", function () { setViewMode("explore"); });

  var savedMode = "reading";
  try {
    savedMode = localStorage.getItem(STORAGE_KEY) || "reading";
  } catch (err) {}
  setViewMode(savedMode);

  if (!railToc) return;

  rail.querySelectorAll(".toc-chapter").forEach(function (chapter) {
    var children = Array.from(chapter.querySelectorAll(":scope .toc-child"));
    if (children.length === 1) {
      var title = chapter.querySelector(".toc-chapter-title");
      var childLabel = children[0].querySelector(".toc-child-label");
      if (title && childLabel && title.textContent.trim() === childLabel.textContent.trim()) {
        children[0].classList.add("is-duplicate");
      }
    }
  });

  var railLinks = Array.from(rail.querySelectorAll(".toc-child a[href^='#']"));
  var linkRecords = railLinks.map(function (link) {
    var href = link.getAttribute("href");
    if (!href || href.charAt(0) !== "#") return null;
    var id = href.slice(1);
    var target = document.getElementById(id);
    if (!target) return null;
    return {
      id: id,
      target: target,
      link: link,
      child: link.closest(".toc-child"),
      chapter: link.closest(".toc-chapter")
    };
  }).filter(Boolean);

  var currentId = linkRecords.length ? linkRecords[0].id : "";
  function activate(id) {
    var activeChapter = null;
    var activeChild = null;
    linkRecords.forEach(function (record) {
      var active = record.id === id;
      if (record.child) record.child.classList.toggle("is-active", active);
      if (record.link) record.link.classList.toggle("is-active", active);
      if (active) {
        activeChapter = record.chapter;
        activeChild = record.child;
      }
    });
    rail.querySelectorAll(".toc-chapter").forEach(function (chapter) {
      chapter.classList.toggle("is-current", chapter === activeChapter);
    });
    if (activeChild && !rail.classList.contains("bf-pageify-rail--hidden")) {
      try { activeChild.scrollIntoView({ block: "nearest" }); } catch (err) {}
    }
  }

  function computeCurrentId() {
    if (!linkRecords.length) return "";
    var focusLine = window.innerHeight * 0.28;
    var chosen = linkRecords[0];
    linkRecords.forEach(function (record) {
      var rect = record.target.getBoundingClientRect();
      if (rect.top <= focusLine) chosen = record;
    });
    return chosen.id;
  }

  var ticking = false;
  function syncActiveFromScroll() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(function () {
      ticking = false;
      var nextId = computeCurrentId();
      if (!nextId || nextId === currentId) return;
      currentId = nextId;
      activate(nextId);
      try { history.replaceState(null, "", "#" + nextId); } catch (err) {}
    });
  }

  railLinks.forEach(function (link) {
    link.addEventListener("click", function (event) {
      event.preventDefault();
      var href = link.getAttribute("href");
      if (!href || href.charAt(0) !== "#") return;
      var id = href.slice(1);
      var target = document.getElementById(id);
      if (!target) return;
      currentId = id;
      activate(id);
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      try { history.replaceState(null, "", "#" + id); } catch (err) {}
    });
  });

  var desktopQuery = window.matchMedia("(min-width:" + DESKTOP_MIN_WIDTH + "px)");
  function syncLayoutMode() {
    var useRail = !!railToc && desktopQuery.matches;
    rail.classList.toggle("bf-pageify-rail--hidden", !useRail);
    if (sourceToc) sourceToc.classList.toggle("bf-pageify-source-toc--hidden", useRail);
    if (sourceTocUtility) {
      sourceTocUtility.classList.toggle("bf-pageify-hidden", useRail);
      sourceTocUtility.classList.toggle("bf-pageify-print-hidden", useRail);
    }
  }

  if (desktopQuery.addEventListener) desktopQuery.addEventListener("change", syncLayoutMode);
  else if (desktopQuery.addListener) desktopQuery.addListener(syncLayoutMode);

  syncLayoutMode();
  activate(currentId);
  syncActiveFromScroll();
  window.addEventListener("scroll", syncActiveFromScroll, { passive: true });
  window.addEventListener("resize", syncActiveFromScroll);
})();
