const baseUrl = "https://joyful-backend-backend-production.up.railway.app/products";
const subcategoryUrl = "https://joyful-backend-backend-production.up.railway.app/subcategories";

let allSubcategories = [];
let selectedSubcategoryIds = [];
let quill;

window.onload = async () => {
  // Initialize Quill
  quill = new Quill("#productDescriptionEditor", {
    theme: "snow",
    placeholder: "Write product description...",
    modules: {
      toolbar: [
        [{ header: [1, 2, false] }],
        ["bold", "italic", "underline"],
        [{ list: "ordered" }, { list: "bullet" }],
        [{ align: [] }],
        ["clean"],
      ],
    },
  });
  // Bulk autofill and submit all products from CSV if present
  const autofillData = localStorage.getItem("autofillData");
  if (autofillData) {
    try {
      const data = JSON.parse(autofillData);
      // If editing, don't autofill (let loadProductForEdit handle it)
      const id = new URLSearchParams(window.location.search).get("id");
      if (!id) {
        await loadCategories();
        await bulkAutofillAndSubmit(data);
        // Optionally clear after use:
        // localStorage.removeItem("autofillData");
        return; // Don't show form after bulk import
      }
    } catch (e) {
      console.warn("Invalid autofillData in localStorage");
    }
  } else {
    await loadCategories();
  }
// Bulk autofill and submit all products from CSV data
async function bulkAutofillAndSubmit(data) {
  if (!Array.isArray(data) || data.length === 0) return;
  let count = 0, failed = 0;
  for (const cat of data) {
    for (const sub of cat.subcategories) {
      for (const prod of sub.products) {
        // Reset selectors
        resetCategorySelector();
        resetSubcategorySelector();
        // Select category and subcategory
        selectCategoryByName(cat.name);
        await new Promise(r => setTimeout(r, 200)); // Wait for subcats
        selectSubcategoryByName(sub.name);
        await new Promise(r => setTimeout(r, 200));
        // Prefill product fields
        document.getElementById("productName").value = prod.name || "";
        document.getElementById("mainImage").value = prod.mainimage || "";
        previewMainImage();
        document.getElementById("productFilter").value = prod.filter || "";
        document.getElementById("productTags").value = (prod.producttags || []).join(", ");
        document.getElementById("metaTitle").value = prod.metatitle || "";
        document.getElementById("metaDescription").value = prod.metadescription || "";
        document.getElementById("pageKeywords").value = prod.pagekeywords || "";
        if (typeof prod.ispublished !== "undefined") {
          document.querySelector(
            `input[name='ispublished'][value='${prod.ispublished}']`
          ).checked = true;
        }
        quill.root.innerHTML = prod.description || "";
        // Prefill variantsMap
        document.getElementById("variantFieldsContainer").innerHTML = "";
        if (prod.variantsMap) {
          let vm = {};
          try {
            vm = typeof prod.variantsMap === "string" ? JSON.parse(prod.variantsMap) : prod.variantsMap;
          } catch {}
          if (vm.Size && Array.isArray(vm.Size)) {
            vm.Size.forEach((entry) => {
              const variantId = `variant-${variantIndex++}`;
              const html = `
            <div class=\"variant-block\" data-type=\"Size\" id=\"${variantId}\" style=\"display:flex; align-items:center; gap:10px; margin-bottom:10px; border:1px solid #ccc; padding:10px; border-radius:6px;\">
              <strong style=\"min-width:60px;\">Size</strong>
              <input type=\"text\" placeholder=\"Enter size\" class=\"variant-size\" value=\"${entry.value || ""}\" required style=\"flex:1;\" />
              <input type=\"url\" placeholder=\"Image URL (optional)\" class=\"variant-image\" value=\"${entry.image || ""}\" style=\"flex:2;\" />
              <button type=\"button\" onclick=\"removeVariant('${variantId}')\" title=\"Remove\">❌</button>
            </div>
          `;
              document.getElementById("variantFieldsContainer").insertAdjacentHTML("beforeend", html);
            });
          }
          if (vm.Color && Array.isArray(vm.Color)) {
            vm.Color.forEach((entry) => {
              const variantId = `variant-${variantIndex++}`;
              const html = `
            <div class=\"variant-block\" data-type=\"Color\" id=\"${variantId}\" style=\"display:flex; align-items:center; gap:10px; margin-bottom:10px; border:1px solid #ccc; padding:10px; border-radius:6px;\">
              <strong style=\"min-width:60px;\">Color</strong>
              <input type=\"color\" class=\"variant-color-hex\" value=\"${entry.hex || "#000000"}\" required style=\"width:40px; height:40px; border:none; cursor:pointer;\" onchange=\"updateHexDisplay(this, '${variantId}')\" />
              <span id=\"${variantId}-hex-code\" style=\"width:80px;\">${entry.hex || "#000000"}</span>
              <input type=\"text\" placeholder=\"Color Name\" class=\"variant-color-name\" value=\"${entry.name || ""}\" required style=\"flex:1;\" />
              <input type=\"url\" placeholder=\"Image URL (required)\" class=\"variant-image\" value=\"${entry.image || ""}\" required style=\"flex:2;\" />
              <button type=\"button\" onclick=\"removeVariant('${variantId}')\" title=\"Remove\">❌</button>
            </div>
          `;
              document.getElementById("variantFieldsContainer").insertAdjacentHTML("beforeend", html);
            });
          }
          if (vm.Capacity && Array.isArray(vm.Capacity)) {
            vm.Capacity.forEach((entry) => {
              const variantId = `variant-${variantIndex++}`;
              const html = `
            <div class=\"variant-block\" data-type=\"Capacity\" id=\"${variantId}\" style=\"display:flex; align-items:center; gap:10px; margin-bottom:10px; border:1px solid #ccc; padding:10px; border-radius:6px;\">
              <strong style=\"min-width:80px;\">Capacity</strong>
              <input type=\"text\" placeholder=\"Enter capacity\" class=\"variant-capacity\" value=\"${entry.value || ""}\" required style=\"flex:1;\" />
              <input type=\"url\" placeholder=\"Image URL (optional)\" class=\"variant-image\" value=\"${entry.image || ""}\" style=\"flex:2;\" />
              <button type=\"button\" onclick=\"removeVariant('${variantId}')\" title=\"Remove\">❌</button>
            </div>
          `;
              document.getElementById("variantFieldsContainer").insertAdjacentHTML("beforeend", html);
            });
          }
        }
        // Build product object (same as handleAddProductSubmit)
        const tags = (prod.producttags || []);
        const variantsMap = prod.variantsMap ? (typeof prod.variantsMap === "string" ? prod.variantsMap : JSON.stringify(prod.variantsMap)) : JSON.stringify({Size:[],Color:[],Capacity:[]});
        const product = {
          name: prod.name,
          description: prod.description,
          mainimage: prod.mainimage,
          filter: prod.filter,
          producttags: tags,
          metatitle: prod.metatitle,
          metadescription: prod.metadescription,
          pagekeywords: prod.pagekeywords,
          ispublished: prod.ispublished,
          subcategories: selectedSubcategoryIds.map((id) => ({ id })),
          variantsMap: variantsMap,
        };
        // Submit to backend
        try {
          const response = await fetch(baseUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(product),
          });
          if (!response.ok) throw new Error(await response.text());
          count++;
        } catch (err) {
          failed++;
          console.error("Failed to import product:", prod.name, err);
        }
      }
    }
  }
  alert(`Bulk import complete! Imported: ${count}, Failed: ${failed}`);
  // Optionally clear autofillData after import
  // localStorage.removeItem("autofillData");
  window.location.href = "product.html";
}

  document.addEventListener("click", handleOutsideClick);
  document
    .getElementById("addProductForm")
    .addEventListener("submit", handleAddProductSubmit);

  const id = new URLSearchParams(window.location.search).get("id");
  if (id) {
    loadProductForEdit(id); // ✅ edit prefill
  }
};
// Autofill helper for CSV import (selects first product's category/subcategory/variant)
function autofillFromCSV(data) {
  if (!Array.isArray(data) || data.length === 0) return;
  // Find first product in the tree
  let found = null;
  for (const cat of data) {
    for (const sub of cat.subcategories) {
      if (sub.products && sub.products.length > 0) {
        found = { cat, sub, prod: sub.products[0] };
        break;
      }
    }
    if (found) break;
  }
  if (!found) return;
  // Select category
  resetCategorySelector();
  selectCategoryByName(found.cat.name);
  // Select subcategory
  resetSubcategorySelector();
  selectSubcategoryByName(found.sub.name);
  // Prefill product fields
  document.getElementById("productName").value = found.prod.name || "";
  document.getElementById("mainImage").value = found.prod.mainimage || "";
  previewMainImage();
  document.getElementById("productFilter").value = found.prod.filter || "";
  document.getElementById("productTags").value = (found.prod.producttags || []).join(", ");
  document.getElementById("metaTitle").value = found.prod.metatitle || "";
  document.getElementById("metaDescription").value = found.prod.metadescription || "";
  document.getElementById("pageKeywords").value = found.prod.pagekeywords || "";
  if (typeof found.prod.ispublished !== "undefined") {
    document.querySelector(
      `input[name='ispublished'][value='${found.prod.ispublished}']`
    ).checked = true;
  }
  quill.root.innerHTML = found.prod.description || "";
  // Prefill variantsMap
  if (found.prod.variantsMap) {
    let vm = {};
    try {
      vm = typeof found.prod.variantsMap === "string" ? JSON.parse(found.prod.variantsMap) : found.prod.variantsMap;
    } catch {}
    if (vm.Size && Array.isArray(vm.Size)) {
      vm.Size.forEach((entry) => {
        const variantId = `variant-${variantIndex++}`;
        const html = `
      <div class="variant-block" data-type="Size" id="${variantId}" style="display:flex; align-items:center; gap:10px; margin-bottom:10px; border:1px solid #ccc; padding:10px; border-radius:6px;">
        <strong style="min-width:60px;">Size</strong>
        <input type="text" placeholder="Enter size" class="variant-size" value="${entry.value || ""}" required style="flex:1;" />
        <input type="url" placeholder="Image URL (optional)" class="variant-image" value="${entry.image || ""}" style="flex:2;" />
        <button type="button" onclick="removeVariant('${variantId}')" title="Remove">❌</button>
      </div>
    `;
        document.getElementById("variantFieldsContainer").insertAdjacentHTML("beforeend", html);
      });
    }
    if (vm.Color && Array.isArray(vm.Color)) {
      vm.Color.forEach((entry) => {
        const variantId = `variant-${variantIndex++}`;
        const html = `
      <div class="variant-block" data-type="Color" id="${variantId}" style="display:flex; align-items:center; gap:10px; margin-bottom:10px; border:1px solid #ccc; padding:10px; border-radius:6px;">
        <strong style="min-width:60px;">Color</strong>
        <input type="color" class="variant-color-hex" value="${entry.hex || "#000000"}" required style="width:40px; height:40px; border:none; cursor:pointer;" onchange="updateHexDisplay(this, '${variantId}')" />
        <span id="${variantId}-hex-code" style="width:80px;">${entry.hex || "#000000"}</span>
        <input type="text" placeholder="Color Name" class="variant-color-name" value="${entry.name || ""}" required style="flex:1;" />
        <input type="url" placeholder="Image URL (required)" class="variant-image" value="${entry.image || ""}" required style="flex:2;" />
        <button type="button" onclick="removeVariant('${variantId}')" title="Remove">❌</button>
      </div>
    `;
        document.getElementById("variantFieldsContainer").insertAdjacentHTML("beforeend", html);
      });
    }
    if (vm.Capacity && Array.isArray(vm.Capacity)) {
      vm.Capacity.forEach((entry) => {
        const variantId = `variant-${variantIndex++}`;
        const html = `
      <div class="variant-block" data-type="Capacity" id="${variantId}" style="display:flex; align-items:center; gap:10px; margin-bottom:10px; border:1px solid #ccc; padding:10px; border-radius:6px;">
        <strong style="min-width:80px;">Capacity</strong>
        <input type="text" placeholder="Enter capacity" class="variant-capacity" value="${entry.value || ""}" required style="flex:1;" />
        <input type="url" placeholder="Image URL (optional)" class="variant-image" value="${entry.image || ""}" style="flex:2;" />
        <button type="button" onclick="removeVariant('${variantId}')" title="Remove">❌</button>
      </div>
    `;
        document.getElementById("variantFieldsContainer").insertAdjacentHTML("beforeend", html);
      });
    }
  }
}

