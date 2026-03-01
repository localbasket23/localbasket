document.addEventListener("DOMContentLoaded", async () => {

  async function load(id, file) {
    const el = document.getElementById(id);
    if (!el) return;

    const res = await fetch(
      window.location.origin + "/components/" + file
    );

    el.innerHTML = await res.text();
  }

  load("header","header.html");
  load("footer","footer.html");

});
