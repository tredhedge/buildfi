(function(){
  function setTheme(theme){
    document.querySelectorAll('[data-theme-root]').forEach(function(root){
      root.setAttribute('data-theme', theme);
    });
    document.querySelectorAll('[data-set-theme]').forEach(function(button){
      button.classList.toggle('is-active', button.getAttribute('data-set-theme') === theme);
    });
    try { localStorage.setItem('bf_v31_theme', theme); } catch (err) {}
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
    try { localStorage.setItem('bf_v31_tab', tabId); } catch (err) {}
  }

  function setDrawerMode(mode){
    document.querySelectorAll('[data-drawer-mode-button]').forEach(function(button){
      button.classList.toggle('on', button.getAttribute('data-drawer-mode-button') === mode);
    });
    document.querySelectorAll('[data-drawer-mode]').forEach(function(panel){
      panel.classList.toggle('on', panel.getAttribute('data-drawer-mode') === mode);
    });
    try { localStorage.setItem('bf_v31_drawer_mode', mode); } catch (err) {}
  }

  function setReadingMode(mode){
    document.querySelectorAll('[data-reading-mode-button]').forEach(function(button){
      button.classList.toggle('on', button.getAttribute('data-reading-mode-button') === mode);
    });
    document.querySelectorAll('[data-reading-mode-panel]').forEach(function(panel){
      panel.hidden = panel.getAttribute('data-reading-mode-panel') !== mode;
    });
  }

  function setCompareFromPayload(payload){
    var target = document.getElementById('bf-v31-readout');
    if (!target) return;
    Object.keys(payload).forEach(function(key){
      target.querySelectorAll('[data-bind="' + key + '"]').forEach(function(node){
        node.textContent = payload[key];
      });
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
          setCompareFromPayload(payload);
        } catch (err) {}
      });
    });
  }

  function openOverlay(){
    var el = document.getElementById('bf-v31-overlay');
    if (el) el.classList.add('open');
  }

  function closeOverlay(){
    var el = document.getElementById('bf-v31-overlay');
    if (el) el.classList.remove('open');
  }

  function openDrawer(){
    var drawer = document.getElementById('bf-v31-drawer');
    var backdrop = document.getElementById('bf-v31-drawer-backdrop');
    if (drawer) drawer.classList.add('open');
    if (backdrop) backdrop.classList.add('open');
  }

  function closeDrawer(){
    var drawer = document.getElementById('bf-v31-drawer');
    var backdrop = document.getElementById('bf-v31-drawer-backdrop');
    if (drawer) drawer.classList.remove('open');
    if (backdrop) backdrop.classList.remove('open');
  }

  function init(){
    var theme = 'dark';
    var tab = 'diagnostic';
    var drawerMode = 'report';
    try {
      theme = localStorage.getItem('bf_v31_theme') || 'dark';
      tab = localStorage.getItem('bf_v31_tab') || 'diagnostic';
      drawerMode = localStorage.getItem('bf_v31_drawer_mode') || 'report';
    } catch (err) {}
    setTheme(theme);
    setTab(tab);
    setDrawerMode(drawerMode);
    setReadingMode('builder');

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

    document.querySelectorAll('[data-reading-mode-button]').forEach(function(button){
      button.addEventListener('click', function(){
        setReadingMode(button.getAttribute('data-reading-mode-button'));
      });
    });

    bindChips();

    var overlayOpen = document.getElementById('bf-v31-open-overlay');
    if (overlayOpen) overlayOpen.addEventListener('click', openOverlay);
    var overlayClose = document.getElementById('bf-v31-close-overlay');
    if (overlayClose) overlayClose.addEventListener('click', closeOverlay);

    document.querySelectorAll('[data-open-drawer]').forEach(function(button){
      button.addEventListener('click', openDrawer);
    });
    var drawerClose = document.getElementById('bf-v31-close-drawer');
    if (drawerClose) drawerClose.addEventListener('click', closeDrawer);
    var drawerBackdrop = document.getElementById('bf-v31-drawer-backdrop');
    if (drawerBackdrop) drawerBackdrop.addEventListener('click', closeDrawer);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
