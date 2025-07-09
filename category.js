const baseUrl = "https://joyful-backend-backend-production.up.railway.app/categories";
const categoryMap = new Map(); // Stores id -> category object
let addQuill;
let editQuill;

function convertGoogleDriveLink(url) {
  if (!url) return url;
  
  // Handle direct link format
  const directMatch = url.match(/https:\/\/drive\.google\.com\/uc\?.*id=([^&]+)/);
  if (directMatch) return url;
  
  // Handle file view link format
  const fileMatch = url.match(/https:\/\/drive\.google\.com\/file\/d\/([^/]+)/);
  if (fileMatch) {
    return `https://drive.google.com/uc?export=view&id=${fileMatch[1]}`;
  }
  
  // Handle open?id= format
  const openMatch = url.match(/https:\/\/drive\.google\.com\/open\?id=([^&]+)/);
  if (openMatch) {
    return `https://drive.google.com/uc?export=view&id=${openMatch[1]}`;
  }
  
  return url;
}

function previewImage() {
  let imageUrl = document.getElementById("addImageLink").value.trim();
  imageUrl = convertGoogleDriveLink(imageUrl);
  const preview = document.getElementById("imagePreview");
  if (preview) {
    preview.style.display = imageUrl ? "block" : "none";
    preview.src = imageUrl;
  }
}

function editPreviewImage() {
  let imageUrl = document.getElementById("editImageLink").value.trim();
  imageUrl = convertGoogleDriveLink(imageUrl);
  const preview = document.getElementById("editImagePreview");
  if (preview) {
    preview.style.display = imageUrl ? "block" : "none";
    preview.src = imageUrl;
  }
}

