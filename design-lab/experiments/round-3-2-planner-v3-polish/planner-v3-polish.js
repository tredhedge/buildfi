(function(){
  function setTheme(theme){
    document.querySelectorAll('[data-theme-root]').forEach(function(root){
      root.setAttribute('data-theme', theme);
    });
    document.querySelectorAll('[data-set-theme]').forEach(function(button){
      button.classList.toggle('is-active', button.getAttribute('data-set-theme') === theme);
    });
    try { localStorage.setItem('bf_v32_theme', theme); } catch (err) {}
  }

  function setTab(tabId){
    document.querySelectorAll('[data-tab-button]').forEach(function(button){
      button.classList.toggle('active', button.getAttribute('data-tab-button') === tabId);
    });
    document.querySelectorAll('[data-tab-pill]').forEach(function(button){
      button.classList.toggle('on', button.getAttribute('data-tab-pill') === tabId);
    });
    document.querySelectorAll('[data-tab-panel]').forEach(function(panel){
      panel.hidden = panel.getAttribute('data-tab-panel') !== tabId;
    });
    try { localStorage.setItem('bf_v32_tab', tabId); } catch (err) {}
  }

  function setDrawerMode(mode){
    document.querySelectorAll('[data-drawer-mode-button]').forEach(function(button){
      button.classList.toggle('on', button.getAttribute('data-drawer-mode-button') === mode);
    });
    document.querySelectorAll('[data-drawer-mode]').forEach(function(panel){
      panel.classList.toggle('on', panel.getAttribute('data-drawer-mode') === mode);
    });
    try { localStorage.setItem('bf_v32_drawer_mode', mode); } catch (err) {}
  }

  function setReadTone(mode){
    document.querySelectorAll('[data-read-tone-button]').forEach(function(button){
      button.classList.toggle('on', button.getAttribute('data-read-tone-button') === mode);
    });
    document.querySelectorAll('[data-read-tone]').forEach(function(panel){
      panel.hidden = panel.getAttribute('data-read-tone') !== mode;
    });
  }

  function bindChips(){
    document.querySelectorAll('[data-scenario]').forEach(function(button){
      button.addEventListener('click', function(){
        var row = button.parentElement;
        if (row) {
          row.querySelectorAll('[data-scenario]').forEach(function(chip){
            chip.classList.remove('is-active');
          });
        }
        button.classList.add('is-active');
        try {
          var payload = JSON.parse(button.getAttribute('data-payload') || '{}');
          var target = document.getElementById('bf-v32-readout');
          if (!target) return;
          Object.keys(payload).forEach(function(key){
            target.querySelectorAll('[data-bind="' + key + '"]').forEach(function(node){
              node.textContent = payload[key];
            });
          });
        } catch (err) {}
      });
    });
  }

  function openOverlay(){
    var el = document.getElementById('bf-v32-overlay');
    if (el) el.classList.add('open');
  }

  function closeOverlay(){
    var el = document.getElementById('bf-v32-overlay');
    if (el) el.classList.remove('open');
  }

  function openDrawer(mode){
    var drawer = document.getElementById('bf-v32-drawer');
    var backdrop = document.getElementById('bf-v32-drawer-backdrop');
    if (drawer) drawer.classList.add('open');
    if (backdrop) backdrop.classList.add('open');
    if (mode) setDrawerMode(mode);
  }

  function closeDrawer(){
    var drawer = document.getElementById('bf-v32-drawer');
    var backdrop = document.getElementById('bf-v32-drawer-backdrop');
    if (drawer) drawer.classList.remove('open');
    if (backdrop) backdrop.classList.remove('open');
  }

  function init(){
    var theme = 'dark';
    var tab = 'diagnostic';
    var drawerMode = 'report';
    try {
      theme = localStorage.getItem('bf_v32_theme') || 'dark';
      tab = localStorage.getItem('bf_v32_tab') || 'diagnostic';
      drawerMode = localStorage.getItem('bf_v32_drawer_mode') || 'report';
    } catch (err) {}
    setTheme(theme);
    setTab(tab);
    setDrawerMode(drawerMode);
    setReadTone('plain');

    document.querySelectorAll('[data-set-theme]').forEach(function(button){
      button.addEventListener('click', function(){
        setTheme(button.getAttribute('data-set-theme'));
      });
    });

    document.querySelectorAll('[data-tab-button], [data-tab-pill]').forEach(function(button){
      button.addEventListener('click', function(){
        var id = button.getAttribute('data-tab-button') || button.getAttribute('data-tab-pill');
        setTab(id);
      });
    });

    document.querySelectorAll('[data-drawer-mode-button]').forEach(function(button){
      button.addEventListener('click', function(){
        setDrawerMode(button.getAttribute('data-drawer-mode-button'));
      });
    });

    document.querySelectorAll('[data-read-tone-button]').forEach(function(button){
      button.addEventListener('click', function(){
        setReadTone(button.getAttribute('data-read-tone-button'));
      });
    });

    document.querySelectorAll('[data-open-overlay]').forEach(function(button){
      button.addEventListener('click', openOverlay);
    });
    document.querySelectorAll('[data-close-overlay]').forEach(function(button){
      button.addEventListener('click', closeOverlay);
    });

    document.querySelectorAll('[data-open-drawer]').forEach(function(button){
      button.addEventListener('click', function(){
        openDrawer(button.getAttribute('data-open-drawer') || 'report');
      });
    });
    document.querySelectorAll('[data-close-drawer]').forEach(function(button){
      button.addEventListener('click', closeDrawer);
    });
    var backdrop = document.getElementById('bf-v32-drawer-backdrop');
    if (backdrop) backdrop.addEventListener('click', closeDrawer);

    bindChips();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
