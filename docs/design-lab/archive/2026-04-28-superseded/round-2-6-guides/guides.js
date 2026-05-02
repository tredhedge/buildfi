document.addEventListener("DOMContentLoaded", () => {
  const links = Array.from(document.querySelectorAll(".rail-nav a[href^='#']"));
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
    {
      rootMargin: "-20% 0px -55% 0px",
      threshold: 0.1,
    }
  );

  sections.forEach(({ target }) => observer.observe(target));
});