// Helper: select category by name (for autofill)
function selectCategoryByName(name) {
  const cat = allCategories.find((c) => c.name === name);
  if (cat) selectCategory(cat.id, cat.name);
}
// Helper: select subcategory by name (for autofill)
function selectSubcategoryByName(name) {
  // Wait for subcategories to load
  setTimeout(() => {
    const sub = allSubcategories.find((s) => s.name === name);
    if (sub) selectSubcategory(sub.id, sub.name);
  }, 300);
}

// ⬇️ Same functions from your product.js — no changes needed
function previewMainImage() {
  const url = document.getElementById("mainImage").value;
  const img = document.getElementById("mainImagePreview");
  img.src = url || "";
  img.style.display = url ? "block" : "none";
}

function toggleSubcategoryDropdown() {
  if (selectedCategoryIds.length === 0) {
    document.getElementById("subcategoryWarning").style.display = "block";
    return;
  }
  document.getElementById("subcategoryWarning").style.display = "none";
  const dropdown = document.getElementById("subcategoryDropdownList");
  dropdown.style.display =
    dropdown.style.display === "block" ? "none" : "block";
}

function handleOutsideClick(e) {
  const dropdown = document.getElementById("subcategoryDropdownList");
  const customSelect = document.querySelector(".subcategory-multi-select");
  if (!customSelect.contains(e.target)) {
    dropdown.style.display = "none";
  }
}
const categoryUrl = "https://joyful-backend-backend-production.up.railway.app/categories";
let allCategories = [];
let selectedCategoryIds = [];
async function loadCategories() {
  try {
    const res = await fetch(categoryUrl);
    allCategories = await res.json();
    const dropdownList = document.getElementById("categoryDropdownList");
    dropdownList.innerHTML = allCategories
      .map(
        (cat) => `
        <div class="dropdown-item" data-id="${cat.id}" onclick="selectCategory(${cat.id}, '${cat.name}')"
          style="padding: 6px; cursor: pointer; border-bottom: 1px solid #eee;">${cat.name}</div>
      `
      )
      .join("");
  } catch (err) {
    console.error("Error loading categories:", err);
  }
}

