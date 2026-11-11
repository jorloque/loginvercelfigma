// ===== Utilidades =====
const $ = (sel) => document.querySelector(sel);

const toastEl = $("#toast");
let toastTimer;
function showToast(message) {
  toastEl.textContent = message;
  toastEl.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("is-visible"), 3000);
}

const storage = {
  get(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value === null ? fallback : JSON.parse(value);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* almacenamiento no disponible: se ignora */
    }
  },
  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignorar */
    }
  },
};

// ===== Login =====
const form = $("#login-form");
const emailInput = $("#email");
const passwordInput = $("#password");
const rememberInput = $("#remember");
const submitBtn = $("#submit-btn");

// Rellenar el email si el usuario marcó "Recordarme" anteriormente
const savedEmail = storage.get("rumbo:email", "");
if (savedEmail) emailInput.value = savedEmail;

function setError(input, message) {
  const field = input.closest(".field");
  const errorEl = field.querySelector(".field__error");
  field.classList.toggle("has-error", Boolean(message));
  errorEl.textContent = message || "";
  input.setAttribute("aria-invalid", message ? "true" : "false");
  if (message) input.setAttribute("aria-describedby", errorEl.id);
  else input.removeAttribute("aria-describedby");
}

function validateEmail() {
  const value = emailInput.value.trim();
  if (!value) return setError(emailInput, "Introduce tu correo electrónico."), false;
  const ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
  setError(emailInput, ok ? "" : "El formato del correo no es válido.");
  return ok;
}

function validatePassword() {
  const value = passwordInput.value;
  if (!value) return setError(passwordInput, "Introduce tu contraseña."), false;
  const ok = value.length >= 8;
  setError(passwordInput, ok ? "" : "La contraseña debe tener al menos 8 caracteres.");
  return ok;
}

emailInput.addEventListener("blur", () => emailInput.value && validateEmail());
passwordInput.addEventListener("blur", () => passwordInput.value && validatePassword());
emailInput.addEventListener("input", () => emailInput.closest(".field").classList.contains("has-error") && validateEmail());
passwordInput.addEventListener("input", () => passwordInput.closest(".field").classList.contains("has-error") && validatePassword());

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const emailOk = validateEmail();
  const passwordOk = validatePassword();
  if (!emailOk) return emailInput.focus();
  if (!passwordOk) return passwordInput.focus();

  if (rememberInput.checked) storage.set("rumbo:email", emailInput.value.trim());
  else storage.remove("rumbo:email");

  submitBtn.classList.add("is-loading");
  submitBtn.querySelector(".btn__label").textContent = "Entrando…";

  // Simulación: aquí iría la llamada real a tu API de autenticación
  await new Promise((resolve) => setTimeout(resolve, 1200));

  submitBtn.classList.remove("is-loading");
  submitBtn.querySelector(".btn__label").textContent = "Iniciar sesión";
  showToast(`¡Hola de nuevo! Has iniciado sesión como ${emailInput.value.trim()}`);
});

// Mostrar / ocultar contraseña
const togglePassword = $("#toggle-password");
togglePassword.addEventListener("click", () => {
  const show = passwordInput.type === "password";
  passwordInput.type = show ? "text" : "password";
  togglePassword.setAttribute("aria-pressed", String(show));
  togglePassword.setAttribute("aria-label", show ? "Ocultar contraseña" : "Mostrar contraseña");
});

// Botones sociales y enlaces de ejemplo
document.querySelectorAll("[data-provider]").forEach((btn) => {
  btn.addEventListener("click", () => showToast(`El acceso con ${btn.dataset.provider} estará disponible pronto.`));
});
$("#forgot-link").addEventListener("click", (e) => {
  e.preventDefault();
  if (validateEmail()) showToast(`Te hemos enviado un enlace a ${emailInput.value.trim()}`);
  else emailInput.focus();
});
document.querySelector(".signup a").addEventListener("click", (e) => {
  e.preventDefault();
  showToast("La página de registro estará disponible pronto.");
});

// ===== Widget de comentarios =====
const feedbackPanel = $("#feedback-panel");
const feedbackToggle = $("#feedback-toggle");
const feedbackClose = $("#feedback-close");
const feedbackForm = $("#feedback-form");
const feedbackText = $("#feedback-text");
const feedbackCount = $("#feedback-count");
const feedbackSend = $("#feedback-send");
const feedbackThanks = $("#feedback-thanks");
const feedbackAgain = $("#feedback-again");
const feedbackError = $("#feedback-error");
const feedbackList = $("#feedback-list");
const feedbackHistoryStatus = $("#feedback-history-status");
const feedbackHistoryCount = $("#feedback-history-count");

