"use strict";

const items = document.querySelector("#items");
const template = document.querySelector("#item-template");
const totalOutput = document.querySelector("#total");
const amountInWords = document.querySelector("#amount-in-words");
const addButton = document.querySelector("#add-item");
const discountInput = document.querySelector("#discount-rate");
const vatInput = document.querySelector("#vat-rate");
const currencyInput = document.querySelector("#currency");
const subtotalOutput = document.querySelector("#subtotal");
const discountOutput = document.querySelector("#discount-amount");
const discountedOutput = document.querySelector("#discounted-amount");
const vatOutput = document.querySelector("#vat-amount");
const numberFormat = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 });
const draftKey = "smeta-draft-v1";
const senderKey = "smeta-sender-v1";
const draftFields = {
  sender: document.querySelector('[name="sender"]'),
  recipient: document.querySelector('[name="recipient"]'),
  number: document.querySelector('[name="estimate-number"]'),
  date: document.querySelector("#estimate-date"),
  discount: discountInput,
  vat: vatInput,
  currency: currencyInput,
  comment: document.querySelector("#comment"),
};
const storageStatus = document.querySelector("#storage-status");
const copyStatus = document.querySelector("#copy-status");
const copyFallback = document.querySelector("#copy-fallback");
const copyText = document.querySelector("#copy-text");
let draftReady = false;
let copyTimer;

function readNumber(value) {
  const normalized = value.trim().replace(/[ \u00a0\u202f]/g, "").replace(",", ".");
  if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalized)) return 0;
  const number = Number(normalized);
  return Number.isFinite(number) ? number : 0;
}

function formatMoney(value) {
  return `${numberFormat.format(value).replace(/[\u00a0\u202f]/g, " ")} ${currencyInput.value}`;
}

function tengeInWords(amount) {
  if (!Number.isInteger(amount) || amount <= 0 || amount > 999999999) return "";
  const units = ["", "один", "два", "три", "четыре", "пять", "шесть", "семь", "восемь", "девять"];
  const teens = ["десять", "одиннадцать", "двенадцать", "тринадцать", "четырнадцать", "пятнадцать", "шестнадцать", "семнадцать", "восемнадцать", "девятнадцать"];
  const tens = ["", "", "двадцать", "тридцать", "сорок", "пятьдесят", "шестьдесят", "семьдесят", "восемьдесят", "девяносто"];
  const hundreds = ["", "сто", "двести", "триста", "четыреста", "пятьсот", "шестьсот", "семьсот", "восемьсот", "девятьсот"];
  const words = [];
  const groups = [
    { divisor: 1000000, forms: ["миллион", "миллиона", "миллионов"] },
    { divisor: 1000, forms: ["тысяча", "тысячи", "тысяч"] },
    { divisor: 1 },
  ];
  for (const { divisor, forms } of groups) {
    const group = Math.floor(amount / divisor) % 1000;
    if (group === 0) continue;
    if (group >= 100) words.push(hundreds[Math.floor(group / 100)]);
    const lastTwo = group % 100;
    const last = group % 10;
    if (lastTwo >= 10 && lastTwo <= 19) {
      words.push(teens[lastTwo - 10]);
    } else {
      if (lastTwo >= 20) words.push(tens[Math.floor(lastTwo / 10)]);
      if (last !== 0) {
        words.push(divisor === 1000 && last <= 2 ? ["", "одна", "две"][last] : units[last]);
      }
    }
    if (forms) {
      const form = lastTwo >= 11 && lastTwo <= 14 ? 2 : last === 1 ? 0 : last >= 2 && last <= 4 ? 1 : 2;
      words.push(forms[form]);
    }
  }
  const text = `${words.join(" ")} тенге`;
  return text[0].toUpperCase() + text.slice(1);
}