function toggleCategoryDropdown() {
  const dropdown = document.getElementById("categoryDropdownList");
  dropdown.style.display =
    dropdown.style.display === "block" ? "none" : "block";
}

function selectCategory(id, name) {
  if (selectedCategoryIds.includes(id)) return;
  selectedCategoryIds.push(id);
  const tag = document.createElement("span");
  tag.classList.add("tag");
  tag.setAttribute("data-id", id);
  tag.style.cssText =
    "background: #e0e0e0; padding: 4px 8px; margin: 2px; border-radius: 5px; display: flex; align-items: center;";
  tag.innerHTML = `${name}<span style="margin-left: 6px; cursor: pointer;" onclick="removeCategory(${id})">❌</span>`;
  document.getElementById("selectedCategories").appendChild(tag);
  document.querySelector(".custom-multi-select").style.border = "";
  document.getElementById("subcategoryWarning").style.display = "none";
  loadSubcategories(); // Refresh subcategory list after category update
}

function removeCategory(id) {
  selectedCategoryIds = selectedCategoryIds.filter((cid) => cid !== id);
  const tag = document.querySelector(
    `#selectedCategories span[data-id="${id}"]`
  );
  if (tag) tag.remove();
  loadSubcategories(); // Refresh subcategory list after category update
}

