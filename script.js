"use strict";

const items = document.querySelector("#items");
const template = document.querySelector("#item-template");
const totalOutput = document.querySelector("#total");
const addButton = document.querySelector("#add-item");
const discountInput = document.querySelector("#discount-rate");
const vatInput = document.querySelector("#vat-rate");
const currencyInput = document.querySelector("#currency");
const subtotalOutput = document.querySelector("#subtotal");
const discountOutput = document.querySelector("#discount-amount");
const discountedOutput = document.querySelector("#discounted-amount");
const vatOutput = document.querySelector("#vat-amount");
const numberFormat = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 });

function readNumber(value) {
  const normalized = value.trim().replace(/[ \u00a0\u202f]/g, "").replace(",", ".");
  if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalized)) return 0;
  const number = Number(normalized);
  return Number.isFinite(number) ? number : 0;
}

function formatMoney(value) {
  return `${numberFormat.format(value).replace(/[\u00a0\u202f]/g, " ")} ${currencyInput.value}`;
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
  document.querySelector("#discount-row").hidden = discount === 0;
  document.querySelector("#discounted-row").hidden = discounted === 0;
  document.querySelector("#vat-row").hidden = vat === 0;
  document.querySelectorAll("[data-currency]").forEach((label) => {
    label.textContent = currencyInput.value;
  });
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

const today = new Date();
document.querySelector("#estimate-date").value = [
  today.getFullYear(),
  String(today.getMonth() + 1).padStart(2, "0"),
  String(today.getDate()).padStart(2, "0"),
].join("-");

addItem(false);
recalculate();