// Si la página se abre con ?key=CLAVE se reenvía a la API (para cuando COMMENTS_ADMIN_KEY está configurada)
const adminKey = new URLSearchParams(location.search).get("key");
const commentsUrl = "/api/comentarios" + (adminKey ? `?key=${encodeURIComponent(adminKey)}` : "");
const dateFormat = new Intl.DateTimeFormat("es-ES", { dateStyle: "medium", timeStyle: "short" });

function setHistoryStatus(message) {
  feedbackHistoryStatus.textContent = message;
  feedbackHistoryStatus.hidden = !message;
}

async function loadComments() {
  if (!feedbackList.children.length) setHistoryStatus("Cargando…");
  try {
    const response = await fetch(commentsUrl, { cache: "no-store" });
    if (response.status === 401) {
      feedbackList.replaceChildren();
      feedbackHistoryCount.textContent = "";
      return setHistoryStatus("El historial es privado.");
    }
    if (!response.ok) throw new Error();
    const comments = await response.json();

    feedbackList.replaceChildren(
      ...comments.map((comment) => {
        const item = document.createElement("li");
        item.className = "feedback__item";
        const text = document.createElement("p");
        text.textContent = comment.text; // textContent: evita inyectar HTML
        const time = document.createElement("time");
        time.dateTime = comment.date;
        time.textContent = dateFormat.format(new Date(comment.date));
        item.append(text, time);
        return item;
      })
    );
    feedbackHistoryCount.textContent = comments.length ? `(${comments.length})` : "";
    setHistoryStatus(comments.length ? "" : "Todavía no hay comentarios.");
  } catch {
    setHistoryStatus("No se pudo cargar el historial.");
  }
}
const MAX = Number(feedbackText.getAttribute("maxlength"));

function openFeedback() {
  feedbackPanel.hidden = false;
  feedbackPanel.classList.remove("is-closing");
  feedbackToggle.setAttribute("aria-expanded", "true");
  if (!feedbackForm.hidden) feedbackText.focus();
  loadComments();
}

function closeFeedback() {
  if (feedbackPanel.hidden) return;
  feedbackPanel.classList.add("is-closing");
  feedbackToggle.setAttribute("aria-expanded", "false");
  feedbackPanel.addEventListener(
    "animationend",
    () => {
      feedbackPanel.hidden = true;
      feedbackPanel.classList.remove("is-closing");
    },
    { once: true }
  );
}

feedbackToggle.addEventListener("click", () => (feedbackPanel.hidden ? openFeedback() : closeFeedback()));
feedbackClose.addEventListener("click", () => {
  closeFeedback();
  feedbackToggle.focus();
});

// Cerrar con Escape o al hacer clic fuera
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !feedbackPanel.hidden) {
    closeFeedback();
    feedbackToggle.focus();
  }
});
document.addEventListener("click", (e) => {
  if (!feedbackPanel.hidden && !e.target.closest("#feedback")) closeFeedback();
});

function updateCount() {
  const length = feedbackText.value.length;
  feedbackCount.textContent = `${length}/${MAX}`;
  feedbackCount.classList.toggle("is-near-limit", length >= MAX * 0.9);
  feedbackSend.disabled = feedbackText.value.trim().length === 0;
}
feedbackText.addEventListener("input", updateCount);

// Enviar con Ctrl/Cmd + Enter
feedbackText.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && !feedbackSend.disabled) {
    feedbackForm.requestSubmit();
  }
});

feedbackForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = feedbackText.value.trim();
  if (!text) return;

  feedbackError.hidden = true;
  feedbackSend.disabled = true;
  feedbackSend.textContent = "Enviando…";

  try {
    // Se envía a la función serverless /api/comentarios, que lo guarda en la base de datos
    const response = await fetch("/api/comentarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, page: location.pathname }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || "No se pudo enviar el comentario.");
    }
  } catch (error) {
    feedbackError.textContent = error.message || "No se pudo enviar el comentario. Inténtalo de nuevo.";
    feedbackError.hidden = false;
    feedbackSend.textContent = "Enviar";
    updateCount();
    return;
  }

  feedbackSend.textContent = "Enviar";
  loadComments();
  feedbackText.value = "";
  updateCount();
  feedbackForm.hidden = true;
  feedbackThanks.hidden = false;
  feedbackAgain.focus();
});

feedbackAgain.addEventListener("click", () => {
  feedbackThanks.hidden = true;
  feedbackForm.hidden = false;
  feedbackText.focus();
});
