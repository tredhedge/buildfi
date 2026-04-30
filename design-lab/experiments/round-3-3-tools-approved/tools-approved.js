(function(){
  function setTheme(theme){
    document.body.setAttribute('data-theme', theme);
    document.querySelectorAll('[data-set-theme]').forEach(function(button){
      button.classList.toggle('is-active', button.getAttribute('data-set-theme') === theme);
    });
    try { localStorage.setItem('bf_tools_approved_theme', theme); } catch (err) {}
  }

  function bindScenarios(){
    document.querySelectorAll('[data-scenario-group]').forEach(function(group){
      var targetId = group.getAttribute('data-scenario-target');
      var target = targetId ? document.getElementById(targetId) : null;
      if (!target) return;
      group.querySelectorAll('[data-scenario]').forEach(function(button){
        button.addEventListener('click', function(){
          group.querySelectorAll('[data-scenario]').forEach(function(chip){
            chip.classList.remove('is-active');
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

  function init(){
    var theme = 'dark';
    try { theme = localStorage.getItem('bf_tools_approved_theme') || 'dark'; } catch (err) {}
    setTheme(theme);
    document.querySelectorAll('[data-set-theme]').forEach(function(button){
      button.addEventListener('click', function(){
        setTheme(button.getAttribute('data-set-theme'));
      });
    });
    bindScenarios();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
