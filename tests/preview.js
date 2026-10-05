document.getElementById("simulate").addEventListener("click", () => {
  document.title = "(2) Notifications / X";
  const section = document.createElement("section");
  section.className = "new";
  const heading = document.createElement("h2");
  heading.textContent = "New to X?";
  const button = document.createElement("button");
  button.textContent = "Post";
  section.append(heading, button);
  document.getElementById("dynamic").replaceChildren(section);
});
