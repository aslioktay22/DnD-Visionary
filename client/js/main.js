// This is to make sure the code button has some necessary functions!

const codeInput = document.getElementById("session-code");
const joinForm = codeInput.closest("form");

// Formatting the code while typing ; capitals + dashes (ABC-DEF-GHI)
codeInput.addEventListener("input", () => {
  const letters = codeInput.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 9);
  const groups = letters.match(/.{1,3}/g) || [];
  codeInput.value = groups.join("-");
  codeInput.setCustomValidity("");
});

// Checking the format before sending it
joinForm.addEventListener("submit", (event) => {
  const validCode = /^[A-Z0-9]{3}-[A-Z0-9]{3}-[A-Z0-9]{3}$/;

  if (!validCode.test(codeInput.value)) {
    event.preventDefault(); // stop the form
    codeInput.setCustomValidity("Please enter a 9-character code, like 7KQ-M2K-YB1.");
    codeInput.reportValidity();
  }
});