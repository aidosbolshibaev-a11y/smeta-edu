"use strict";

const items = document.querySelector("#items");
const template = document.querySelector("#item-template");
const totalOutput = document.querySelector("#total");
const addButton = document.querySelector("#add-item");
const numberFormat = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 });

function readNumber(value) {
  const normalized = value.trim().replace(/[ \u00a0\u202f]/g, "").replace(",", ".");
  if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalized)) return 0;
  const number = Number(normalized);
  return Number.isFinite(number) ? number : 0;
}

function formatMoney(value) {
  return `${numberFormat.format(value).replace(/[\u00a0\u202f]/g, " ")} ₸`;
}

function recalculate() {
  let totalCents = 0;
  for (const row of items.rows) {
    const quantity = readNumber(row.querySelector('[data-field="quantity"]').value);
    const price = readNumber(row.querySelector('[data-field="price"]').value);
    const calculated = Math.round(quantity * price * 100);
    // Keep both individual amounts and the total within exact integer arithmetic.
    const cents = Number.isSafeInteger(calculated) && Number.isSafeInteger(totalCents + calculated)
      ? calculated : 0;
    row.querySelector('[data-field="amount"]').textContent = formatMoney(cents / 100);
    totalCents += cents;
  }
  totalOutput.textContent = formatMoney(totalCents / 100);
}

function addItem(focus = true) {
  const row = template.content.firstElementChild.cloneNode(true);
  items.append(row);
  if (focus) row.querySelector('[data-field="name"]').focus();
  return row;
}

addButton.addEventListener("click", () => addItem());
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
