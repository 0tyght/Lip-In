(() => {
  "use strict";

  const url = new URL(window.location.href);
  if (url.searchParams.get("v") !== "7") {
    url.searchParams.set("v", "7");
    window.location.replace(url.toString());
  }
})();
