// report-pageify.js — light-touch reading aid (codex 2026-04-27).
//
// User rejected the heavy "page card + dark side rail" redesign. This is
// the minimal alternative: zero layout changes, no chrome, no background
// shift. Just two unobtrusive overlays:
//
//   1. A 3px gold progress strip pinned to the very top of the viewport,
//      filling left-to-right as the reader scrolls. Pure visual cue —
//      "you are 60% through this document".
//
//   2. A small chapter-position chip at top-right that shows the current
//      chapter eyebrow + section name as the reader scrolls (driven by
//      IntersectionObserver on existing anchors). Click expands a clean
//      drop-down TOC for jumping. Click outside or on a target closes it.
//      Click target also smooth-scrolls and updates the URL hash.
//
// Print mode: both overlays hidden via @media print.

(function() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.__BF_PAGEIFIED__) return;
  window.__BF_PAGEIFIED__ = true;
  if (typeof document.body === 'undefined') return;

  function _isFR() {
    return !!(window.__BUILDFI__ && window.__BUILDFI__.meta && window.__BUILDFI__.meta.fr);
  }

  function _normLabel(s) {
    return String(s || '').toLowerCase()
      .replace(/^(the |a |an |le |la |les |l’|l')/, '').trim();
  }

  function collectAnchors() {
    var out = [];
    var nodeList = document.querySelectorAll(
      '.bf-chapter-cover, h3.sec[id^="sec-"], div.sec-page[id^="sec-"]'
    );
    var seen = {};
    var chIdx = 0;
    var currCh = 0;
    for (var i = 0; i < nodeList.length; i++) {
      var el = nodeList[i];
      if (el.classList.contains('bf-chapter-cover')) {
        chIdx++;
        currCh = chIdx;
        var eyebrow = el.querySelector('.bf-chapter-eyebrow');
        var titleEl = el.querySelector('.bf-chapter-title');
        var ch = {
          kind: 'chapter',
          el: el,
          id: el.id || ('bf-chapter-' + chIdx),
          label: titleEl ? titleEl.textContent.trim() : 'Chapitre',
          eyebrow: eyebrow ? eyebrow.textContent.trim() : ('Chapitre ' + chIdx),
          chapterIdx: chIdx,
          children: []
        };
        if (!el.id) el.id = ch.id;
        out.push(ch);
        continue;
      }
      var id = el.getAttribute('id');
      if (!id || id.indexOf('sec-') !== 0) continue;
      if (seen[id]) continue;
      seen[id] = true;
      var label = '';
      if (el.tagName === 'H3') {
        label = el.textContent.trim()
          .replace(/^☆\s*/, '')
          .replace(/^\d+\s*[—–\-]\s*/, '')
          .replace(/^\d+\s+/, '');
      } else {
        var inner = el.querySelector('h3.sec');
        label = inner
          ? inner.textContent.trim()
              .replace(/^☆\s*/, '').replace(/^\d+\s*[—–\-]\s*/, '').replace(/^\d+\s+/, '')
          : id.replace(/^sec-/, '').replace(/-/g, ' ');
      }
      var entry = { kind: 'section', el: el, id: id, label: label, chapterIdx: currCh };
      out.push(entry);
      // Attach to current chapter's children list.
      for (var c = out.length - 1; c >= 0; c--) {
        if (out[c].kind === 'chapter' && out[c].chapterIdx === currCh) {
          out[c].children.push(entry); break;
        }
      }
    }
    return out;
  }

  function buildTocMenu(anchors, fr) {
    var html = '<div class="bf-chip-toc-header">' +
      '<span class="bf-chip-toc-title">' + (fr ? 'Sommaire' : 'Contents') + '</span>' +
      '<button type="button" class="bf-chip-toc-close" aria-label="' +
        (fr ? 'Fermer' : 'Close') + '">×</button>' +
      '</div><div class="bf-chip-toc-list">';
    anchors.forEach(function(a) {
      if (a.kind !== 'chapter') return;
      var hideChildren = (a.children.length === 1 &&
                          _normLabel(a.children[0].label) === _normLabel(a.label));
      html += '<div class="bf-chip-toc-chapter" data-bf-chip-chapter="' + a.chapterIdx + '">' +
        '<a href="#' + a.id + '" data-bf-chip-target="' + a.id + '" class="bf-chip-toc-chapter-link">' +
          '<span class="bf-chip-toc-eyebrow">' + a.eyebrow + '</span>' +
          '<span class="bf-chip-toc-chapter-title">' + a.label + '</span>' +
        '</a>';
      if (!hideChildren && a.children.length > 0) {
        html += '<ul class="bf-chip-toc-sections">';
        a.children.forEach(function(child) {
          html += '<li><a href="#' + child.id + '" data-bf-chip-target="' + child.id + '" ' +
                       'class="bf-chip-toc-section-link">' + child.label + '</a></li>';
        });
        html += '</ul>';
      }
      html += '</div>';
    });
    html += '</div>';
    return html;
  }

  function injectStyles() {
    var css = [
      // ── Top progress strip ──────────────────────────────────────────
      '.bf-progress-strip{position:fixed;top:0;left:0;height:3px;width:0;background:linear-gradient(90deg,#c49a1a,#d4ae3a);z-index:200;transition:width 0.08s ease-out;pointer-events:none}',
      // ── Floating chapter chip (top-right) ───────────────────────────
      '.bf-chip{position:fixed;top:18px;right:22px;z-index:210;background:rgba(255,255,255,0.94);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);border:1px solid #e8e0d4;border-radius:24px;padding:8px 14px 8px 12px;font-family:Inter,sans-serif;display:flex;align-items:center;gap:10px;box-shadow:0 2px 12px rgba(40,32,18,0.10);cursor:pointer;transition:opacity 0.2s ease,box-shadow 0.15s ease;max-width:340px;user-select:none}',
      '.bf-chip:hover{box-shadow:0 4px 18px rgba(40,32,18,0.16);opacity:1 !important}',
      '.bf-chip-icon{font-family:"JetBrains Mono",monospace;font-size:13px;color:#c49a1a;font-weight:700;line-height:1}',
      '.bf-chip-text{display:flex;flex-direction:column;line-height:1.2;min-width:0;flex:1}',
      '.bf-chip-eyebrow{font-size:9px;font-weight:700;letter-spacing:1.5px;color:#a89460;text-transform:uppercase;white-space:nowrap}',
      '.bf-chip-section{font-family:"Playfair Display",Georgia,serif;font-size:13px;font-weight:600;color:#252d39;letter-spacing:-0.1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.bf-chip-caret{font-size:9px;color:#a89460;flex-shrink:0;transition:transform 0.15s}',
      '.bf-chip.bf-chip-open .bf-chip-caret{transform:rotate(180deg)}',
      // ── Drop-down TOC menu ──────────────────────────────────────────
      '.bf-chip-toc{position:fixed;top:62px;right:22px;z-index:209;width:340px;max-height:calc(100vh - 90px);overflow-y:auto;background:#fff;border:1px solid #e8e0d4;border-radius:8px;box-shadow:0 8px 28px rgba(40,32,18,0.18),0 2px 8px rgba(40,32,18,0.08);font-family:Inter,sans-serif;display:none;animation:bf-chip-fade 0.15s ease-out}',
      '.bf-chip-toc.bf-chip-toc-open{display:block}',
      '@keyframes bf-chip-fade{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}',
      '.bf-chip-toc::-webkit-scrollbar{width:6px}',
      '.bf-chip-toc::-webkit-scrollbar-thumb{background:rgba(196,154,26,0.3);border-radius:3px}',
      '.bf-chip-toc-header{display:flex;align-items:center;justify-content:space-between;padding:14px 18px 10px;border-bottom:1px solid #f0ece4}',
      '.bf-chip-toc-title{font-size:10.5px;letter-spacing:2.4px;text-transform:uppercase;color:#a89460;font-weight:700}',
      '.bf-chip-toc-close{background:transparent;border:none;color:#888;font-size:22px;line-height:1;cursor:pointer;padding:0 4px;font-family:Inter,sans-serif}',
      '.bf-chip-toc-close:hover{color:#252d39}',
      '.bf-chip-toc-list{padding:8px 0 14px}',
      '.bf-chip-toc-chapter{padding:0 6px;margin-bottom:4px}',
      '.bf-chip-toc-chapter-link{display:block;padding:10px 14px;text-decoration:none;color:#252d39;border-radius:5px;transition:background 0.12s}',
      '.bf-chip-toc-chapter-link:hover{background:#fdf9ee}',
      '.bf-chip-toc-chapter-link.bf-chip-active{background:#fdf9ee}',
      '.bf-chip-toc-eyebrow{display:block;font-size:9px;font-weight:700;letter-spacing:1.4px;color:#a89460;text-transform:uppercase;margin-bottom:2px}',
      '.bf-chip-toc-chapter-title{display:block;font-family:"Playfair Display",Georgia,serif;font-size:14px;font-weight:600;line-height:1.25;letter-spacing:-0.1px}',
      '.bf-chip-toc-sections{list-style:none;padding:6px 0 4px 14px;margin:0}',
      '.bf-chip-toc-sections li{list-style:none;margin:0}',
      '.bf-chip-toc-section-link{display:block;padding:5px 14px 5px 14px;text-decoration:none;color:#5a4f3a;font-size:11.5px;line-height:1.35;border-left:2px solid transparent;border-radius:0 3px 3px 0;transition:color 0.12s,border-left-color 0.12s,background 0.12s}',
      '.bf-chip-toc-section-link:hover{color:#252d39;background:#fafaf6;border-left-color:rgba(196,154,26,0.3)}',
      '.bf-chip-toc-section-link.bf-chip-active{color:#c49a1a;border-left-color:#c49a1a;background:#fdf9ee;font-weight:600}',
      // ── Mobile (<760px): chip becomes minimal, menu full-width ──────
      '@media (max-width:760px){',
        '.bf-chip{top:8px;right:8px;left:8px;max-width:none;border-radius:8px;padding:8px 12px}',
        '.bf-chip-toc{top:54px;right:8px;left:8px;width:auto}',
      '}',
      // ── Print: hide all overlays ────────────────────────────────────
      '@media print{.bf-progress-strip,.bf-chip,.bf-chip-toc{display:none !important}}'
    ].join('\n');
    var style = document.createElement('style');
    style.id = 'bf-pageify-styles';
    style.textContent = css;
    document.head.appendChild(style);
  }

  function buildOverlays(anchors, fr) {
    // Progress strip
    var strip = document.createElement('div');
    strip.className = 'bf-progress-strip';
    strip.id = 'bf-progress-strip';
    document.body.appendChild(strip);

    // Chapter chip
    var chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'bf-chip no-print';
    chip.id = 'bf-chip';
    chip.setAttribute('aria-haspopup', 'menu');
    chip.setAttribute('aria-expanded', 'false');
    chip.innerHTML =
      '<span class="bf-chip-icon">☰</span>' +
      '<span class="bf-chip-text">' +
        '<span class="bf-chip-eyebrow" id="bf-chip-eyebrow">' +
          (fr ? 'Sommaire' : 'Contents') + '</span>' +
        '<span class="bf-chip-section" id="bf-chip-section">' +
          (fr ? 'Cliquer pour naviguer' : 'Click to navigate') + '</span>' +
      '</span>' +
      '<span class="bf-chip-caret">▼</span>';
    document.body.appendChild(chip);

    // Drop-down menu
    var menu = document.createElement('div');
    menu.className = 'bf-chip-toc no-print';
    menu.id = 'bf-chip-toc';
    menu.setAttribute('role', 'menu');
    menu.innerHTML = buildTocMenu(anchors, fr);
    document.body.appendChild(menu);
  }

  function bindBehaviour(anchors, fr) {
    var chip = document.getElementById('bf-chip');
    var menu = document.getElementById('bf-chip-toc');
    var strip = document.getElementById('bf-progress-strip');
    var eyebrowEl = document.getElementById('bf-chip-eyebrow');
    var sectionEl = document.getElementById('bf-chip-section');
    if (!chip || !menu || !strip) return;

    function closeMenu() {
      menu.classList.remove('bf-chip-toc-open');
      chip.classList.remove('bf-chip-open');
      chip.setAttribute('aria-expanded', 'false');
    }
    function openMenu() {
      menu.classList.add('bf-chip-toc-open');
      chip.classList.add('bf-chip-open');
      chip.setAttribute('aria-expanded', 'true');
    }
    chip.addEventListener('click', function(e) {
      e.stopPropagation();
      if (menu.classList.contains('bf-chip-toc-open')) closeMenu();
      else openMenu();
    });
    document.addEventListener('click', function(e) {
      if (!menu.contains(e.target) && !chip.contains(e.target)) closeMenu();
    });
    var closeBtn = menu.querySelector('.bf-chip-toc-close');
    if (closeBtn) closeBtn.addEventListener('click', function(e) {
      e.stopPropagation(); closeMenu();
    });

    // Smooth-scroll on TOC click + close menu.
    menu.querySelectorAll('[data-bf-chip-target]').forEach(function(link) {
      link.addEventListener('click', function(e) {
        e.preventDefault();
        var target = document.getElementById(this.getAttribute('data-bf-chip-target'));
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        closeMenu();
      });
    });

    // Progress strip — fills as user scrolls.
    function updateProgress() {
      var doc = document.documentElement;
      var scrollTop = (window.pageYOffset || doc.scrollTop) - (doc.clientTop || 0);
      var scrollHeight = doc.scrollHeight - doc.clientHeight;
      var pct = scrollHeight > 0 ? Math.min(100, Math.max(0, scrollTop / scrollHeight * 100)) : 0;
      strip.style.width = pct + '%';
    }
    var ticking = false;
    window.addEventListener('scroll', function() {
      if (!ticking) {
        window.requestAnimationFrame(function() { updateProgress(); ticking = false; });
        ticking = true;
      }
    }, { passive: true });
    updateProgress();

    // Scroll-spy via IntersectionObserver — updates chip text + active
    // highlight in dropdown as the reader scrolls.
    var idMap = {};
    anchors.forEach(function(a) { idMap[a.id] = a; });
    var visible = {};
    var lastActive = null;

    function setActive(id) {
      if (!id || id === lastActive) return;
      lastActive = id;
      var entry = idMap[id];
      if (!entry) return;
      // Find owning chapter for the chip text.
      var chapter = null;
      for (var i = 0; i < anchors.length; i++) {
        if (anchors[i].kind === 'chapter' && anchors[i].chapterIdx === entry.chapterIdx) {
          chapter = anchors[i]; break;
        }
      }
      if (entry.kind === 'chapter') {
        eyebrowEl.textContent = entry.eyebrow;
        sectionEl.textContent = entry.label;
      } else if (chapter) {
        eyebrowEl.textContent = chapter.eyebrow;
        sectionEl.textContent = entry.label;
      } else {
        eyebrowEl.textContent = (fr ? 'Section' : 'Section');
        sectionEl.textContent = entry.label;
      }
      // Highlight in dropdown.
      menu.querySelectorAll('[data-bf-chip-target]').forEach(function(link) {
        link.classList.toggle('bf-chip-active',
          link.getAttribute('data-bf-chip-target') === id);
      });
      // Update URL hash without scrolling.
      if (history && typeof history.replaceState === 'function') {
        try { history.replaceState(null, '', '#' + id); } catch (e) {}
      }
    }

    var io = new IntersectionObserver(function(entries) {
      entries.forEach(function(e) {
        if (!idMap[e.target.id]) return;
        if (e.isIntersecting) visible[e.target.id] = e.intersectionRatio;
        else delete visible[e.target.id];
      });
      var bestSec = null, bestSecRatio = 0;
      var bestChap = null, bestChapRatio = 0;
      Object.keys(visible).forEach(function(id) {
        var ratio = visible[id];
        var entry = idMap[id];
        if (!entry) return;
        if (entry.kind === 'section') {
          if (ratio > bestSecRatio) { bestSec = id; bestSecRatio = ratio; }
        } else {
          if (ratio > bestChapRatio) { bestChap = id; bestChapRatio = ratio; }
        }
      });
      var pick = bestSec || bestChap;
      if (pick) setActive(pick);
    }, { rootMargin: '-15% 0px -55% 0px', threshold: [0, 0.1, 0.3, 0.5, 1] });
    anchors.forEach(function(a) { if (a.el && a.id) io.observe(a.el); });

    // Honor initial #hash.
    var initialHash = (location.hash || '').replace(/^#/, '');
    if (initialHash && idMap[initialHash]) setTimeout(function() { setActive(initialHash); }, 50);
  }

  function boot() {
    var anchors = collectAnchors();
    if (!anchors.length) return;
    injectStyles();
    buildOverlays(anchors, _isFR());
    bindBehaviour(anchors, _isFR());
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