function handleOutsideClick(e) {
  const categoryDropdown = document.getElementById("categoryDropdownList");
  const subcategoryDropdown = document.getElementById(
    "subcategoryDropdownList"
  );
  const customCategory = document.querySelector(".custom-multi-select");
  const customSubcategory = document.querySelector(".subcategory-multi-select");

  if (categoryDropdown && !customCategory.contains(e.target)) {
    categoryDropdown.style.display = "none";
  }
  if (subcategoryDropdown && !customSubcategory.contains(e.target)) {
    subcategoryDropdown.style.display = "none";
  }
}

async function loadSubcategories() {
  try {
    const res = await fetch(subcategoryUrl);
    allSubcategories = await res.json();

    const dropdownList = document.getElementById("subcategoryDropdownList");

    // Filter by selected categories
    const filteredSubcategories = allSubcategories.filter((sub) =>
      sub.categories?.some((cat) => selectedCategoryIds.includes(cat.id))
    );

    dropdownList.innerHTML = filteredSubcategories.length
      ? filteredSubcategories
          .map(
            (sub) => `
          <div class="dropdown-item" data-id="${sub.id}" onclick="selectSubcategory(${sub.id}, '${sub.name}')"
            style="padding: 6px; cursor: pointer; border-bottom: 1px solid #eee;">${sub.name}</div>
        `
          )
          .join("")
      : `<div style="padding: 8px; color: gray;">No subcategories found for selected categories.</div>`;
  } catch (err) {
    console.error("Error loading subcategories:", err);
  }
}

