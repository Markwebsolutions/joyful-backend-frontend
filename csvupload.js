/* ----------------------------- globals ----------------------------- */
let structuredData = []; // Category-centric tree
let fileSelected = false;

const CAT_URL = "https://joyful-backend-backend-production.up.railway.app/categories";
const SUB_URL = "https://joyful-backend-backend-production.up.railway.app/subcategories";
const PROD_URL = "https://joyful-backend-backend-production.up.railway.app/products";

/* ---------------------------- error popup -------------------------- */
function showError(message) {
  const existing = document.getElementById("error-popup");
  if (existing) existing.remove();

  const div = document.createElement("div");
  div.id = "error-popup";
  div.textContent = message;
  div.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: #ffe0e0;
    padding: 16px 24px;
    border: 2px solid red;
    border-radius: 8px;
    font-size: 18px;
    z-index: 1000;
  `;
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 3000);
}

/* ------------------------- CSV → data model ----------------------- */
function handleCSVData(csvRows) {
  structuredData = [];
  const header = csvRows[0];

  for (let i = 1; i < csvRows.length; i++) {
    const row = csvRows[i];
    if (!row || row.length === 0 || row.every((cell) => !cell.trim())) continue;

    const r = {};
    header.forEach((h, j) => (r[h.trim()] = (row[j] || "").trim()));

    if (!r.CategoryName && !r.SubcategoryName && !r.ProductName) continue;

    // --- Category ---
    let cat = structuredData.find((c) => c.name === r.CategoryName);
    if (!cat && r.CategoryName) {
      cat = {
        name: r.CategoryName || "(Unnamed Category)",
        description: r.CategoryDesc || "",
        searchkeywords: r.CategorySearch || "",
        imagelink: r.CategoryImage || "",
        seotitle: r.CategorySeoTitle || "",
        seokeywords: r.CategorySeoKeywords || "",
        seodescription: r.CategorySeoDesc || "",
        published: r.CategoryPublished?.toLowerCase() !== "false",
        subcategories: [],
      };
      structuredData.push(cat);
    }

    // --- Subcategory ---
    if (cat && r.SubcategoryName) {
      let sub = cat.subcategories.find((s) => s.name === r.SubcategoryName);
      if (!sub) {
        sub = {
          name: r.SubcategoryName || "(Unnamed Subcategory)",
          imagepath: r.SubcategoryImage || "",
          metatitle: r.SubcategoryMetaTitle || "",
          ispublished: r.SubcategoryPublished?.toLowerCase() !== "false",
          description: r.SubcategoryDesc || "",
          metadescription: r.SubcategoryMetaDesc || "",
          seokeywords: r.SubcategoryKeywords || "",
          products: [],
        };
        cat.subcategories.push(sub);
      }

      // --- Product ---
      if (r.ProductName) {
        let variantsObj = {};
        if (r.ProductVariantsMap) {
          try {
            variantsObj = JSON.parse(r.ProductVariantsMap);
          } catch {
            console.warn("⚠️ Bad variantsMap JSON on row", i + 1);
          }
        }

        sub.products.push({
          name: r.ProductName || "(Unnamed Product)",
          description: r.ProductDesc || "",
          mainimage: r.ProductImage || "",
          producttags:
            r.ProductTags?.split(/[,;]/)
              .map((t) => t.trim())
              .filter(Boolean) || [],
          filter: r.ProductFilter || "",
          metatitle: r.ProductMetaTitle || "",
          metadescription: r.ProductMetaDesc || "",
          pagekeywords: r.ProductKeywords || "",
          ispublished: r.ProductPublished?.toLowerCase() !== "false",
          variantsMap: variantsObj,
        });
      }
    }
  }

  renderPreview();
}

/* ---------------------------- Preview UI --------------------------- */
function renderPreview() {
  const t = document.getElementById("previewTable");
  if (!structuredData.length) {
    t.innerHTML = "";
    return;
  }

  const bodyRows = structuredData
    .map((c, i) => {
      const catName = c.name || "(Unnamed Category)";

      const subNames = c.subcategories
        .map((s) => s.name || "(Unnamed Subcategory)")
        .join("<br>");

      const prodNames = c.subcategories
        .flatMap((s) =>
          s.products.map((p) => p.name || "(Unnamed Product)")
        )
        .join("<br>");

      return `
        <tr data-index="${i}">
          <td>${catName}</td>
          <td>${subNames}</td>
          <td>${prodNames}</td>
          <td><button onclick="removeCategory(${i})">❌</button></td>
        </tr>`;
    })
    .join("");

  t.innerHTML = `
    <thead>
      <tr>
        <th>Category</th>
        <th>Subcategories</th>
        <th>Products</th>
        <th>Remove</th>
      </tr>
    </thead>
    <tbody>${bodyRows}</tbody>`;
}

/* ---------------------- Remove category row ------------------------ */
function removeCategory(index) {
  structuredData.splice(index, 1);
  renderPreview();
}

/* ---------------------------- CSV loader --------------------------- */
document.getElementById("csvInput").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const isCSV = file.type === "text/csv" || file.name.endsWith(".csv");
  if (!isCSV) {
    showError("❌ Only CSV file allowed");
    structuredData = [];
    document.getElementById("previewTable").innerHTML = "";
    fileSelected = false;
    return;
  }

  Papa.parse(file, {
    complete: (res) => {
      fileSelected = true;
      handleCSVData(res.data);
    },
  });
});

/* ----------------------------- Autofill ---------------------------- */
function autofillForms() {
  if (!fileSelected || structuredData.length === 0) {
    showError("❌ Please select a CSV file first");
    return;
  }
  localStorage.setItem("autofillData", JSON.stringify(structuredData));
  window.location.href = "Category.html";
}

/* -------------------------- Bulk submit ---------------------------- */
async function submitBulkData() {
  if (!fileSelected || structuredData.length === 0) {
    showError("❌ Please select a CSV file first");
    return;
  }

  try {
    for (const cat of structuredData) {
      const savedCat = await postJSON(CAT_URL, {
        name: cat.name,
        description: cat.description,
        searchkeywords: cat.searchkeywords,
        imagelink: cat.imagelink,
        seotitle: cat.seotitle,
        seokeywords: cat.seokeywords,
        seodescription: cat.seodescription,
        published: cat.published,
      });
      const catId = savedCat.id;

      for (const sub of cat.subcategories) {
        const savedSub = await postJSON(SUB_URL, {
          name: sub.name,
          imagepath: sub.imagepath,
          metatitle: sub.metatitle,
          ispublished: sub.ispublished,
          description: sub.description,
          metadescription: sub.metadescription,
          seokeywords: sub.seokeywords,
          categoryIds: [catId],
        });
        const subId = savedSub.id;

        for (const prod of sub.products) {
          await postJSON(PROD_URL, {
            name: prod.name,
            description: prod.description,
            mainimage: prod.mainimage,
            producttags: prod.producttags,
            filter: prod.filter,
            metatitle: prod.metatitle,
            metadescription: prod.metadescription,
            pagekeywords: prod.pagekeywords,
            ispublished: prod.ispublished,
            variantsMap: JSON.stringify(prod.variantsMap),
            subcategoryIds: [subId],
          });
        }
      }
    }

    alert("✅ All data created successfully!");
  } catch (err) {
    console.error(err);
    alert("❌ Operation failed: " + err.message);
  }
}

/* ---------------------------- helpers ------------------------------ */
const postJSON = (url, obj) =>
  fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(obj),
  }).then((r) => {
    if (!r.ok) throw new Error(`${url} → ${r.status}`);
    return r.json();
  });
