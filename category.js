const baseUrl = "https://joyful-backend-backend-production.up.railway.app/categories";
const categoryMap = new Map(); // Stores id -> category object
let addQuill;
let editQuill;

// function previewImage() {
//   const imageUrl = document.getElementById("addImageLink").value;
//   const preview = document.getElementById("imagePreview");
//   preview.style.display = imageUrl.trim() ? "block" : "none";
//   preview.src = imageUrl.trim();
// }
function previewImage() {
  const input = document.getElementById("addImageLink");
  const preview = document.getElementById("imagePreview");

  let imageUrl = input.value.trim();
  let finalUrl = imageUrl;

  // Convert Google Drive link to direct viewable URL
  const driveMatch = imageUrl.match(
    /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/
  );
  if (driveMatch && driveMatch[1]) {
    const fileId = driveMatch[1];
    finalUrl = `https://drive.google.com/uc?export=view&id=${fileId}`;

    // ✅ Update the input value so the correct link gets saved
    input.value = finalUrl;
  }

  preview.src = finalUrl;
  preview.style.display = finalUrl ? "block" : "none";
}

// window.onload = getAllCategories;
window.onload = () => {
  getAllCategories();

  // Initialize Quill for Add Description
  addQuill = new Quill("#addDescriptionEditor", {
    theme: "snow",
    placeholder: "Write category description...",
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

  // Initialize Quill for Edit Description
  editQuill = new Quill("#editDescriptionEditor", {
    theme: "snow",
    placeholder: "Edit category description...",
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

// * new
async function getAllCategories() {
  const res = await fetch(baseUrl);
  const data = await res.json();
  document.getElementById(
    "categoryCount"
  ).textContent = `Total Categories: ${data.length}`;

  const tableBody = document.getElementById("categoryTableBody");
  tableBody.innerHTML = "";
  categoryMap.clear();

  data.forEach((cat) => {
    // Store in map
    categoryMap.set(cat.id, cat);

    const row = document.createElement("tr");
    row.innerHTML = `
        <td class="cell-name">${cat.name}</td>
        <td class="cell-image">
    <div class="image-container">
  <img src="${cat.imagelink || ""}"
      alt="${cat.name}"
      loading="lazy"
      onerror="this.onerror=null;this.src='https://dummyimage.com/100x100/cccccc/000000&text=No+Image';">

      <div class="image-loader"></div>
    </div>
  </td>
        <td class="cell-status">
          <span class="status-badge ${cat.published ? "published" : "draft"}">
            ${cat.published ? "Published" : "Draft"}
          </span>
        </td>
        <td class="cell-actions">
          <div class="action-buttons">
            <button class="edit-btn" onclick="handleEditClick(${
              cat.id
            })">Edit</button>
            <button class="delete-btn" onclick="deleteCategory(${
              cat.id
            })">Delete</button>
          </div>
        </td>
      `;
    tableBody.appendChild(row);

    const img = row.querySelector(".image-container img");
    const container = row.querySelector(".image-container");
    container.classList.add("loading");

    if (img.complete) {
      img.classList.add("loaded");
      container.classList.remove("loading");
    } else {
      img.addEventListener("load", () => {
        img.classList.add("loaded");
        container.classList.remove("loading");
      });
      img.addEventListener("error", () => {
        // img.src = "placeholder.jpg";
        img.classList.add("loaded");
        container.classList.remove("loading");
      });
    }
  });
}

// * till above
function openAddModal() {
  document.getElementById("addModal").style.display = "flex";
}

function closeAddModal() {
  document.getElementById("addModal").style.display = "none";
  document.getElementById("addForm").reset();
  addQuill.setContents([]); // clear editor
  document.getElementById("imagePreview").style.display = "none";
}

function openEditModal(
  id,
  name,
  description,
  searchkeywords,
  imagelink,
  seotitle,
  seodescription,
  seokeywords
) {
  document.getElementById("editId").value = id;
  document.getElementById("editName").value = name;
  document.getElementById("editDescription").value = description;
  document.getElementById("editSearchKeywords").value = searchkeywords;
  document.getElementById("editImageLink").value = imagelink;
  document.getElementById("editSeoTitle").value = seotitle;
  document.getElementById("editSeoKeywords").value = seokeywords;
  document.getElementById("editDescription").value = seodescription;
  document.getElementById("editModal").style.display = "flex";
}
function handleEditClick(id) {
  const cat = categoryMap.get(id);
  if (!cat) return alert("Category not found!");
  editCategory(cat);
}

function editCategory(cat) {
  document.getElementById("editId").value = cat.id;
  document.getElementById("editName").value = cat.name;
  editQuill.root.innerHTML = cat.description || "";
  document.getElementById("editSearchKeywords").value = cat.searchkeywords;
  document.getElementById("editImageLink").value = cat.imagelink;
  document.getElementById("editSeoTitle").value = cat.seotitle;
  document.getElementById("editSeoKeywords").value = cat.seokeywords;
  document.getElementById("editSeoDescription").value = cat.seodescription;

  // Fix radio button
  document.querySelector(
    `input[name="editStatus"][value="${cat.published ? "PUBLISHED" : "DRAFT"}"]`
  ).checked = true;

  document.getElementById("editModal").style.display = "flex";
}

document
  .getElementById("editForm")
  .addEventListener("submit", async function (e) {
    e.preventDefault();

    const id = document.getElementById("editId").value;
    const name = document.getElementById("editName").value;
    // const description = document.getElementById("editDescription").value;
    const description = editQuill.root.innerHTML.trim();
    const searchkeywords = document.getElementById("editSearchKeywords").value;
    const imagelink = document.getElementById("editImageLink").value;
    const seotitle = document.getElementById("editSeoTitle").value;
    const seokeywords = document.getElementById("editSeoKeywords").value;
    const seodescription = document.getElementById("editSeoDescription").value;

    const statusValue = document.querySelector(
      'input[name="editStatus"]:checked'
    ).value;
    const published = statusValue === "PUBLISHED"; // Convert to boolean

    const categoryData = {
      name,
      description,
      searchkeywords,
      imagelink,
      seotitle,
      seokeywords,
      seodescription,
      published, // boolean value
    };

    await fetch(`${baseUrl}/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(categoryData),
    });
    console.log("Submitting category data:", categoryData);
    closeEditModal();
    getAllCategories();
  });

document
  .getElementById("addForm")
  .addEventListener("submit", async function (e) {
    e.preventDefault();

    const name = document.getElementById("addName").value.trim();
    const description = addQuill.root.innerHTML.trim();
    const searchkeywords = document
      .getElementById("addSearchKeywords")
      .value.trim();
    const imagelink = document.getElementById("addImageLink").value.trim();
    const seotitle = document.getElementById("addSeoTitle").value.trim();
    const seokeywords = document.getElementById("addSeoKeywords").value.trim();
    const seodescription = document
      .getElementById("addSeoDescription")
      .value.trim();

    const ispublished =
      document.querySelector('input[name="publishStatus"]:checked')?.value ===
      "true"; // ✅ Use optional chaining and strict check

    const category = {
      name,
      description,
      searchkeywords,
      imagelink,
      seotitle,
      seokeywords,
      seodescription,
      published: ispublished,
    };

    await fetch(baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(category),
    });

    closeAddModal();
    getAllCategories();
  });

function closeEditModal() {
  document.getElementById("editModal").style.display = "none";
  document.getElementById("editForm").reset();
  editQuill.setContents([]); // clear editor
}

async function deleteCategory(id) {
  const confirmDelete = confirm(
    "Are you sure you want to delete this category?"
  );
  if (!confirmDelete) return;

  try {
    const res = await fetch(`${baseUrl}/${id}`, { method: "DELETE" });

    if (!res.ok) {
      const errorData = await res.json();
      if (
        res.status === 400 ||
        res.status === 409 // Use appropriate status code
      ) {
        showCustomAlert(
          errorData.message ||
            "This category has subcategories and cannot be deleted."
        );
      } else {
        showCustomAlert("An unexpected error occurred. Please try again.");
      }
      return;
    }

    getAllCategories();
  } catch (err) {
    console.error("Delete error:", err);
    showCustomAlert("Failed to connect to the server.");
  }
}

function showCustomAlert(message) {
  document.getElementById("customAlertMessage").textContent = message;
  document.getElementById("customAlert").style.display = "flex";
}

function closeCustomAlert() {
  document.getElementById("customAlert").style.display = "none";
}
