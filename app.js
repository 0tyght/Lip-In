(() => {
  "use strict";

  const url = new URL(window.location.href);
  if (url.searchParams.get("v") !== "5") {
    url.searchParams.set("v", "5");
    window.location.replace(url.toString());
  }
})();
