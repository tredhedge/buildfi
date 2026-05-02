(function(){
  function applyTheme(theme){
    document.body.setAttribute('data-planner-theme', theme);
    document.querySelectorAll('[data-set-theme]').forEach(function(button){
      button.classList.toggle('is-active', button.getAttribute('data-set-theme') === theme);
    });
    try {
      localStorage.setItem('buildfi_planner_theme', theme);
    } catch (err) {}
  }

  function applyView(view){
    document.body.setAttribute('data-planner-view', view);
    document.querySelectorAll('[data-set-view]').forEach(function(button){
      button.classList.toggle('is-active', button.getAttribute('data-set-view') === view);
    });
    try {
      localStorage.setItem('buildfi_planner_view', view);
    } catch (err) {}
  }

  function initThemeAndView(){
    var theme = 'light';
    var view = 'builder';
    try {
      theme = localStorage.getItem('buildfi_planner_theme') || 'light';
      view = localStorage.getItem('buildfi_planner_view') || 'builder';
    } catch (err) {}
    applyTheme(theme);
    applyView(view);

    document.querySelectorAll('[data-set-theme]').forEach(function(button){
      button.addEventListener('click', function(){
        applyTheme(button.getAttribute('data-set-theme'));
      });
    });

    document.querySelectorAll('[data-set-view]').forEach(function(button){
      button.addEventListener('click', function(){
        applyView(button.getAttribute('data-set-view'));
      });
    });
  }

  function initActiveStep(){
    var links = Array.prototype.slice.call(document.querySelectorAll('.setup-steps a'));
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
    }, { rootMargin: '-20% 0px -55% 0px', threshold: [0.2, 0.45, 0.7] });
    sections.forEach(function(section){ observer.observe(section); });
  }

  function bindScenarioGroup(){
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
    initThemeAndView();
    initActiveStep();
    bindScenarioGroup();
  });
})();
