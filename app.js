(() => {
  "use strict";

  const url = new URL(window.location.href);
  if (url.searchParams.get("v") !== "8") {
    url.searchParams.set("v", "8");
    window.location.replace(url.toString());
  }
})();
