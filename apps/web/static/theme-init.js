// Aplica o tema antes da primeira pintura (arquivo externo: a CSP não permite script inline).
(function () {
  var theme = null;
  try {
    var stored = localStorage.getItem("fd-theme");
    if (stored === "light" || stored === "dark") theme = stored;
  } catch (e) {}
  if (!theme) theme = matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", theme);
})();
