// ===== Product data: [category, [ [name, price, mrp], ... ]] =====
const CATS = [
  ["Health & Personal Care", [["Electric Trimmer", 899, 1499], ["Beard Oil", 249, 399], ["Digital Thermometer", 199, 349], ["Hair Dryer", 1199, 1999]]],
  ["Get your game set on", [["Gaming Controller", 1799, 2999], ["Gaming Mouse", 699, 1299], ["Mechanical Keyboard", 2499, 3999], ["Gaming Headset", 1499, 2499]]],
  ["New home arrivals under", [["Mixing Bowl Set", 599, 999], ["Measuring Cup Set", 199, 349], ["Non-stick Pan", 799, 1299], ["Storage Containers", 449, 699]]],
  ["Fashion trends you like", [["Women's Blazer", 1299, 2499], ["Men's Casual Shirt", 699, 1299], ["Kurta Set", 899, 1599], ["Sneakers", 1499, 2499]]],
  ["Level up your beauty routine", [["Compact Powder", 349, 499], ["Lipstick", 299, 450], ["Face Serum", 549, 899], ["Makeup Brush Set", 399, 699]]],
  ["Must-haves for every student", [["Scientific Calculator", 649, 899], ["Notebook Pack (6)", 299, 450], ["Desk Lamp", 499, 799], ["Water Bottle", 249, 399]]],
  ["Must-have school supplies", [["School Backpack", 799, 1299], ["Geometry Box", 149, 249], ["Pencil Pouch", 129, 199], ["Colour Pencils", 199, 299]]],
  ["Earbuds And Earphone", [["Wireless Earbuds", 1299, 2999], ["Neckband Earphones", 799, 1499], ["Wired Earphones", 299, 499], ["Bluetooth Headphones", 1599, 2999]]],
  ["Game Accessories", [["Gamepad Grip Set", 249, 399], ["Controller Charging Dock", 699, 1199], ["Gaming Mouse Pad", 399, 699], ["Headset Stand", 449, 799]]],
];

const $ = (s) => document.querySelector(s);
const money = (n) => "₹" + n.toLocaleString("en-IN");
const off = (p) => Math.round((1 - p.price / p.mrp) * 100);

// flat product list with ids and card thumbnails
const cards = document.querySelectorAll(".shop-section > .box");
const PRODUCTS = [];
CATS.forEach(([cat, items], ci) => {
  const el = cards[ci] && cards[ci].querySelector(".box-img");
  const img = el ? el.style.backgroundImage : "";
  items.forEach(([name, price, mrp], i) => PRODUCTS.push({ id: ci + "-" + i, cat, ci, name, price, mrp, img }));
});

PRODUCTS.push(...[500, 1000, 2000].map((a) => ({ id: "g" + a, cat: "Gift Cards", ci: -1, gift: true, name: "Amazon Gift Card " + a, price: a, mrp: a, img: "none" })));
const SHOP = PRODUCTS.filter((p) => !p.gift);

// ===== helpers: storage, toast, panels =====
const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } };

let cart = load("cart", {});
let user = load("user", "");
let wish = load("wish", []);
let coupon = load("coupon", "");
let pin = load("pin", "");

let toastTimer;
function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.style.display = "block";
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.style.display = "none"), 2200);
}
function closeAll() {
  ["#drawer", "#modal", "#overlay"].forEach((s) => $(s).classList.remove("show"));
}
function openModal(title, html) {
  $("#modalTitle").textContent = title;
  $("#modalBody").innerHTML = html;
  $("#modal").classList.add("show");
  $("#overlay").classList.add("show");
}