function selectSubcategory(id, name) {
  if (selectedSubcategoryIds.includes(id)) return;
  selectedSubcategoryIds.push(id);
  const tag = document.createElement("span");
  tag.classList.add("tag");
  tag.setAttribute("data-id", id);
  tag.style.cssText =
    "background: #e0e0e0; padding: 4px 8px; margin: 2px; border-radius: 5px; display: flex; align-items: center;";
  tag.innerHTML = `${name}<span style="margin-left: 6px; cursor: pointer;" onclick="removeSubcategory(${id})">❌</span>`;
  document.getElementById("selectedSubcategories").appendChild(tag);
  document.querySelector(".subcategory-multi-select").style.border = ""; // clear red border on valid selection
}

function removeSubcategory(id) {
  selectedSubcategoryIds = selectedSubcategoryIds.filter((sid) => sid !== id);
  const tag = document.querySelector(
    `#selectedSubcategories span[data-id="${id}"]`
  );
  if (tag) tag.remove();
}

function resetSubcategorySelector() {
  selectedSubcategoryIds = [];
  document.getElementById("selectedSubcategories").innerHTML = "";
}
function resetCategorySelector() {
  selectedCategoryIds = [];
  document.getElementById("selectedCategories").innerHTML = "";
}

async function handleAddProductSubmit(e) {
  e.preventDefault();

  // ✅ Validate subcategory selection
  if (selectedSubcategoryIds.length === 0) {
    const selectBox = document.querySelector(".subcategory-multi-select");
    selectBox.style.border = "2px solid red";
    alert("Please select at least one subcategory.");
    return;
  }

  // ✅ Parse tags
  const tags = document
    .getElementById("productTags")
    .value.trim()
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  // ✅ Prepare variantsMap
  const variantsMap = {
    Size: [],
    Color: [],
    Capacity: [],
  };

  let hasDuplicate = false;

  const blocks = document.querySelectorAll(".variant-block");
  blocks.forEach((block) => {
    const type = block.getAttribute("data-type");

    if (type === "Size") {
      const value = block.querySelector(".variant-size").value.trim();
      const image = block.querySelector(".variant-image").value.trim();

      if (!value) {
        alert("Size value is required.");
        hasDuplicate = true;
        return;
      }

      const isDuplicate = variantsMap.Size.some(
        (item) => item.value === value && item.image === image
      );
      if (isDuplicate) {
        alert(`Duplicate Size entry: ${value}`);
        hasDuplicate = true;
        return;
      }

      variantsMap.Size.push({ value, image });
    } else if (type === "Color") {
      const hex = block.querySelector(".variant-color-hex").value.trim();
      const name = block.querySelector(".variant-color-name").value.trim();
      const image = block.querySelector(".variant-image").value.trim();

      if (!hex || !name || !image) {
        alert("Color hex, name, and image are all required.");
        hasDuplicate = true;
        return;
      }

      const isDuplicate = variantsMap.Color.some(
        (item) => item.hex === hex && item.name === name && item.image === image
      );
      if (isDuplicate) {
        alert(`Duplicate Color entry: ${name} (${hex})`);
        hasDuplicate = true;
        return;
      }

      variantsMap.Color.push({ hex, name, image });
    } else if (type === "Capacity") {
      const value = block.querySelector(".variant-capacity").value.trim();
      const image = block.querySelector(".variant-image").value.trim();

      if (!value) {
        alert("Capacity value is required.");
        hasDuplicate = true;
        return;
      }

      const isDuplicate = variantsMap.Capacity.some(
        (item) => item.value === value && item.image === image
      );
      if (isDuplicate) {
        alert(`Duplicate Capacity entry: ${value}`);
        hasDuplicate = true;
        return;
      }

      variantsMap.Capacity.push({ value, image });
    }
  });

  if (hasDuplicate) return;

  // ✅ Build final product object
  const product = {
    name: document.getElementById("productName").value,
    description: quill.root.innerHTML,
    mainimage: document.getElementById("mainImage").value,
    filter: document.getElementById("productFilter").value,
    producttags: tags,
    metatitle: document.getElementById("metaTitle").value,
    metadescription: document.getElementById("metaDescription").value,
    pagekeywords: document.getElementById("pageKeywords").value,
    ispublished:
      document.querySelector('input[name="ispublished"]:checked')?.value ===
      "true",
    subcategories: selectedSubcategoryIds.map((id) => ({ id })),
    // variantsMap: variantsMap, // send as real object
     variantsMap: JSON.stringify(variantsMap),
  };

  // ✅ Submit to backend (POST or PUT)
  const id = new URLSearchParams(window.location.search).get("id");
  const response = await fetch(`${baseUrl}${id ? "/" + id : ""}`, {
    method: id ? "PUT" : "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(product),
  });

  if (!response.ok) {
    const errorText = await response.text();
    alert("Failed to save product: " + errorText);
    return;
  }
  window.location.href = "product.html";
}

