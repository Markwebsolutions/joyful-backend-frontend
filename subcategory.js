const baseUrl = "https://joyful-backend-backend-production.up.railway.app/subcategories";
const categoryUrl = "https://joyful-backend-backend-production.up.railway.app/categories";

const subcategoryMap = new Map(); // Store subcategories
let allCategories = []; // Store loaded category list
let selectedCategoryIds = []; // Store selected category IDs
let descriptionQuill;

window.onload = () => {
  getAllSubcategories();
  loadCategories();
  document.addEventListener("click", handleOutsideClick);
  descriptionQuill = new Quill("#descriptionEditor", {
    theme: "snow",
    placeholder: "Write subcategory description...",
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
};

function previewSubcategoryImage() {
  const imageUrl = document.getElementById("imagepath").value.trim();
  const preview = document.getElementById("subImagePreview");

  if (imageUrl) {
    preview.src = imageUrl;
    preview.style.display = "block";
  } else {
    preview.style.display = "none";
  }
}

async function getAllSubcategories() {
  const res = await fetch(baseUrl);
  const data = await res.json();

  document.getElementById(
    "subcategoryCount"
  ).textContent = `Total Subcategories: ${data.length}`;
  const tableBody = document.getElementById("subcategoryTableBody");
  tableBody.innerHTML = "";
  data.forEach((sub) => {
    subcategoryMap.set(sub.id, sub);

    const row = document.createElement("div");
    row.classList.add("grid-row");
    row.innerHTML = `
    <div>${sub.name}</div>
    <div>
      <div class="image-container loading">
        <img src="${sub.imagepath || ""}" alt="${sub.name}" loading="lazy" />
        <div class="image-loader"></div>
      </div>
    </div>
    <div>${(sub.categories || []).map((c) => c.name).join(", ")}</div>
    <div>
      <span class="status-badge ${sub.ispublished ? "published" : "draft"}">
        ${sub.ispublished ? "Published" : "Draft"}
      </span>
    </div>
    <div>
      <div class="action-buttons">
        <button class="edit-btn" onclick="handleEditClick(${
          sub.id
        })">Edit</button>
        <button class="delete-btn" onclick="deleteSubcategory(${
          sub.id
        })">Delete</button>
      </div>
    </div>
  `;
    tableBody.appendChild(row);

    // ✅ Add fallback image + loading effect (same as Category)
    const img = row.querySelector("img");
    const container = row.querySelector(".image-container");

    img.onerror = function () {
      this.src = "https://dummyimage.com/100x100/cccccc/000000&text=No+Image";
      this.classList.add("loaded");
      container.classList.remove("loading");
    };

    img.onload = function () {
      this.classList.add("loaded");
      container.classList.remove("loading");
    };

    if (img.complete) {
      img.classList.add("loaded");
      container.classList.remove("loading");
    }
  });
}

function toggleDropdown() {
  const dropdown = document.getElementById("dropdownList");
  dropdown.style.display =
    dropdown.style.display === "block" ? "none" : "block";
}

function handleOutsideClick(e) {
  const dropdown = document.getElementById("dropdownList");
  const customSelect = document.querySelector(".custom-multi-select");
  if (!customSelect.contains(e.target)) {
    dropdown.style.display = "none";
  }
}

async function loadCategories() {
  const res = await fetch(categoryUrl);
  allCategories = await res.json();
  const dropdownList = document.getElementById("dropdownList");

  dropdownList.innerHTML = allCategories
    .map(
      (cat) => `
        <div class="dropdown-item" data-id="${cat.id}" onclick="selectCategory(${cat.id}, '${cat.name}')"
          style="padding: 6px; cursor: pointer; border-bottom: 1px solid #eee;">${cat.name}</div>
      `
    )
    .join("");
}

function selectCategory(id, name) {
  if (selectedCategoryIds.includes(id)) return;

  selectedCategoryIds.push(id);

  const tag = document.createElement("span");
  tag.classList.add("tag");
  tag.style.cssText =
    "background: #e0e0e0; padding: 4px 8px; margin: 2px; border-radius: 5px; display: flex; align-items: center;";
  tag.setAttribute("data-id", id);
  tag.innerHTML = `
        ${name}
        <span style="margin-left: 6px; cursor: pointer;" onclick="removeCategory(${id})">❌</span>
      `;
  document.getElementById("selectedCategories").appendChild(tag);
  document.querySelector(".custom-multi-select").style.border =
    "1px solid #ccc"; // reset error border
}

function removeCategory(id) {
  selectedCategoryIds = selectedCategoryIds.filter((cid) => cid !== id);
  const tag = document.querySelector(
    `#selectedCategories span[data-id="${id}"]`
  );
  if (tag) tag.remove();
}

function resetCategorySelector() {
  selectedCategoryIds = [];
  document.getElementById("selectedCategories").innerHTML = "";
}

function openAddModal() {
  document.getElementById("addModal").style.display = "flex";
  document.getElementById("addForm").reset();
  resetCategorySelector();
  document.getElementById("subcategoryId").value = "";
  document.getElementById("formTitle").innerText = "Add Subcategory";
  descriptionQuill.setContents([]); // clear Quill on open
}

function closeAddModal() {
  document.getElementById("addModal").style.display = "none";
  document.getElementById("subImagePreview").style.display = "none";
  document.getElementById("addForm").reset();
  resetCategorySelector();
}

document
  .getElementById("addForm")
  .addEventListener("submit", async function (e) {
    e.preventDefault();

    const id = document.getElementById("subcategoryId").value;
    const description = descriptionQuill.root.innerHTML.trim();

    // ✅ Ensure at least one category is selected
    if (selectedCategoryIds.length === 0) {
      alert("Please select at least one category.");
      document.querySelector(".custom-multi-select").style.border =
        "1px solid red";
      return;
    }
    const subcategory = {
      name: document.getElementById("name").value,
      description,
      imagepath: document.getElementById("imagepath").value,
      metatitle: document.getElementById("metatitle").value,
      metadescription: document.getElementById("metadescription").value,
      seokeywords: document.getElementById("seokeywords").value,
      ispublished:
        document.querySelector('input[name="ispublished"]:checked').value ===
        "true",
      categories: selectedCategoryIds.map((id) => ({ id })),
    };

    const method = id ? "PUT" : "POST";
    const url = id ? `${baseUrl}/${id}` : baseUrl;

    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(subcategory),
    });

    closeAddModal();
    getAllSubcategories();
  });