// ===== products view =====
function productHTML(list) {
  if (!list.length) return '<p class="empty">No products found. Try a different word.</p>';
  return '<div class="grid">' + list.map((p) => `
    <div class="pcard">
      <button class="heart ${wish.includes(p.id) ? "on" : ""}" data-act="wish" data-id="${p.id}" aria-label="Wishlist">${wish.includes(p.id) ? "♥" : "♡"}</button>
      <div class="pimg" style="background-image:${p.img}"></div>
      <h4>${p.name}</h4>
      <div class="price">${money(p.price)} <s>${money(p.mrp)}</s> <span class="off">${off(p)}% off</span></div>
      <button class="btn" data-act="add" data-id="${p.id}">Add to Cart</button>
    </div>`).join("") + "</div>";
}
let curList = [];
function sortList(list, k) {
  const l = [...list];
  if (k === "lh") l.sort((a, b) => a.price - b.price);
  else if (k === "hl") l.sort((a, b) => b.price - a.price);
  else if (k === "off") l.sort((a, b) => off(b) - off(a));
  return l;
}
function showProducts(title, list) {
  curList = list;
  openModal(title, `<div class="tools"><span>${list.length} result(s)</span>
    <label>Sort by <select id="sortSel"><option value="rel">Featured</option><option value="lh">Price: Low to High</option><option value="hl">Price: High to Low</option><option value="off">Biggest discount</option></select></label></div>
    <div id="plist">${productHTML(list)}</div>`);
}
document.addEventListener("change", (e) => {
  if (e.target.id === "sortSel") $("#plist").innerHTML = productHTML(sortList(curList, e.target.value));
});

// ===== cart =====
const COUPONS = { SAVE10: (x) => Math.round(x * 0.1) };
function totals() {
  let sub = 0, count = 0;
  for (const id in cart) { const p = PRODUCTS.find((x) => x.id === id); sub += p.price * cart[id]; count += cart[id]; }
  const disc = COUPONS[coupon] ? COUPONS[coupon](sub) : 0;
  return { sub, count, disc, total: sub - disc };
}
function renderCart() {
  const ids = Object.keys(cart);
  $("#cartItems").innerHTML = ids.length ? ids.map((id) => {
    const p = PRODUCTS.find((x) => x.id === id);
    return `<div class="c-item"><b>${p.name}</b>${money(p.price)}
      <div class="c-row">
        <button data-act="dec" data-id="${id}">−</button><span>${cart[id]}</span><button data-act="inc" data-id="${id}">+</button>
        <button class="rm" data-act="rm" data-id="${id}">Delete</button>
      </div></div>`;
  }).join("") : '<p class="empty">Your Amazon Cart is empty.</p>';
  const t = totals();
  $("#cartSub").textContent = money(t.sub);
  $("#discLine").textContent = t.disc ? `Coupon ${coupon}: −${money(t.disc)}` : "";
  $("#cartTotal").textContent = money(t.total);
  $("#cartCount").textContent = t.count;
  save("cart", cart); save("coupon", coupon);
}
function openCart() {
  renderCart();
  $("#drawer").classList.add("show");
  $("#overlay").classList.add("show");
}

// ===== search =====
const sel = $("#searchSelect");
CATS.forEach(([c], i) => sel.insertAdjacentHTML("beforeend", `<option value="${i}">${c}</option>`));
function doSearch() {
  const q = $("#searchInput").value.trim().toLowerCase();
  const c = sel.value;
  const list = SHOP.filter((p) =>
    (c === "all" || p.ci === +c) && (!q || p.name.toLowerCase().includes(q) || p.cat.toLowerCase().includes(q)));
  showProducts(q ? `Results for "${q}"` : "All products", list);
}
$("#sugg").innerHTML = SHOP.map((p) => `<option value="${p.name}">`).join("");
$("#searchBtn").onclick = doSearch;
$("#searchInput").addEventListener("keydown", (e) => { if (e.key === "Enter") doSearch(); });