function recalculate() {
  let subtotal = 0;
  for (const row of items.rows) {
    const quantity = readNumber(row.querySelector('[data-field="quantity"]').value);
    const price = readNumber(row.querySelector('[data-field="price"]').value);
    const calculated = Math.round(quantity * price);
    // Round each line to whole currency units so visible amounts add up.
    const amount = Number.isSafeInteger(calculated) && Number.isSafeInteger(subtotal + calculated)
      ? calculated : 0;
    row.querySelector('[data-field="amount"]').textContent = formatMoney(amount);
    subtotal += amount;
  }

  const discountRate = Math.min(100, readNumber(discountInput.value));
  const discount = Math.round(subtotal * (discountRate / 100));
  const discounted = subtotal - discount;
  const calculatedVat = Math.round(discounted * (readNumber(vatInput.value) / 100));
  const vat = Number.isSafeInteger(calculatedVat) && Number.isSafeInteger(discounted + calculatedVat)
    ? calculatedVat : 0;

  subtotalOutput.textContent = formatMoney(subtotal);
  discountOutput.textContent = formatMoney(discount);
  discountedOutput.textContent = formatMoney(discounted);
  vatOutput.textContent = formatMoney(vat);
  totalOutput.textContent = formatMoney(discounted + vat);
  const words = currencyInput.value === "₸" ? tengeInWords(discounted + vat) : "";
  amountInWords.textContent = words ? `Сумма прописью: ${words}` : "";
  amountInWords.hidden = !words;
  document.querySelector("#discount-row").hidden = discount === 0;
  document.querySelector("#discounted-row").hidden = discounted === 0;
  document.querySelector("#vat-row").hidden = vat === 0;
  document.querySelectorAll("[data-currency]").forEach((label) => {
    label.textContent = currencyInput.value;
  });
  saveDraft();
}

function addItem(focus = true) {
  const row = template.content.firstElementChild.cloneNode(true);
  items.append(row);
  recalculate();
  if (focus) row.querySelector('[data-field="name"]').focus();
  return row;
}

addButton.addEventListener("click", () => addItem());
discountInput.addEventListener("input", recalculate);
vatInput.addEventListener("input", recalculate);
currencyInput.addEventListener("change", recalculate);
items.addEventListener("input", recalculate);
items.addEventListener("click", (event) => {
  const button = event.target.closest(".remove-button");
  if (!button) return;
  const row = button.closest("tr");
  const nextFocus = row.nextElementSibling || row.previousElementSibling;
  row.remove();
  recalculate();
  if (nextFocus) nextFocus.querySelector('[data-field="name"]').focus();
  else addButton.focus();
});

items.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.isComposing && event.target.matches("input") &&
      event.target.closest("tr") === items.lastElementChild) {
    event.preventDefault();
    addItem();
  }
});

function preparePrint() {
  recalculate();
  const number = document.querySelector('[name="estimate-number"]').value.trim() || "—";
  const date = document.querySelector("#estimate-date").value;
  const formattedDate = date ? date.split("-").reverse().join(".") : "—";
  document.querySelector("#print-title").textContent = `Смета № ${number} от ${formattedDate}`;

  // Plain text copies let long names and multiline comments wrap fully on paper.
  document.querySelectorAll(".page input, .page select, .page textarea").forEach((field) => {
    let value = field.nextElementSibling;
    if (!value || !value.classList.contains("print-value")) {
      value = document.createElement("span");
      value.className = "print-only print-value";
      value.setAttribute("aria-hidden", "true");
      field.after(value);
    }
    value.textContent = field.value;
  });
}

// Also prepare the document when printing with Ctrl/Cmd+P.
window.addEventListener("beforeprint", preparePrint);
document.querySelector("#save-pdf").addEventListener("click", () => {
  preparePrint();
  window.print();
});