function editSubcategory(sub) {
  document.getElementById("subcategoryId").value = sub.id;
  document.getElementById("name").value = sub.name;
  descriptionQuill.root.innerHTML = sub.description || "";
  descriptionQuill.setContents(
    descriptionQuill.clipboard.convert(sub.description || "")
  );

  document.getElementById("imagepath").value = sub.imagepath;
  document.getElementById("metatitle").value = sub.metatitle;
  document.getElementById("metadescription").value = sub.metadescription;
  document.getElementById("seokeywords").value = sub.seokeywords;
  document.querySelector(
    `input[name="ispublished"][value="${sub.ispublished}"]`
  ).checked = true;

  resetCategorySelector();
  if (Array.isArray(sub.categories)) {
    sub.categories.forEach((cat) => selectCategory(cat.id, cat.name));
  }

  document.getElementById("formTitle").innerText = "Edit Subcategory";
  document.getElementById("addModal").style.display = "flex";
}
function handleEditClick(id) {
  const sub = subcategoryMap.get(id);
  if (!sub) return alert("Subcategory not found");
  editSubcategory(sub);
}
function showCustomAlert(message) {
  document.getElementById("customAlertMessage").textContent = message;
  document.getElementById("customAlert").style.display = "flex";
}

function closeCustomAlert() {
  document.getElementById("customAlert").style.display = "none";
}

async function deleteSubcategory(id) {
  if (!confirm("Are you sure you want to delete this subcategory?")) return;

  try {
    const res = await fetch(`${baseUrl}/${id}`, { method: "DELETE" });

    if (!res.ok) {
      const errorData = await res.json();
      if (res.status === 409) {
        showCustomAlert(
          errorData.message ||
            "Subcategory is linked to products and cannot be deleted."
        );
      } else {
        showCustomAlert("Unexpected error occurred. Please try again.");
      }
      return;
    }

    getAllSubcategories();
  } catch (err) {
    console.error("Delete failed:", err);
    showCustomAlert("Failed to connect to the server.");
  }
}
