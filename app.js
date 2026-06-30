(() => {
  "use strict";

  const url = new URL(window.location.href);
  if (url.searchParams.get("v") !== "9") {
    url.searchParams.set("v", "9");
    window.location.replace(url.toString());
  }
})();
