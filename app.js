(() => {
  "use strict";

  const url = new URL(window.location.href);
  if (url.searchParams.get("v") !== "10") {
    url.searchParams.set("v", "10");
    window.location.replace(url.toString());
  }
})();
