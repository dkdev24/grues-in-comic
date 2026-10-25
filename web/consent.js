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

  var STYLE = `
.consent {
  position: fixed;
  right: 16px;
  bottom: 16px;
  left: 16px;
  z-index: 50;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  max-width: 720px;
  margin: 0 auto;
  padding: 14px 18px;
  border: 1px solid var(--console-dim);
  background: var(--console-bg);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.7);
  color: var(--console-fg);
  font-family: var(--mono);
  font-size: 0.85rem;
  line-height: 1.5;
}
.consent p {
  flex: 1 1 280px;
  margin: 0;
}
.consent a {
  color: var(--accent);
}
.consent__actions {
  display: flex;
  gap: 8px;
}
.consent button {
  min-height: 36px;
  padding: 0 16px;
  border: 1px solid var(--rule);
  background: transparent;
  color: var(--console-fg);
  font: inherit;
  cursor: pointer;
}
.consent button:hover {
  border-color: var(--console-dim);
}
.consent button.consent__accept {
  border-color: var(--amber);
  background: var(--amber);
  color: var(--ink);
}
.consent button:focus-visible {
  outline: 2px solid var(--amber);
  outline-offset: 2px;
}
`;

  function banner() {
    if (!document.getElementById("consent-style")) {
      var st = document.createElement("style");
      st.id = "consent-style";
      st.textContent = STYLE;
      document.head.appendChild(st);
    }
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