// ===== sign in =====
function updateHello() { $("#helloText").textContent = user ? "Hello, " + user : "Hello, Sign in "; }
function openSignin() {
  openModal(user ? "Your Account" : "Sign in", user
    ? `<p>Signed in as <b>${user}</b>.</p><button class="btn" style="max-width:200px" data-act="signout">Sign out</button>`
    : `<form id="signForm"><label>Your name</label><input id="nameInput" required maxlength="20" placeholder="e.g. Harsh"><button class="btn" type="submit">Continue</button></form>`);
}
document.addEventListener("submit", (e) => {
  const id = e.target.id;
  if (!["signForm", "orderForm", "pinForm", "helpForm", "sellForm"].includes(id)) return;
  e.preventDefault();
  if (id === "signForm") {
    user = $("#nameInput").value.trim();
    save("user", user); updateHello(); closeAll(); toast("Welcome, " + user + "!");
  } else if (id === "pinForm") {
    pin = $("#pinInput").value; save("pin", pin); updateCity(); closeAll(); toast("Delivery location updated");
  } else if (id === "helpForm") { closeAll(); toast("Message sent. We will reply soon."); }
  else if (id === "sellForm") { closeAll(); toast("Thanks! Our seller team will contact you."); }
  else placeOrder(e.target);
});
$("#signinBtn").onclick = openSignin;
function openOrders() {
  const o = load("orders", []);
  openModal("Returns & Orders", o.length
    ? o.map((x) => `<p>Order #${x.id} &mdash; ${x.items} item(s), ${money(x.total)} (${x.date})</p>`).join("")
    : '<p class="empty">You have no orders yet.</p>');
}
$("#ordersBtn").onclick = openOrders;

// ===== top menu =====
document.querySelectorAll("[data-nav]").forEach((el) => el.addEventListener("click", () => {
  const n = el.dataset.nav;
  if (n === "deals") showProducts("Today's Deals", SHOP.filter((p) => off(p) >= 40));
  else if (n === "all") showProducts("All products", SHOP);
  else if (n === "wish") showProducts("Your Wishlist", SHOP.filter((p) => wish.includes(p.id)));
  else if (n === "gift") openGift();
  else if (n === "sell") openSell();
  else if (n === "help") openHelp();
}));
cards.forEach((card, i) => {
  const more = card.querySelector("p");
  if (more) more.onclick = () => showProducts(CATS[i][0], SHOP.filter((p) => p.ci === i));
});