async function loadProductForEdit(id) {
  try {
    const res = await fetch(`${baseUrl}/${id}`);
    const product = await res.json();

    document.getElementById("productName").value = product.name;
    document.getElementById("mainImage").value = product.mainimage;
    previewMainImage();
    document.getElementById("productFilter").value = product.filter || "";
    document.getElementById("productTags").value = (
      product.producttags || []
    ).join(", ");
    document.getElementById("metaTitle").value = product.metatitle;
    document.getElementById("metaDescription").value = product.metadescription;
    document.getElementById("pageKeywords").value = product.pagekeywords;
    document.querySelector(
      `input[name="ispublished"][value="${product.ispublished}"]`
    ).checked = true;

    quill.root.innerHTML = product.description || "";

    resetSubcategorySelector();
    resetCategorySelector();

    const seenCategoryIds = new Set(); // Avoid duplicate tags

    product.subcategories?.forEach((sub) => {
      selectSubcategory(sub.id, sub.name);

      if (Array.isArray(sub.categories)) {
        sub.categories.forEach((cat) => {
          if (!seenCategoryIds.has(cat.id)) {
            seenCategoryIds.add(cat.id);
            selectCategory(cat.id, cat.name);
          }
        });
      }
    });
    // ✅ Prefill variantsMap (Size, Color, Capacity)
    if (product.variantsMap) {
      let vm = {};
      try {
        vm =
          typeof product.variantsMap === "string"
            ? JSON.parse(product.variantsMap)
            : product.variantsMap;
      } catch (err) {
        console.error("Invalid variantsMap JSON", err);
      }

      // Reuse existing addVariantField logic
      if (vm.Size && Array.isArray(vm.Size)) {
        vm.Size.forEach((entry) => {
          const variantId = `variant-${variantIndex++}`;
          const html = `
        <div class="variant-block" data-type="Size" id="${variantId}" style="display:flex; align-items:center; gap:10px; margin-bottom:10px; border:1px solid #ccc; padding:10px; border-radius:6px;">
          <strong style="min-width:60px;">Size</strong>
          <input type="text" placeholder="Enter size" class="variant-size" value="${
            entry.value || ""
          }" required style="flex:1;" />
          <input type="url" placeholder="Image URL (optional)" class="variant-image" value="${
            entry.image || ""
          }" style="flex:2;" />
          <button type="button" onclick="removeVariant('${variantId}')" title="Remove">❌</button>
        </div>
      `;
          document
            .getElementById("variantFieldsContainer")
            .insertAdjacentHTML("beforeend", html);
        });
      }

      if (vm.Color && Array.isArray(vm.Color)) {
        vm.Color.forEach((entry) => {
          const variantId = `variant-${variantIndex++}`;
          const html = `
        <div class="variant-block" data-type="Color" id="${variantId}" style="display:flex; align-items:center; gap:10px; margin-bottom:10px; border:1px solid #ccc; padding:10px; border-radius:6px;">
          <strong style="min-width:60px;">Color</strong>
          <input type="color" class="variant-color-hex" value="${
            entry.hex || "#000000"
          }" required style="width:40px; height:40px; border:none; cursor:pointer;" onchange="updateHexDisplay(this, '${variantId}')" />
          <span id="${variantId}-hex-code" style="width:80px;">${
            entry.hex || "#000000"
          }</span>
          <input type="text" placeholder="Color Name" class="variant-color-name" value="${
            entry.name || ""
          }" required style="flex:1;" />
          <input type="url" placeholder="Image URL (required)" class="variant-image" value="${
            entry.image || ""
          }" required style="flex:2;" />
          <button type="button" onclick="removeVariant('${variantId}')" title="Remove">❌</button>
        </div>
      `;
          document
            .getElementById("variantFieldsContainer")
            .insertAdjacentHTML("beforeend", html);
        });
      }

      if (vm.Capacity && Array.isArray(vm.Capacity)) {
        vm.Capacity.forEach((entry) => {
          const variantId = `variant-${variantIndex++}`;
          const html = `
        <div class="variant-block" data-type="Capacity" id="${variantId}" style="display:flex; align-items:center; gap:10px; margin-bottom:10px; border:1px solid #ccc; padding:10px; border-radius:6px;">
          <strong style="min-width:80px;">Capacity</strong>
          <input type="text" placeholder="Enter capacity" class="variant-capacity" value="${
            entry.value || ""
          }" required style="flex:1;" />
          <input type="url" placeholder="Image URL (optional)" class="variant-image" value="${
            entry.image || ""
          }" style="flex:2;" />
          <button type="button" onclick="removeVariant('${variantId}')" title="Remove">❌</button>
        </div>
      `;
          document
            .getElementById("variantFieldsContainer")
            .insertAdjacentHTML("beforeend", html);
        });
      }
    }
  } catch (err) {
    console.error("Error loading product for edit:", err);
  }
}