function localDate() {
  const today = new Date();
  return [today.getFullYear(), String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0")].join("-");
}

function saveDraft() {
  if (!draftReady) return;
  const fields = Object.fromEntries(Object.entries(draftFields).map(([key, field]) => [key, field.value]));
  const positions = Array.from(items.rows, (row) => Object.fromEntries(
    ["name", "quantity", "unit", "price"].map((key) => [key, row.querySelector(`[data-field="${key}"]`).value])
  ));
  try {
    localStorage.setItem(senderKey, draftFields.sender.value);
    localStorage.setItem(draftKey, JSON.stringify({ fields, positions }));
    storageStatus.hidden = true;
  } catch {
    storageStatus.textContent = "Не удалось сохранить черновик в этом браузере. Скопируйте смету или сохраните PDF перед закрытием.";
    storageStatus.hidden = false;
  }
}

function restoreDraft() {
  try {
    const saved = localStorage.getItem(draftKey);
    if (!saved) return false;
    const draft = JSON.parse(saved);
    if (!draft || !draft.fields || !Array.isArray(draft.positions) ||
        !Object.keys(draftFields).every((key) => typeof draft.fields[key] === "string") ||
        !["₸", "₽", "$", "€"].includes(draft.fields.currency) ||
        !draft.positions.every((position) => position &&
          ["name", "quantity", "unit", "price"].every((key) => typeof position[key] === "string") &&
          ["шт", "час", "услуга"].includes(position.unit))) {
      throw new Error("Invalid draft");
    }
    for (const [key, field] of Object.entries(draftFields)) field.value = draft.fields[key];
    for (const position of draft.positions) {
      const row = addItem(false);
      for (const [key, value] of Object.entries(position)) {
        if (["name", "quantity", "unit", "price"].includes(key)) {
          row.querySelector(`[data-field="${key}"]`).value = value;
        }
      }
    }
    return true;
  } catch {
    storageStatus.textContent = "Не удалось восстановить черновик: сохранение недоступно или данные повреждены.";
    storageStatus.hidden = false;
    return false;
  }
}

function clearCopyFeedback() {
  clearTimeout(copyTimer);
  copyStatus.textContent = "";
  copyFallback.hidden = true;
  copyText.value = "";
}

document.querySelector(".page").addEventListener("input", saveDraft);
document.querySelector(".page").addEventListener("change", saveDraft);
document.querySelector("#new-estimate").addEventListener("click", () => {
  if (!window.confirm("Начать новую смету? Текущий черновик будет заменён.")) return;
  const current = draftFields.number.value.trim();
  const next = current.replace(/\d+$/, (digits) => (BigInt(digits) + 1n).toString().padStart(digits.length, "0"));
  draftReady = false;
  for (const [key, field] of Object.entries(draftFields)) {
    if (key !== "sender") field.value = "";
  }
  draftFields.number.value = next !== current ? next : (current ? `${current}-1` : "1");
  draftFields.date.value = localDate();
  discountInput.value = "0";
  vatInput.value = "0";
  currencyInput.value = "₸";
  items.replaceChildren();
  clearCopyFeedback();
  addItem();
  draftReady = true;
  saveDraft();
});

function whatsappText() {
  recalculate();
  const date = draftFields.date.value;
  const lines = [`Смета № ${draftFields.number.value.trim() || "—"} от ${date ? date.split("-").reverse().join(".") : "—"}`];
  if (draftFields.sender.value.trim()) lines.push(`От кого: ${draftFields.sender.value.trim()}`);
  if (draftFields.recipient.value.trim()) lines.push(`Для кого: ${draftFields.recipient.value.trim()}`);
  lines.push("");
  const quantityFormat = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 20 });
  for (const row of items.rows) {
    const value = (key) => row.querySelector(`[data-field="${key}"]`).value;
    const quantity = quantityFormat.format(readNumber(value("quantity"))).replace(/[\u00a0\u202f]/g, " ");
    lines.push(`• ${value("name").trim() || "Без наименования"} — ${quantity} ${value("unit")} × ${formatMoney(readNumber(value("price")))} = ${row.querySelector('[data-field="amount"]').textContent}`);
  }
  lines.push("", `Сумма: ${subtotalOutput.textContent}`);
  if (!document.querySelector("#discount-row").hidden) {
    lines.push(`Скидка: ${discountOutput.textContent}`, `Сумма со скидкой: ${discountedOutput.textContent}`);
  }
  if (!document.querySelector("#vat-row").hidden) lines.push(`НДС: ${vatOutput.textContent}`);
  lines.push(`Итого к оплате: ${totalOutput.textContent}`);
  if (!amountInWords.hidden) lines.push(amountInWords.textContent);
  if (draftFields.comment.value.trim()) lines.push("", `Комментарий: ${draftFields.comment.value.trim()}`);
  return lines.join("\n");
}

document.querySelector("#copy-whatsapp").addEventListener("click", async () => {
  clearCopyFeedback();
  const text = whatsappText();
  try {
    await navigator.clipboard.writeText(text);
    copyStatus.textContent = "Скопировано ✓";
    copyTimer = setTimeout(() => { copyStatus.textContent = ""; }, 2000);
  } catch {
    copyText.value = text;
    copyFallback.hidden = false;
    copyText.focus();
    copyText.select();
  }
});

draftFields.date.value = localDate();
try {
  const savedSender = localStorage.getItem(senderKey);
  if (savedSender !== null) draftFields.sender.value = savedSender;
} catch {
  // restoreDraft below reports unavailable browser storage.
}
if (!restoreDraft()) addItem(false);
recalculate();
draftReady = true;
