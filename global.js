const categoryUrl = "https://joyful-backend-backend-production.up.railway.app/categories";
const subcategoryUrl = "https://joyful-backend-backend-production.up.railway.app/subcategories";
const productUrl = "https://joyful-backend-backend-production.up.railway.app/products";
const enquiryUrl = "https://joyful-backend-backend-production.up.railway.app/enquiries";

async function loadCategoryCount() {
  try {
    const res = await fetch(categoryUrl);
    const data = await res.json();
    document.getElementById(
      "categoryCount"
    ).textContent = `Categories: ${data.length}`;
  } catch (error) {
    console.error("Failed to load categories:", error);
  }
}

async function loadSubcategoryCount() {
  try {
    const res = await fetch(subcategoryUrl);
    const data = await res.json();
    document.getElementById(
      "subcategoryCount"
    ).textContent = `Subcategories: ${data.length}`;
  } catch (error) {
    console.error("Failed to load subcategories:", error);
  }
}

async function loadProductCount() {
  try {
    const res = await fetch(productUrl);
    const data = await res.json();
    document.getElementById(
      "productCount"
    ).textContent = `Products: ${data.length}`;
  } catch (error) {
    console.error("Failed to load products:", error);
  }
}

async function loadEnquiryCount() {
  try {
    const res = await fetch(enquiryUrl);
    const json = await res.json();

    console.log("Enquiry JSON response:", json); // 👈 Add this

    if (!json.success) throw new Error(json.message);

    const enquiries = json.data;
    console.log("Enquiries array:", enquiries); // 👈 See what you get

    document.getElementById(
      "enquiryCount"
    ).textContent = `Enquiries: ${enquiries.length}`;
  } catch (error) {
    console.error("Failed to load enquiries:", error);
  }
}

loadCategoryCount();
loadSubcategoryCount();
loadProductCount();
loadEnquiryCount();
