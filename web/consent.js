// Cookie consent for Google Analytics (plain script, like gallery.js: no build step).
// GA loads only after Accept, and only on the production host, so local runs and previews send nothing.
// Umami (cookieless) is loaded by each page directly and is not gated here. The choice lives in
// localStorage `grues-consent`; the privacy page's [data-consent-reset] button clears it.
(function () {
  var KEY = "grues-consent";
  var GA_ID = "G-JL3PJ65QL3";
  var HOST = "grues.danielkimdev.com";

  function loadGA() {
    window.dataLayer = window.dataLayer || [];
    // gtag.js needs the `arguments` object itself, so a plain function, not an arrow.
    function gtag() {
      window.dataLayer.push(arguments);
    }
    gtag("js", new Date());
    gtag("config", GA_ID);
    var s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + GA_ID;
    document.head.appendChild(s);
  }

  function banner() {
    var el = document.createElement("div");
    el.className = "consent";
    el.setAttribute("role", "region");
    el.setAttribute("aria-label", "Cookie consent");
    el.innerHTML =
      "<p>This site uses Google Analytics cookies to see which pages are read, only if you accept. " +
      '<a href="/privacy">Privacy</a></p>' +
      '<div class="consent__actions">' +
      '<button type="button" data-choice="denied">Decline</button>' +
      '<button type="button" data-choice="granted" class="consent__accept">Accept</button>' +
      "</div>";
    el.addEventListener("click", function (e) {
      var b = e.target.closest && e.target.closest("[data-choice]");
      if (!b) return;
      var choice = b.getAttribute("data-choice");
      try {
        localStorage.setItem(KEY, choice);
      } catch (err) {} // storage blocked: the choice holds for this page only
      el.remove();
      if (choice === "granted") loadGA();
    });
    document.body.appendChild(el);
  }

  function init() {
    if (location.hostname === HOST) {
      var stored;
      try {
        stored = localStorage.getItem(KEY);
        if (stored === "granted") loadGA();
        else if (stored !== "denied") banner();
      } catch (err) {} // storage blocked: no banner on every page, no tag
    }
    document.querySelectorAll("[data-consent-reset]").forEach(function (b) {
      b.addEventListener("click", function () {
        try {
          localStorage.removeItem(KEY);
        } catch (err) {}
        location.reload();
      });
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
