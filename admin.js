/*
  Curiosity Fox stock manager
  Saves straight to the GitHub repository through the GitHub API, so the
  site needs no server. The access token is stored only in this browser.
*/
(function () {
  "use strict";

  var STORE_KEY = "cf-admin-config";
  var DATA_PATH = "products.json";
  var MAX_IMAGE_PX = 1600;
  var JPEG_QUALITY = 0.85;

  var cfg = null;
  var products = [];
  var editingId = null;
  var pendingImage = null; // { base64, previewUrl }
  var localPreviews = {};  // new images not yet published by GitHub Pages

  var $ = function (id) { return document.getElementById(id); };
  var itemForm = $("item-form");
  var gbp = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 });
  var KIND_LABEL = { painting: "Painting", diorama: "Diorama", curiosity: "Curiosity" };

  // ---------- helpers ----------
  function setStatus(node, msg, kind) {
    node.textContent = msg || "";
    node.className = "status" + (kind ? " is-" + kind : "");
  }

  function toBase64Utf8(str) {
    var bytes = new TextEncoder().encode(str);
    var bin = "";
    for (var i = 0; i < bytes.length; i += 0x8000) {
      bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    }
    return btoa(bin);
  }

  function fromBase64Utf8(b64) {
    var bin = atob(b64.replace(/\s/g, ""));
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }

  function slugify(s) {
    return s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "item";
  }

  // ---------- GitHub API ----------
  function api(path, options) {
    options = options || {};
    var url = "https://api.github.com/repos/" + encodeURIComponent(cfg.owner) + "/" +
      encodeURIComponent(cfg.repo) + "/contents/" + path;
    if (!options.method || options.method === "GET") url += "?ref=" + encodeURIComponent(cfg.branch) + "&t=" + Date.now();
    return fetch(url, {
      method: options.method || "GET",
      headers: {
        Authorization: "Bearer " + cfg.token,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28"
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      cache: "no-store"
    }).then(function (r) {
      if (r.ok) return r.status === 204 ? null : r.json();
      return r.json().catch(function () { return {}; }).then(function (j) {
        var err = new Error(explain(r.status, j.message));
        err.status = r.status;
        throw err;
      });
    });
  }

  function explain(status, message) {
    if (status === 401) return "GitHub rejected the access token. It may have expired: create a new one and reconnect.";
    if (status === 403) return "The token doesn't have permission to change this repository. It needs Contents: Read and write.";
    if (status === 404) return "Couldn't find that repository or branch. Check the username, repository name and branch.";
    if (status === 409) return "Someone else saved at the same moment. Try again.";
    if (status === 422) return "GitHub refused the file (" + (message || "invalid") + ").";
    return "GitHub returned an error (" + status + (message ? ": " + message : "") + ").";
  }

  function loadProducts() {
    return api(DATA_PATH).then(function (file) {
      return { list: JSON.parse(fromBase64Utf8(file.content)), sha: file.sha };
    });
  }

  // Always re-read the latest file before changing it, so edits from
  // another device are never overwritten.
  function mutateProducts(change, message) {
    return loadProducts().then(function (latest) {
      var list = change(latest.list);
      return api(DATA_PATH, {
        method: "PUT",
        body: {
          message: message,
          content: toBase64Utf8(JSON.stringify(list, null, 2) + "\n"),
          sha: latest.sha,
          branch: cfg.branch
        }
      }).then(function () { products = list; renderStock(); });
    });
  }

  function uploadImage(base64, path) {
    return api(path, { method: "PUT", body: { message: "Add photo " + path, content: base64, branch: cfg.branch } });
  }

  function deleteFile(path) {
    return api(path).then(function (file) {
      return api(path, { method: "DELETE", body: { message: "Remove " + path, sha: file.sha, branch: cfg.branch } });
    }).catch(function () { /* image already gone: nothing to do */ });
  }

  // ---------- photo handling ----------
  function resizeImage(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        var scale = Math.min(1, MAX_IMAGE_PX / Math.max(img.naturalWidth, img.naturalHeight));
        var canvas = document.createElement("canvas");
        canvas.width = Math.round(img.naturalWidth * scale);
        canvas.height = Math.round(img.naturalHeight * scale);
        var ctx = canvas.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        var dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
        resolve({ base64: dataUrl.split(",")[1], previewUrl: dataUrl });
      };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        reject(new Error("That file couldn't be read as an image. Try a JPG or PNG."));
      };
      img.src = url;
    });
  }

  $("photo").addEventListener("change", function () {
    var file = this.files && this.files[0];
    if (!file) return;
    setStatus($("save-status"), "Preparing photo…");
    resizeImage(file).then(function (result) {
      pendingImage = result;
      showPreview(result.previewUrl);
      setStatus($("save-status"), "");
    }).catch(function (e) { setStatus($("save-status"), e.message, "error"); });
  });

  function showPreview(src) {
    $("photo-preview").src = src;
    $("photo-preview").hidden = !src;
    $("photo-placeholder").hidden = !!src;
  }

  // ---------- form ----------
  function parseSpecs(text) {
    var specs = {};
    text.split("\n").forEach(function (line) {
      var i = line.indexOf(":");
      if (i > 0) {
        var k = line.slice(0, i).trim(), v = line.slice(i + 1).trim();
        if (k && v) specs[k] = v;
      }
    });
    return specs;
  }

  function specsToText(specs) {
    return Object.keys(specs || {}).map(function (k) { return k + ": " + specs[k]; }).join("\n");
  }

  function resetForm() {
    itemForm.reset();
    editingId = null;
    pendingImage = null;
    showPreview("");
    $("photo").value = "";
    $("form-title").textContent = "Add a new piece";
    $("save").textContent = "Add to shop";
    $("cancel-edit").hidden = true;
  }

  function startEdit(p) {
    resetForm();
    editingId = p.id;
    var f = itemForm.elements;
    f.name.value = p.name;
    f.kind.value = p.kind;
    f.price.value = p.price;
    f.description.value = p.description || "";
    f.specs.value = specsToText(p.specs);
    f.buyUrl.value = p.buyUrl || "";
    f.featured.checked = !!p.featured;
    f.sold.checked = !!p.sold;
    showPreview(imageSrc(p));
    $("form-title").textContent = "Edit " + p.name;
    $("save").textContent = "Save changes";
    $("cancel-edit").hidden = false;
    $("form-title").scrollIntoView({ behavior: "smooth" });
  }

  $("cancel-edit").addEventListener("click", function () { resetForm(); setStatus($("save-status"), ""); });

  $("save").addEventListener("click", function () {
    var f = itemForm.elements;
    var status = $("save-status");
    var name = f.name.value.trim();
    var price = parseFloat(f.price.value);

    if (!editingId && !pendingImage) return setStatus(status, "Add a photo of the piece.", "error");
    if (!name) return setStatus(status, "Give the piece a name.", "error");
    if (isNaN(price) || price < 0) return setStatus(status, "Enter a price in pounds.", "error");
    if (!f.description.value.trim()) return setStatus(status, "Add a short description.", "error");
    if (f.buyUrl.value && !/^https:\/\//.test(f.buyUrl.value.trim())) return setStatus(status, "The payment link must start with https://", "error");

    var btn = this;
    btn.disabled = true;
    var id = editingId || slugify(name) + "-" + Date.now().toString(36);
    var fields = {
      name: name,
      kind: f.kind.value,
      price: price,
      description: f.description.value.trim(),
      specs: parseSpecs(f.specs.value),
      buyUrl: f.buyUrl.value.trim(),
      featured: f.featured.checked,
      sold: f.sold.checked
    };

    var newImagePath = null, oldImagePath = null;
    var step = Promise.resolve();
    if (pendingImage) {
      newImagePath = "images/" + slugify(name) + "-" + Date.now().toString(36) + ".jpg";
      localPreviews[newImagePath] = pendingImage.previewUrl;
      setStatus(status, "Uploading photo…");
      step = uploadImage(pendingImage.base64, newImagePath);
    }

    step.then(function () {
      setStatus(status, "Saving…");
      return mutateProducts(function (list) {
        if (editingId) {
          var existing = list.find(function (p) { return p.id === editingId; });
          if (!existing) throw new Error("That piece has been deleted on another device.");
          if (newImagePath) { oldImagePath = existing.image; existing.image = newImagePath; }
          Object.assign(existing, fields);
        } else {
          list.unshift(Object.assign({ id: id, image: newImagePath }, fields));
        }
        return list;
      }, (editingId ? "Update " : "Add ") + name);
    }).then(function () {
      if (oldImagePath && oldImagePath.indexOf("images/") === 0) deleteFile(oldImagePath);
      setStatus(status, (editingId ? "Saved. " : "Added. ") + name + " will be live in about a minute.", "ok");
      resetForm();
    }).catch(function (e) {
      setStatus(status, e.message, "error");
    }).then(function () { btn.disabled = false; });
  });

  // ---------- stock list ----------
  function imageSrc(p) {
    return localPreviews[p.image] || p.image;
  }

  function button(label, cls, onClick) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "btn small " + cls;
    b.textContent = label;
    b.addEventListener("click", onClick);
    return b;
  }

  function renderStock() {
    var ul = $("stock");
    ul.innerHTML = "";
    if (!products.length) {
      var li = document.createElement("li");
      li.textContent = "Nothing in stock yet. Add your first piece above.";
      ul.appendChild(li);
      return;
    }
    products.forEach(function (p) {
      var li = document.createElement("li");
      var img = document.createElement("img");
      img.src = imageSrc(p);
      img.alt = "";
      img.loading = "lazy";
      var info = document.createElement("div");
      var nm = document.createElement("div");
      nm.className = "stock-name";
      nm.textContent = p.name;
      var meta = document.createElement("div");
      meta.className = "stock-meta";
      meta.textContent = (KIND_LABEL[p.kind] || p.kind) + ", " + gbp.format(p.price) + (p.featured ? ", on the shelf" : "") + " ";
      if (p.sold) {
        var s = document.createElement("span");
        s.className = "sold";
        s.textContent = "Sold";
        meta.appendChild(s);
      }
      info.appendChild(nm);
      info.appendChild(meta);

      var btns = document.createElement("div");
      btns.className = "stock-btns";
      btns.appendChild(button("Edit", "btn-ghost", function () { startEdit(p); }));
      btns.appendChild(button(p.sold ? "Mark as available" : "Mark as sold", "btn-ghost", function () {
        var b = this; b.disabled = true;
        mutateProducts(function (list) {
          list.forEach(function (x) { if (x.id === p.id) x.sold = !x.sold; });
          return list;
        }, (p.sold ? "Mark available: " : "Mark sold: ") + p.name)
          .catch(function (e) { alert(e.message); b.disabled = false; });
      }));
      btns.appendChild(button("Delete", "danger", function () {
        if (!confirm("Delete " + p.name + " from the shop? This can't be undone here.")) return;
        var b = this; b.disabled = true;
        mutateProducts(function (list) {
          return list.filter(function (x) { return x.id !== p.id; });
        }, "Remove " + p.name)
          .then(function () { if (p.image && p.image.indexOf("images/") === 0) return deleteFile(p.image); })
          .catch(function (e) { alert(e.message); b.disabled = false; });
      }));

      li.appendChild(img);
      li.appendChild(info);
      li.appendChild(btns);
      $("stock").appendChild(li);
    });
  }

  // ---------- connect / disconnect ----------
  function showManager() {
    $("connect").hidden = true;
    $("manager").hidden = false;
    $("disconnect").hidden = false;
  }

  function showConnect() {
    $("connect").hidden = false;
    $("manager").hidden = true;
    $("disconnect").hidden = true;
  }

  function readConfig() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)); } catch (e) { return null; }
  }

  function writeConfig(c) {
    try {
      if (c) localStorage.setItem(STORE_KEY, JSON.stringify(c));
      else localStorage.removeItem(STORE_KEY);
    } catch (e) { /* storage blocked: stays connected for this visit only */ }
  }

  $("connect-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var f = this.elements;
    cfg = {
      owner: f.owner.value.trim(),
      repo: f.repo.value.trim(),
      branch: f.branch.value.trim() || "main",
      token: f.token.value.trim()
    };
    setStatus($("connect-status"), "Connecting…");
    loadProducts().then(function (data) {
      products = data.list;
      writeConfig(cfg);
      setStatus($("connect-status"), "");
      f.token.value = "";
      showManager();
      renderStock();
    }).catch(function (err) {
      cfg = null;
      setStatus($("connect-status"), err.message, "error");
    });
  });

  $("disconnect").addEventListener("click", function () {
    if (!confirm("Remove the access token from this device? You'll need it again to manage stock here.")) return;
    writeConfig(null);
    cfg = null;
    products = [];
    resetForm();
    showConnect();
  });

  // ---------- start ----------
  cfg = readConfig();
  if (cfg && cfg.token) {
    showManager();
    loadProducts().then(function (data) { products = data.list; renderStock(); })
      .catch(function (err) {
        setStatus($("save-status"), err.message, "error");
        if (err.status === 401) { writeConfig(null); showConnect(); setStatus($("connect-status"), err.message, "error"); }
      });
  } else {
    showConnect();
  }
})();
