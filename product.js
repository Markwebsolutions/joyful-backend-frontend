const baseUrl = "https://joyful-backend-backend-production.up.railway.app/products";
const subcategoryUrl = "https://joyful-backend-backend-production.up.railway.app/subcategories";

async function loadProducts() {
  try {
    const res = await fetch(baseUrl);
    if (!res.ok) throw new Error("Failed to load products");
    const data = await res.json();

    const tbody = document.getElementById("productTableBody");
    tbody.innerHTML = "";

    data.forEach((product) => {
      const tr = document.createElement("tr");

      const statusBadge = product.ispublished
        ? `<span class="status-badge done">Published</span>`
        : `<span class="status-badge not-done">Draft</span>`;

      const subcategories = product.subcategories
        .map((sub) => sub.name)
        .join(", ");

      const categoriesSet = new Set();
      product.subcategories.forEach((sub) => {
        sub.categories?.forEach((cat) => categoriesSet.add(cat.name));
      });

      const categories = Array.from(categoriesSet).join(", ");

      tr.innerHTML = `
        <td>${product.name}</td>
        <td><img src="${
          product.mainimage || ""
        }" alt="Product Image" onerror="this.style.display='none'"/></td>
        <td>${categories || "-"}</td>
        <td>${subcategories || "-"}</td>
        <td>${statusBadge}</td>
        <td>
          <button class="action-btn edit-btn" onclick="editProduct(${
            product.id
          })">Edit</button>
          <button class="action-btn delete-btn" onclick="deleteProduct(${
            product.id
          })">Delete</button>
        </td>
      `;

      tbody.appendChild(tr);
    });
    document.getElementById(
      "productCount"
    ).textContent = `Total Products: ${data.length}`;
  } catch (err) {
    console.error("Error loading products:", err);
  }
}
function editProduct(id) {
  window.location.href = `addeditproduct.html?id=${id}`;
}

async function deleteProduct(id) {
  if (!confirm("Are you sure you want to delete this product?")) return;

  try {
    const res = await fetch(`${baseUrl}/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete product");
    loadProducts();
  } catch (err) {
    console.error("Error deleting product:", err);
  }
}

loadProducts();
