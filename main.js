(function () {
  "use strict";

  // Change this to your own address (also update it in index.html)
  var CONTACT_EMAIL = "hello@curiosityfox.co.uk";

  var products = window.PRODUCTS || [];
  var grid = document.getElementById("product-grid");
  var empty = document.getElementById("empty");
  var shelf = document.getElementById("hero-shelf");
  var modal = document.getElementById("product-modal");

  var KIND_LABEL = { painting: "Painting", diorama: "Diorama", curiosity: "Curiosity" };
  var gbp = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 });

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === "text") node.textContent = attrs[k];
      else if (k === "class") node.className = attrs[k];
      else node.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) { if (c) node.appendChild(c); });
    return node;
  }

  // Hero shelf
  products.filter(function (p) { return p.featured; }).slice(0, 3).forEach(function (p) {
    shelf.appendChild(el("div", { class: "shelf-item" }, [el("img", { src: p.image, alt: p.name })]));
  });

  // Product grid
  function render(filter) {
    grid.innerHTML = "";
    var list = products.filter(function (p) { return filter === "all" || p.kind === filter; });
    empty.hidden = list.length > 0;

    list.forEach(function (p) {
      var meta = el("span", { class: "tag-meta" }, [
        el("span", { text: KIND_LABEL[p.kind] || p.kind }),
        p.sold ? el("span", { class: "tag-sold", text: "Sold" }) : el("span", { class: "tag-price", text: gbp.format(p.price) })
      ]);
      var btn = el("button", { type: "button", "aria-haspopup": "dialog" }, [
        el("div", { class: "item-frame" }, [el("img", { src: p.image, alt: "", loading: "lazy" })]),
        el("div", { class: "tag" }, [el("span", { class: "tag-name", text: p.name }), meta])
      ]);
      btn.addEventListener("click", function () { openProduct(p); });
      grid.appendChild(el("li", { class: "item" + (p.sold ? " is-sold" : "") }, [btn]));
    });
  }

  document.querySelectorAll(".filter").forEach(function (b) {
    b.addEventListener("click", function () {
      document.querySelectorAll(".filter").forEach(function (o) {
        o.classList.remove("is-active");
        o.setAttribute("aria-pressed", "false");
      });
      b.classList.add("is-active");
      b.setAttribute("aria-pressed", "true");
      render(b.dataset.filter);
    });
  });

  // Product detail
  function openProduct(p) {
    document.getElementById("modal-img").src = p.image;
    document.getElementById("modal-img").alt = p.name;
    document.getElementById("modal-kind").textContent = KIND_LABEL[p.kind] || p.kind;
    document.getElementById("modal-title").textContent = p.name;
    document.getElementById("modal-price").textContent = p.sold ? "Sold" : gbp.format(p.price);
    document.getElementById("modal-desc").textContent = p.description;

    var specs = document.getElementById("modal-specs");
    specs.innerHTML = "";
    Object.keys(p.specs || {}).forEach(function (k) {
      specs.appendChild(el("dt", { text: k }));
      specs.appendChild(el("dd", { text: p.specs[k] }));
    });

    var buy = document.getElementById("modal-buy");
    if (p.sold) {
      buy.textContent = "Commission something similar";
      buy.href = "#commissions";
      buy.removeAttribute("target");
    } else if (p.buyUrl) {
      buy.textContent = "Buy now";
      buy.href = p.buyUrl;
      buy.target = "_blank";
    } else {
      buy.textContent = "Enquire to buy";
      buy.href = "mailto:" + CONTACT_EMAIL + "?subject=" + encodeURIComponent("Enquiry: " + p.name);
      buy.removeAttribute("target");
    }

    modal.showModal();
  }

  document.getElementById("modal-close").addEventListener("click", function () { modal.close(); });
  modal.addEventListener("click", function (e) { if (e.target === modal) modal.close(); });
  document.getElementById("modal-buy").addEventListener("click", function () {
    if (this.getAttribute("href") === "#commissions") modal.close();
  });

  // Mobile nav
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.getElementById("nav");
  toggle.addEventListener("click", function () {
    var open = nav.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(open));
  });
  nav.querySelectorAll("a").forEach(function (a) {
    a.addEventListener("click", function () {
      nav.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
    });
  });

  // Commission form (Formspree)
  var form = document.getElementById("commission-form");
  var status = document.getElementById("form-status");
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (form.action.indexOf("YOUR_FORM_ID") !== -1) {
      status.textContent = "The form isn't connected yet. Add your Formspree ID in index.html, or email " + CONTACT_EMAIL + ".";
      return;
    }
    status.textContent = "Sending…";
    fetch(form.action, { method: "POST", body: new FormData(form), headers: { Accept: "application/json" } })
      .then(function (r) {
        if (!r.ok) throw new Error();
        form.reset();
        status.textContent = "Request sent. We'll reply within a few days.";
      })
      .catch(function () {
        status.textContent = "That didn't send. Check your connection and try again, or email " + CONTACT_EMAIL + ".";
      });
  });

  document.getElementById("year").textContent = new Date().getFullYear();
  render("all");
})();
