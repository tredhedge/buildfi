(function(){
  function applyTheme(theme){
    document.body.setAttribute('data-theme', theme);
    document.querySelectorAll('[data-set-theme]').forEach(function(button){
      button.classList.toggle('is-active', button.getAttribute('data-set-theme') === theme);
    });
    try {
      localStorage.setItem('buildfi_tool_mode', theme);
    } catch (err) {}
  }

  function initTheme(){
    var saved = 'dark';
    try {
      saved = localStorage.getItem('buildfi_tool_mode') || 'dark';
    } catch (err) {}
    applyTheme(saved);
    document.querySelectorAll('[data-set-theme]').forEach(function(button){
      button.addEventListener('click', function(){
        applyTheme(button.getAttribute('data-set-theme'));
      });
    });
  }

  function initActiveRail(){
    var links = Array.prototype.slice.call(document.querySelectorAll('.tool-nav a'));
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
      var current = visible.target.id;
      links.forEach(function(link){
        link.classList.toggle('is-active', link.getAttribute('href') === '#' + current);
      });
    }, { rootMargin: '-18% 0px -58% 0px', threshold: [0.2, 0.45, 0.7] });
    sections.forEach(function(section){ observer.observe(section); });
  }

  function bindScenarioGroups(){
    document.querySelectorAll('[data-scenario-group]').forEach(function(group){
      var targetId = group.getAttribute('data-scenario-target');
      var target = targetId ? document.getElementById(targetId) : null;
      if (!target) return;
      group.querySelectorAll('[data-scenario]').forEach(function(button){
        button.addEventListener('click', function(){
          group.querySelectorAll('[data-scenario]').forEach(function(item){
            item.classList.remove('is-active');
          });
          button.classList.add('is-active');
          try {
            var payload = JSON.parse(button.getAttribute('data-payload') || '{}');
            Object.keys(payload).forEach(function(key){
              target.querySelectorAll('[data-bind="' + key + '"]').forEach(function(node){
                node.textContent = payload[key];
              });
            });
          } catch (err) {}
        });
      });
    });
  }

  document.addEventListener('DOMContentLoaded', function(){
    initTheme();
    initActiveRail();
    bindScenarioGroups();
  });
})();
