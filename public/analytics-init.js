// /public/analytics-init.js
// PostHog bootstrap for static HTML pages — respects Law 25 / buildfi_consent gate
// Usage: Load this script in <head> of any static page that calls trackEvent().
//        Each page must set window.BUILDFI_PH_KEY before loading this script.
//
// Pattern:
//   <script>window.BUILDFI_PH_KEY = "phc_YOUR_KEY";</script>
//   <script src="/analytics-init.js" defer></script>

(function () {
  var CONSENT_KEY = "buildfi_consent";
  var QUEUE_KEY = "__bf_phq";

  // Expose global trackEvent — replaces per-page stubs
  window.trackEvent = function (name, props) {
    try {
      if (localStorage.getItem(CONSENT_KEY) !== "yes") return;
      if (window.posthog && typeof window.posthog.capture === "function") {
        window.posthog.capture(name, props || {});
      } else {
        // Queue events fired before PostHog finishes loading
        if (!window[QUEUE_KEY]) window[QUEUE_KEY] = [];
        window[QUEUE_KEY].push([name, props || {}]);
      }
    } catch (e) {}
  };

  function flushQueue() {
    try {
      var q = window[QUEUE_KEY];
      if (!q || !q.length) return;
      for (var i = 0; i < q.length; i++) {
        window.posthog.capture(q[i][0], q[i][1]);
      }
      window[QUEUE_KEY] = [];
    } catch (e) {}
  }

  function getUtmProps() {
    try {
      var sp = new URLSearchParams(location.search);
      var props = {};
      ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"].forEach(function (k) {
        var v = sp.get(k);
        if (v) props[k] = v;
      });
      var ref = sp.get("ref");
      if (ref) props.referral_code = ref;
      return props;
    } catch (e) { return {}; }
  }

  function initPostHog(key) {
    if (!key || window.posthog) return;
    // PostHog snippet — loads posthog-js from CDN
    !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]);t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript";p.async=!0;p.src=s.api_host+"/static/array.js";(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+" (stub)"},o="capture identify alias people.set people.set_once set_config register register_once unregister opt_out_capturing has_opted_out_capturing opt_in_capturing reset isFeatureEnabled onFeatureFlags getFeatureFlag getFeatureFlagPayload reloadFeatureFlags group updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures getActiveMatchingSurveys getSurveys onSessionId".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);

    window.posthog.init(key, {
      api_host: "https://app.posthog.com",
      autocapture: false,
      capture_pageview: false,
      loaded: function (ph) {
        ph.capture("$pageview", getUtmProps());
        flushQueue();
      },
    });
  }

  function tryInit() {
    try {
      if (localStorage.getItem(CONSENT_KEY) !== "yes") return;
      var key = window.BUILDFI_PH_KEY;
      if (key) initPostHog(key);
    } catch (e) {}
  }

  // Run after DOM ready (script may be defer or inline)
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", tryInit);
  } else {
    tryInit();
  }

  // Re-init when consent is granted in the same session (consent banner callback)
  window.__bf_consentGranted = function () {
    try { localStorage.setItem(CONSENT_KEY, "yes"); } catch (e) {}
    tryInit();
  };
})();
