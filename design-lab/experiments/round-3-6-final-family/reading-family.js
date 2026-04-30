(function(){
  function setMode(mode){
    document.body.setAttribute('data-guide-mode', mode);
    try {
      localStorage.setItem('buildfi_guide_mode', mode);
    } catch (err) {}
  }

  function initModeSwitch(){
    var saved = 'interactive';
    try {
      saved = localStorage.getItem('buildfi_guide_mode') || 'interactive';
    } catch (err) {}
    setMode(saved);

    document.querySelectorAll('[data-guide-mode-set]').forEach(function(button){
      button.addEventListener('click', function(){
        setMode(button.getAttribute('data-guide-mode-set'));
      });
    });
  }

  function initActiveRail(){
    var links = Array.prototype.slice.call(document.querySelectorAll('.guide-nav a'));
    if (!links.length) return;

    var sections = links
      .map(function(link){
        var id = (link.getAttribute('href') || '').replace('#', '');
        return document.getElementById(id);
      })
      .filter(Boolean);

    var observer = new IntersectionObserver(function(entries){
      var visible = entries
        .filter(function(entry){ return entry.isIntersecting; })
        .sort(function(a, b){ return b.intersectionRatio - a.intersectionRatio; })[0];

      if (!visible) return;
      var currentId = visible.target.id;
      links.forEach(function(link){
        var active = link.getAttribute('href') === '#' + currentId;
        link.classList.toggle('is-active', active);
      });
    }, { rootMargin: '-20% 0px -55% 0px', threshold: [0.2, 0.45, 0.7] });

    sections.forEach(function(section){ observer.observe(section); });
  }

  document.addEventListener('DOMContentLoaded', function(){
    initModeSwitch();
    initActiveRail();
  });
})();