// ! variant
function showVariantTypeDropdown() {
  const dropdown = document.getElementById("variantTypeDropdown");
  dropdown.style.display =
    dropdown.style.display === "block" ? "none" : "block";
}

// Close dropdown if clicked outside
document.addEventListener("click", (e) => {
  const dropdown = document.getElementById("variantTypeDropdown");
  const button = document.querySelector(
    "button[onclick='showVariantTypeDropdown()']"
  );
  if (!dropdown.contains(e.target) && e.target !== button) {
    dropdown.style.display = "none";
  }
});
let variantIndex = 0;

function addVariantField(type) {
  const container = document.getElementById("variantFieldsContainer");
  const variantId = `variant-${variantIndex++}`;

  let html = "";

  if (type === "Size") {
    html = `
      <div class="variant-block" data-type="Size" id="${variantId}" style="display:flex; align-items:center; gap:10px; margin-bottom:10px; border:1px solid #ccc; padding:10px; border-radius:6px;">
        <strong style="min-width:60px;">Size</strong>
        <input type="text" placeholder="Enter size" class="variant-size" required style="flex:1;" />
        <input type="url" placeholder="Image URL (optional)" class="variant-image" style="flex:2;" />
        <button type="button" onclick="removeVariant('${variantId}')" title="Remove">❌</button>
      </div>
    `;
  } else if (type === "Color") {
    html = `
      <div class="variant-block" data-type="Color" id="${variantId}" style="display:flex; align-items:center; gap:10px; margin-bottom:10px; border:1px solid #ccc; padding:10px; border-radius:6px;">
        <strong style="min-width:60px;">Color</strong>
        <input type="color" class="variant-color-hex" required style="width:40px; height:40px; border:none; cursor:pointer;" onchange="updateHexDisplay(this, '${variantId}')" />
        <span id="${variantId}-hex-code" style="width:80px;">#000000</span>
        <input type="text" placeholder="Color Name" class="variant-color-name" required style="flex:1;" />
        <input type="url" placeholder="Image URL (required)" class="variant-image" required style="flex:2;" />
        <button type="button" onclick="removeVariant('${variantId}')" title="Remove">❌</button>
      </div>
    `;
  } else if (type === "Capacity") {
    html = `
      <div class="variant-block" data-type="Capacity" id="${variantId}" style="display:flex; align-items:center; gap:10px; margin-bottom:10px; border:1px solid #ccc; padding:10px; border-radius:6px;">
        <strong style="min-width:80px;">Capacity</strong>
        <input type="text" placeholder="Enter capacity" class="variant-capacity" required style="flex:1;" />
        <input type="url" placeholder="Image URL (optional)" class="variant-image" style="flex:2;" />
        <button type="button" onclick="removeVariant('${variantId}')" title="Remove">❌</button>
      </div>
    `;
  }

  container.insertAdjacentHTML("beforeend", html);
  document.getElementById("variantTypeDropdown").style.display = "none";
}

function removeVariant(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

function updateHexDisplay(input, id) {
  document.getElementById(`${id}-hex-code`).textContent = input.value;
}