// ===== click actions (add, qty, checkout, close) =====
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-act]");
  if (!b) return;
  const { act, id } = b.dataset;
  if (act === "add") { cart[id] = (cart[id] || 0) + 1; renderCart(); toast("Added to cart"); }
  else if (act === "inc") { cart[id]++; renderCart(); }
  else if (act === "dec") { if (--cart[id] <= 0) delete cart[id]; renderCart(); }
  else if (act === "rm") { delete cart[id]; renderCart(); }
  else if (act === "closeAll") closeAll();
  else if (act === "signout") { user = ""; save("user", ""); updateHello(); closeAll(); toast("Signed out"); }
  else if (act === "wish") {
    wish = wish.includes(id) ? wish.filter((x) => x !== id) : [...wish, id];
    save("wish", wish);
    const on = wish.includes(id);
    b.classList.toggle("on", on); b.textContent = on ? "♥" : "♡";
    toast(on ? "Added to wishlist" : "Removed from wishlist");
  }
  else if (act === "coupon") {
    const c = $("#couponInput").value.trim().toUpperCase();
    if (COUPONS[c]) { coupon = c; renderCart(); toast("Coupon applied: 10% off"); }
    else toast("Invalid coupon code");
  }
  else if (act === "gift") { cart["g" + b.dataset.amt] = (cart["g" + b.dataset.amt] || 0) + 1; renderCart(); closeAll(); openCart(); }
  else if (act === "checkout") {
    if (!Object.keys(cart).length) return toast("Your cart is empty");
    closeAll();
    openModal("Checkout", `<form id="orderForm">
      <input id="oName" required placeholder="Full name" value="${user}">
      <input id="oAddr" required placeholder="House no., street, city">
      <input id="oPin" required pattern="[0-9]{6}" maxlength="6" placeholder="6-digit pincode" value="${pin}">
      <select id="oPay"><option>Cash on Delivery</option><option>UPI</option><option>Credit / Debit Card</option></select>
      <p>Order total: <b>${money(totals().total)}</b></p>
      <button class="btn" type="submit">Place your order</button></form>`);
  }
});
function placeOrder(f) {
  const t = totals();
  const order = { id: Date.now().toString().slice(-6), items: t.count, total: t.total, date: new Date().toLocaleDateString("en-IN"), pay: $("#oPay").value, to: $("#oName").value };
  save("orders", [order, ...load("orders", [])]);
  cart = {}; coupon = ""; renderCart(); closeAll();
  openModal("Order placed", `<p>Thank you, ${order.to}! Order <b>#${order.id}</b> for ${order.items} item(s) totalling <b>${money(order.total)}</b> has been placed (${order.pay}).</p>`);
}
// ===== gift cards, sell, help, delivery, footer =====
function openGift() {
  openModal("Gift Cards", '<p>Choose an amount:</p><div class="grid" style="margin-top:12px">' +
    [500, 1000, 2000].map((a) => `<button class="btn" data-act="gift" data-amt="${a}">${money(a)}</button>`).join("") + "</div>");
}
function openSell() {
  openModal("Sell on Amazon", '<form id="sellForm"><input required placeholder="Business name"><input type="email" required placeholder="Email"><button class="btn" type="submit">Start selling</button></form>');
}
function openHelp() {
  openModal("Customer Service", `<details><summary>How do I see my orders?</summary><p>Click Returns &amp; Orders in the top bar.</p></details>
    <details><summary>How do I get a discount?</summary><p>Apply the coupon SAVE10 in your cart for 10% off.</p></details>
    <details><summary>Can I change my delivery location?</summary><p>Yes. Click Delivery to at the top left and enter a pincode.</p></details>
    <form id="helpForm" style="margin-top:14px"><textarea required rows="3" placeholder="Write your question"></textarea><button class="btn" type="submit">Send message</button></form>`);
}
function updateCity() { $("#cityText").textContent = pin || "India"; }
$("#addrBtn").onclick = () => openModal("Choose your location", `<form id="pinForm"><input id="pinInput" required pattern="[0-9]{6}" maxlength="6" placeholder="Enter 6-digit pincode" value="${pin}"><button class="btn" type="submit">Apply</button></form>`);
document.querySelectorAll("[data-foot]").forEach((a) => a.addEventListener("click", () => {
  const t = a.textContent;
  if (t === "Your Account") openSignin();
  else if (t === "Your Orders") openOrders();
  else if (t === "Help") openHelp();
  else if (t === "Sell products") openSell();
  else openModal(t, `<p>This is a student demo project, so a full "${t}" page is not part of it.</p>`);
}));
$("#cartBtn").onclick = openCart;
$("#overlay").onclick = closeAll;
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeAll(); });
$("#toTop").onclick = () => window.scrollTo({ top: 0, behavior: "smooth" });

// ===== hero slider =====
const track = document.querySelector(".image-box");
const total = track.children.length;
const dots = $("#dots");
let cur = 0, timer;
for (let i = 0; i < total; i++) {
  const d = document.createElement("span");
  d.onclick = () => { go(i); restart(); };
  dots.appendChild(d);
}
function go(n) {
  cur = (n + total) % total;
  track.style.transform = `translateX(-${cur * 100}%)`;
  [...dots.children].forEach((d, i) => d.classList.toggle("on", i === cur));
}
function restart() { clearInterval(timer); timer = setInterval(() => go(cur + 1), 4000); }
$("#prevBtn").onclick = () => { go(cur - 1); restart(); };
$("#nextBtn").onclick = () => { go(cur + 1); restart(); };
$(".slider").addEventListener("mouseenter", () => clearInterval(timer));
$(".slider").addEventListener("mouseleave", restart);

// ===== init =====
updateHello();
updateCity();
renderCart();
go(0);
restart();
