document.addEventListener("DOMContentLoaded", () => {
  initReadingRails();
  initProductThemes();
  initScenarioSwitches();
});

function initReadingRails() {
  const rails = document.querySelectorAll(".reading-nav");
  rails.forEach((rail) => {
    const links = Array.from(rail.querySelectorAll("a[href^='#']"));
    const sections = links
      .map((link) => {
        const target = document.querySelector(link.getAttribute("href"));
        return target ? { link, target } : null;
      })
      .filter(Boolean);

    if (!sections.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        let activeId = null;
        entries.forEach((entry) => {
          if (entry.isIntersecting) activeId = `#${entry.target.id}`;
        });
        if (!activeId) return;
        links.forEach((link) => {
          link.classList.toggle("is-active", link.getAttribute("href") === activeId);
        });
      },
      { rootMargin: "-18% 0px -58% 0px", threshold: 0.12 }
    );

    sections.forEach(({ target }) => observer.observe(target));
  });
}

function initProductThemes() {
  const key = "buildfi_full_proto_theme";
  const pages = document.querySelectorAll(".product-page");
  if (!pages.length) return;

  let current = "dark";
  try {
    const saved = localStorage.getItem(key);
    if (saved === "light" || saved === "dark") current = saved;
  } catch {}

  setTheme(current);

  document.querySelectorAll("[data-set-theme]").forEach((button) => {
    button.addEventListener("click", () => {
      const next = button.getAttribute("data-set-theme") || "dark";
      setTheme(next);
      try { localStorage.setItem(key, next); } catch {}
    });
  });

  function setTheme(theme) {
    pages.forEach((page) => page.setAttribute("data-theme", theme));
    document.querySelectorAll("[data-theme-readout]").forEach((node) => {
      node.textContent = theme === "dark" ? "Dark product mode" : "Light product mode";
    });
  }
}

function initScenarioSwitches() {
  document.querySelectorAll("[data-scenario-group]").forEach((group) => {
    const cards = Array.from(group.querySelectorAll("[data-scenario]"));
    const targetId = group.getAttribute("data-scenario-target");
    const target = targetId ? document.getElementById(targetId) : null;
    if (!target || !cards.length) return;

    cards.forEach((card) => {
      card.addEventListener("click", () => {
        cards.forEach((item) => item.classList.remove("is-active"));
        card.classList.add("is-active");
        const payload = card.getAttribute("data-payload");
        if (!payload) return;
        try {
          const parsed = JSON.parse(payload);
          Object.keys(parsed).forEach((key) => {
            const node = target.querySelector(`[data-bind="${key}"]`);
            if (node) node.textContent = parsed[key];
          });
        } catch {}
      });
    });
  });
}