window.onload = () => {
  getAllCategories();

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

async function getAllCategories() {
  try {
    const res = await fetch(baseUrl);
    const data = await res.json();
    document.getElementById("categoryCount").textContent = `Total Categories: ${data.length}`;

    const tableBody = document.getElementById("categoryTableBody");
    tableBody.innerHTML = "";
    categoryMap.clear();

    data.forEach((cat) => {
      categoryMap.set(cat.id, cat);

      const row = document.createElement("tr");
      row.innerHTML = `
        <td class="cell-name">${cat.name}</td>
        <td class="cell-image">
          <div class="image-container">
            <img src="${convertGoogleDriveLink(cat.imagelink) || ''}"
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
            <button class="edit-btn" onclick="handleEditClick(${cat.id})">Edit</button>
            <button class="delete-btn" onclick="deleteCategory(${cat.id})">Delete</button>
          </div>
        </td>
      `;
      tableBody.appendChild(row);

      const img = row.querySelector(".image-container img");
      const container = row.querySelector(".image-container");
      container.classList.add("loading");

      // Set a timeout before checking if image loaded
      setTimeout(() => {
        if (img.complete && img.naturalHeight !== 0) {
          img.classList.add("loaded");
          container.classList.remove("loading");
        } else {
          img.addEventListener("load", () => {
            img.classList.add("loaded");
            container.classList.remove("loading");
          });
          img.addEventListener("error", () => {
            img.src = "https://dummyimage.com/100x100/cccccc/000000&text=No+Image";
            img.classList.add("loaded");
            container.classList.remove("loading");
          });
        }
      }, 100);
    });
  } catch (error) {
    console.error("Error fetching categories:", error);
    showCustomAlert("Failed to load categories. Please try again.");
  }
}

function openAddModal() {
  document.getElementById("addModal").style.display = "flex";
}

function closeAddModal() {
  document.getElementById("addModal").style.display = "none";
  document.getElementById("addForm").reset();
  addQuill.setContents([]);
  document.getElementById("imagePreview").style.display = "none";
}

function handleEditClick(id) {
  const cat = categoryMap.get(id);
  if (!cat) {
    showCustomAlert("Category not found!");
    return;
  }
  editCategory(cat);
}

function editCategory(cat) {
  document.getElementById("editId").value = cat.id;
  document.getElementById("editName").value = cat.name;
  editQuill.root.innerHTML = cat.description || "";
  document.getElementById("editSearchKeywords").value = cat.searchkeywords || "";
  document.getElementById("editImageLink").value = cat.imagelink || "";
  document.getElementById("editSeoTitle").value = cat.seotitle || "";
  document.getElementById("editSeoKeywords").value = cat.seokeywords || "";
  document.getElementById("editSeoDescription").value = cat.seodescription || "";

  // Set the correct radio button based on published status
  const publishedValue = cat.published ? "PUBLISHED" : "DRAFT";
  document.querySelector(`input[name="editStatus"][value="${publishedValue}"]`).checked = true;

  // Show image preview if image exists
  if (cat.imagelink) {
    const preview = document.getElementById("editImagePreview");
    preview.src = convertGoogleDriveLink(cat.imagelink);
    preview.style.display = "block";
  }

  document.getElementById("editModal").style.display = "flex";
}

document.getElementById("editForm").addEventListener("submit", async function (e) {
  e.preventDefault();

  try {
    const id = document.getElementById("editId").value;
    const name = document.getElementById("editName").value;
    const description = editQuill.root.innerHTML.trim();
    const searchkeywords = document.getElementById("editSearchKeywords").value;
    const imagelink = convertGoogleDriveLink(document.getElementById("editImageLink").value.trim());
    const seotitle = document.getElementById("editSeoTitle").value;
    const seokeywords = document.getElementById("editSeoKeywords").value;
    const seodescription = document.getElementById("editSeoDescription").value;

    const statusValue = document.querySelector('input[name="editStatus"]:checked').value;
    const published = statusValue === "PUBLISHED";

    const categoryData = {
      name,
      description,
      searchkeywords,
      imagelink,
      seotitle,
      seokeywords,
      seodescription,
      published,
    };

    const response = await fetch(`${baseUrl}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(categoryData),
    });

    if (!response.ok) {
      throw new Error("Failed to update category");
    }

    closeEditModal();
    getAllCategories();
  } catch (error) {
    console.error("Error updating category:", error);
    showCustomAlert("Failed to update category. Please try again.");
  }
});

document.getElementById("addForm").addEventListener("submit", async function (e) {
  e.preventDefault();

  try {
    const name = document.getElementById("addName").value.trim();
    const description = addQuill.root.innerHTML.trim();
    const searchkeywords = document.getElementById("addSearchKeywords").value.trim();
    const rawLink = document.getElementById("addImageLink").value.trim();
    const imagelink = convertGoogleDriveLink(rawLink);
    const seotitle = document.getElementById("addSeoTitle").value.trim();
    const seokeywords = document.getElementById("addSeoKeywords").value.trim();
    const seodescription = document.getElementById("addSeoDescription").value.trim();

    const ispublished = document.querySelector('input[name="publishStatus"]:checked')?.value === "true";

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

    const response = await fetch(baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(category),
    });

    if (!response.ok) {
      throw new Error("Failed to add category");
    }

    closeAddModal();
    getAllCategories();
  } catch (error) {
    console.error("Error adding category:", error);
    showCustomAlert("Failed to add category. Please try again.");
  }
});

function closeEditModal() {
  document.getElementById("editModal").style.display = "none";
  document.getElementById("editForm").reset();
  editQuill.setContents([]);
  document.getElementById("editImagePreview").style.display = "none";
}

async function deleteCategory(id) {
  const confirmDelete = confirm("Are you sure you want to delete this category?");
  if (!confirmDelete) return;

  try {
    const res = await fetch(`${baseUrl}/${id}`, { method: "DELETE" });

    if (!res.ok) {
      const errorData = await res.json();
      if (res.status === 400 || res.status === 409) {
        showCustomAlert(
          errorData.message || "This category has subcategories and cannot be deleted."
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
