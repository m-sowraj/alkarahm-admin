import { useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import {
  Search,
  Plus,
  Edit,
  X,
  Trash2,
  Download,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import Sidebar from "../../components/admin/sidebar";
import { uploadImage } from "../../firebase/image";
import { Switch } from "@headlessui/react";
import { toast } from "react-hot-toast";
import { db } from "../../firebase/firebase.js";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  getDoc,
  writeBatch
} from "firebase/firestore";

export default function ProductManagement() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [sortField, setSortField] = useState("name");
  const [sortDirection, setSortDirection] = useState("asc");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  // ------------------------------------------
  // Fetch Data
  // ------------------------------------------
  const fetchProducts = async () => {
    try {
      // 1) Fetch Categories
      const categoriesSnapshot = await getDocs(collection(db, "category"));
      const categoryMap = {};
      categoriesSnapshot.forEach((catDoc) => {
        const catData = catDoc.data();
        categoryMap[catData.id] = catData.name;
      });

      // 2) Fetch Product Variants
      const variantsSnapshot = await getDocs(collection(db, "PRODUCT_VARIANT"));
      const variantsMap = {};
      variantsSnapshot.forEach((variantDoc) => {
        const variantData = variantDoc.data();
        const productId = variantData.product_id?.toString() || "";
        if (!variantsMap[productId]) {
          variantsMap[productId] = [];
        }
        variantsMap[productId].push({ id: variantDoc.id, ...variantData });
      });

      // 3) Fetch Products
      const productsSnapshot = await getDocs(collection(db, "Products"));
      const productsList = productsSnapshot.docs.map((pDoc) => {
        const data = pDoc.data();
        // Firestore doc ID (random string) => pDoc.id
        // "data.id" might be an internal numeric ID, if it exists.
        return {
          docId: pDoc.id, // The actual Firestore doc ID
          ...data,
          category_name: categoryMap[data.category_id] || "Unknown",
          // Map variants by that numeric "id" if needed:
          variants: variantsMap[String(data.id)] || [],
          // Fallback image if none provided
          imageUrl: data.imageUrl?.trim() ? data.imageUrl : "/placeholder.png",
        };
      });

      setProducts(productsList);
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  };

  const handleOpenModal = (product = null) => {
    if (product) {
      setSelectedProduct(product);
      setIsAddingProduct(false);
    } else {
      handleAddProduct();
    }
    setModalOpen(true);
  };
   
  const fetchCategories = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "category"));
      const categoriesList = querySnapshot.docs.map((catDoc) => ({
        id: catDoc.id,
        ...catDoc.data(),
      }));
      setCategories(categoriesList);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  // ------------------------------------------
  // Clicking a product row => open in modal
  // ------------------------------------------
  const handleProductClick = async (product) => {
    // product.docId is the Firestore doc ID
    try {
      // If you need to fetch updated variants from "PRODUCT_VARIANT", do so here:
      const querySnapshot = await getDocs(collection(db, "PRODUCT_VARIANT"));
      const variants = querySnapshot.docs
        .map((doc) => doc.data())
        .filter((variant) => {
          // If your "variant.product_id" references data.id (numeric) instead of docId
          // Make sure it matches properly:
          return String(variant.product_id) === String(product.id);
        });

      setSelectedProduct({
        ...product,
        variants,
      });
      setIsAddingProduct(false);
      setModalOpen(true);
    } catch (error) {
      console.error("Error fetching product variants:", error);
    }
  };

  // ------------------------------------------
  // Add New Product
  // ------------------------------------------
  const handleAddProduct = () => {
    // Reset selected product with empty fields
    setSelectedProduct({
      // If you want to store a numeric "id" inside the doc, do it here:
      // id: 123,
      name: "",
      description: "",
      category_id: "",
      base_price: 0,
      discounted_price: 0,
      is_active: true,
      is_featured: false,
      images: [],
      variants: [
        { name: "", price: 0, mrp: 0, stock: 0, is_active: true },
      ],
    });
    setIsAddingProduct(true);
    setModalOpen(true);
  };

  // ------------------------------------------
  // Save Product (Add or Update)
  // ------------------------------------------
  const handleSaveProduct = async (product) => {
    try {
      // Must have at least one variant
      if (!product.variants || product.variants.length === 0) {
        toast.error("Product must have at least one variant");
        return;
      }

      // If the product is active, ensure there's at least one active variant
      const hasActiveVariant = product.variants.some((v) => v.is_active);
      if (product.is_active && !hasActiveVariant) {
        toast.error("Product cannot be active without at least one active variant");
        return;
      }

      // If no active variants, force product to inactive
      if (!hasActiveVariant) {
        product.is_active = false;
      }

      // Decide whether to addDoc or updateDoc
      if (isAddingProduct) {
        // Add new product
        const docRef = await addDoc(collection(db, "Products"), {
          ...product,
        });
        // docRef.id is the new Firestore doc ID
      } else {
        // Update existing product using its Firestore doc ID
        // Note that we stored it in "product.docId"
        if (!product.docId) {
          throw new Error("No docId found for product update!");
        }
        await updateDoc(doc(db, "Products", product.docId), {
          ...product,
        });
      }

      // Refresh
      await fetchProducts();
      setSelectedProduct(null);
      setIsAddingProduct(false);
      setModalOpen(false);
      toast.success("Product saved successfully");
    } catch (error) {
      console.error("Error saving product:", error);
      toast.error("Failed to save product");
    }
  };

  // ------------------------------------------
  // Toggling status from table
  // ------------------------------------------
  const handleStatusToggle = async (product) => {
    try {
      if (!product.docId) {
        toast.error("Invalid product reference.");
        return;
      }
  
      // Convert docId to string before referencing Firestore
      const productRef = doc(db, "Products", String(product.docId));
      const productSnapshot = await getDoc(productRef);
  
      if (!productSnapshot.exists()) {
        toast.error("Product does not exist.");
        return;
      }
  
      // Toggle the is_active status
      const updatedProduct = { ...product, is_active: !product.is_active };
  
      await updateDoc(productRef, { is_active: updatedProduct.is_active });
  
      // Update UI state
      setProducts((prevProducts) =>
        prevProducts.map((p) =>
          p.docId === product.docId ? updatedProduct : p
        )
      );
  
      toast.success(
        `Product ${updatedProduct.is_active ? "activated" : "deactivated"} successfully`
      );
    } catch (error) {
      console.error("Error updating product status:", error);
      toast.error("Failed to update product status");
    }
  };

  // ------------------------------------------
  // Toggling status inside the modal
  // ------------------------------------------
  
  const handleProductActiveToggle = async (checked) => {
    if (!selectedProduct) return;

    try {
        const productRef = doc(db, "Products", String(selectedProduct.docId));
        const productSnapshot = await getDoc(productRef);

        if (!productSnapshot.exists()) {
            toast.error("Product does not exist.");
            return;
        }

        let updatedVariants = [...selectedProduct.variants];

        if (updatedVariants.length === 0) {
            // If no variants exist, product must be inactive
            checked = false;
        } else {
            // If activating, ensure at least one variant is active
            const hasActiveVariant = updatedVariants.some((variant) => variant.is_active);
            if (!hasActiveVariant) {
                checked = false; // Product cannot be active if all variants are inactive
            }

            // If deactivating, update only `is_active` field for each variant
            if (!checked) {
                updatedVariants = updatedVariants.map((variant) => ({
                    ...variant,
                    is_active: false,
                }));
            }
        }

        // Update product `is_active` in Firestore
        await updateDoc(productRef, { is_active: checked });

        // Update each variant separately to avoid overwriting the array
        for (let variant of updatedVariants) {
            const variantRef = doc(db, "Products", String(selectedProduct.docId)); // Same productRef
            await updateDoc(variantRef, {
                [`variants.${variant.id}.is_active`]: variant.is_active, // Update only `is_active` for each variant
            });
        }

        // Update UI state
        setSelectedProduct((prev) => ({
            ...prev,
            is_active: checked,
            variants: updatedVariants,
        }));

        setProducts((prevProducts) =>
            prevProducts.map((p) =>
                p.docId === selectedProduct.docId
                    ? { ...p, is_active: checked, variants: updatedVariants }
                    : p
            )
        );

        toast.success(`Product ${checked ? "activated" : "deactivated"} successfully`);
    } catch (error) {
        console.error("Error updating product status:", error);
        toast.error("Failed to update product status");
    }
};
  // ------------------------------------------
  // Variants
  // ------------------------------------------
  const handleAddVariant = () => {
    setSelectedProduct((prev) => ({
      ...prev,
      variants: [
        ...prev.variants,
        { name: "", price: 0, mrp: 0, stock: 0, is_active: true },
      ],
    }));
  };

  const handleUpdateVariant = (index, field, value) => {
    const updated = [...selectedProduct.variants];
    updated[index] = { ...updated[index], [field]: value };
    setSelectedProduct((prev) => ({ ...prev, variants: updated }));
  };

  const handleRemoveVariant = (index) => {
    const updated = selectedProduct.variants.filter((_, i) => i !== index);
    setSelectedProduct((prev) => ({ ...prev, variants: updated }));
  };

  const moveVariantUp = (index) => {
    if (index <= 0) return;
    const updated = [...selectedProduct.variants];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    setSelectedProduct((prev) => ({ ...prev, variants: updated }));
  };

  const moveVariantDown = (index) => {
    if (index >= selectedProduct.variants.length - 1) return;
    const updated = [...selectedProduct.variants];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    setSelectedProduct((prev) => ({ ...prev, variants: updated }));
  };

  // ------------------------------------------
  // Images
  // ------------------------------------------
  const handleAddImage = () => {
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "image/*";
    fileInput.onchange = async (e) => {
      try {
        const file = e.target.files[0];
        if (!file) return;
        const imageUrl = await uploadImage(file, "products");
        setSelectedProduct((prev) => ({
          ...prev,
          images: [...prev.images, imageUrl],
        }));
      } catch (error) {
        console.error("Error uploading image:", error);
      }
    };
    fileInput.click();
  };

  const handleRemoveImage = (index) => {
    setSelectedProduct((prev) => {
      const updated = [...prev.images];
      updated.splice(index, 1);
      return { ...prev, images: updated };
    });
  };

  // ------------------------------------------
  // Sorting
  // ------------------------------------------
  const sortProducts = (list) => {
    return [...list].sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      // Sort by category name
      if (sortField === "category") {
        const aCat = categories.find((c) => c.id === a.category_id);
        const bCat = categories.find((c) => c.id === b.category_id);
        aValue = aCat?.name || "";
        bValue = bCat?.name || "";
      }

      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      return 0;
    });
  };

  // ------------------------------------------
  // Export
  // ------------------------------------------
  const handleExportToExcel = () => {
    const csvData = filteredProducts.map((product) => ({
      Name: product.name,
      Category:
        categories.find((c) => c.id === product.category_id)?.name || "-",
      Status: product.is_active ? "Active" : "Inactive",
      Variants: product.variants?.length || 0,
      Description: product.description,
    }));

    if (!csvData.length) {
      toast.error("No products to export");
      return;
    }

    const csvRows = [];
    // headers
    csvRows.push(Object.keys(csvData[0]).join(","));
    // values
    csvData.forEach((row) => {
      csvRows.push(
        Object.values(row)
          .map((val) => `"${val}"`)
          .join(",")
      );
    });

    const csvContent = csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `products-${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ------------------------------------------
  // Filters
  // ------------------------------------------
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = categoryFilter
      ? p.category_id === categoryFilter
      : true;

    const matchesStatus =
      statusFilter === "all"
        ? true
        : p.is_active === (statusFilter === "active");

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const sortedProducts = sortProducts(filteredProducts);
  
  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Fixed Header */}
        <header className="bg-gray-50 z-10">
          <div className="px-6 py-4">
            <div className="flex flex-col space-y-4">
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-semibold text-gray-800">
                  Products
                </h1>
                <div className="flex items-center space-x-4">
                  <button
                    onClick={handleAddProduct}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center transition-colors duration-200"
                  >
                    <Plus size={20} className="mr-2" />
                    Add Product
                  </button>
                  <button
                    onClick={handleExportToExcel}
                    className="bg-gray-800 hover:bg-gray-900 text-white px-4 py-2 rounded-lg flex items-center transition-colors duration-200"
                  >
                    <Download size={20} className="mr-2" />
                    Export
                  </button>
                </div>
              </div>

              {/* Filters Section */}
              <div className="flex items-center space-x-4">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                  <Search
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                    size={20}
                  />
                </div>

                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="border border-gray-300 rounded-lg p-2 min-w-[150px] focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="">All Categories</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="border border-gray-300 rounded-lg p-2 min-w-[120px] focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-hidden bg-gray-100 p-6">
          <div className="bg-white rounded-lg shadow h-full flex flex-col">
            {/* Table Header */}
            <div className="bg-gray-50 border-b border-gray-200">
              <div className="grid grid-cols-4 px-6 py-3">
                {["Name", "Category", "Status", "Actions"].map(
                  (header, index) => (
                    <div
                      key={header}
                      onClick={() => {
                        const field = header.toLowerCase();
                        if (sortField === field) {
                          setSortDirection(
                            sortDirection === "asc" ? "desc" : "asc"
                          );
                        } else {
                          setSortField(field);
                          setSortDirection("asc");
                        }
                      }}
                      className={`text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 flex items-center ${
                        index === 3 ? "justify-end" : ""
                      }`}
                    >
                      <span>{header}</span>
                      {sortField === header.toLowerCase() && (
                        <span className="ml-2 text-gray-400">
                          {sortDirection === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </div>
                  )
                )}
              </div>
            </div>

            {/* Scrollable Table Body */}
            <div className="flex-1 overflow-auto">
              {sortedProducts.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-500">
                  No products found
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {sortedProducts.map((product) => (
                    <div
                      key={product.id}
                      className="grid grid-cols-4 px-6 py-4 hover:bg-gray-50 cursor-pointer"
                    >
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0">
                          <img
                            src={product.imageUrl || "/placeholder.png"}
                            alt={product.name || "Product Image"}
                            onError={(e) => (e.target.src = "/placeholder.png")}
                          />
                        </div>
                        <div className="ml-4">
                          <div className="font-medium text-gray-900">
                            {product.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {product.variants?.map((v) => v.name).join(", ") ||
                              "None"}{" "}
                            variants
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center text-sm text-gray-500">
                        {product.category_name}
                      </div>
                       {/* Toggle switch (updates Firebase and UI) */}
                       <div className="flex items-center">
                    <Switch
                      checked={product.is_active}
                      onChange={() => handleStatusToggle(product)}
                      className={`${product.is_active ? "bg-green-600" : "bg-gray-200"} relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2`}
                    >
                      <span className={`${product.is_active ? "translate-x-6" : "translate-x-1"} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`} />
                    </Switch>
                  </div>
                      <div className="flex items-center justify-end">
                      <button
                      onClick={() => handleOpenModal(product)}
                      className="text-gray-600 hover:text-gray-900 p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                    >
                      <Edit size={18} />
                    </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {(selectedProduct || isAddingProduct) && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 transition-opacity"
              aria-hidden="true"
            >
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
              <div className="bg-white">
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-800">
                    {isAddingProduct ? "Add New Product" : "Edit Product"}
                  </h2>
                  <button
                    onClick={() => {
                      setSelectedProduct(null);
                      setIsAddingProduct(false);
                    }}
                    className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="p-6">
                  {selectedProduct && (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleSaveProduct(selectedProduct);
                      }}
                    >
                      <div className="space-y-6">
                        {/* Basic Info */}
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <h3 className="text-lg font-medium text-gray-900 mb-4">
                            Basic Information
                          </h3>
                          <div className="grid grid-cols-2 gap-6">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Name
                              </label>
                              <input
                                type="text"
                                value={selectedProduct.name}
                                onChange={(e) =>
                                  setSelectedProduct({
                                    ...selectedProduct,
                                    name: e.target.value,
                                  })
                                }
                                className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Category
                              </label>
                              <select
                                value={selectedProduct.category_id}
                                onChange={(e) =>
                                  setSelectedProduct({
                                    ...selectedProduct,
                                    category_id: e.target.value,
                                  })
                                }
                                className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                              >
                                <option value="">Select a category</option>
                                {categories.map((category) => (
                                  <option key={category.id} value={category.id}>
                                    {category.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Description
                            </label>
                            <textarea
                              value={selectedProduct.description}
                              onChange={(e) =>
                                setSelectedProduct({
                                  ...selectedProduct,
                                  description: e.target.value,
                                })
                              }
                              className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                              rows="3"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-6">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Base Price
                              </label>
                              <input
                                type="number"
                                value={selectedProduct.base_price}
                                onChange={(e) =>
                                  setSelectedProduct({
                                    ...selectedProduct,
                                    base_price: parseFloat(e.target.value),
                                  })
                                }
                                className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Discounted Price
                              </label>
                              <input
                                type="number"
                                value={selectedProduct.discounted_price}
                                onChange={(e) =>
                                  setSelectedProduct({
                                    ...selectedProduct,
                                    discounted_price: parseFloat(
                                      e.target.value
                                    ),
                                  })
                                }
                                className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                              />
                            </div>
                          </div>

                          <div className="flex space-x-6">
                            <div className="flex items-center">
                              <label className="mr-3 text-sm font-medium text-gray-700">
                                Active
                              </label>
                              <Switch
                        checked={selectedProduct.is_active}
                        onChange={handleProductActiveToggle}
                        className={`${
                            selectedProduct.is_active ? "bg-green-600" : "bg-gray-200"
                        } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none`}
                    >
                        <span
                            className={`${
                                selectedProduct.is_active ? "translate-x-6" : "translate-x-1"
                            } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                        />
                    </Switch>
                            </div>

                            <div className="flex items-center">
                              <label className="mr-3 text-sm font-medium text-gray-700">
                                Featured
                              </label>
                              <Switch
                                checked={selectedProduct.is_featured}
                                onChange={(checked) =>
                                  setSelectedProduct({
                                    ...selectedProduct,
                                    is_featured: checked,
                                  })
                                }
                                className={`${
                                  selectedProduct.is_featured
                                    ? "bg-green-600"
                                    : "bg-gray-200"
                                } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none`}
                              >
                                <span
                                  className={`${
                                    selectedProduct.is_featured
                                      ? "translate-x-6"
                                      : "translate-x-1"
                                  } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                                />
                              </Switch>
                            </div>
                          </div>
                        </div>

                        {/* Variants */}
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-medium text-gray-900">
                              Product Variants
                            </h3>
                            <button
                              type="button"
                              onClick={handleAddVariant}
                              className="bg-white text-green-600 hover:bg-green-50 px-4 py-2 rounded-lg flex items-center border border-green-600"
                            >
                              <Plus size={16} className="mr-2" />
                              Add Variant
                            </button>
                          </div>
                          <div className="space-y-4">
                            {selectedProduct.variants.map((variant, index) => (
                              <div
                                key={index}
                                className="bg-gray-50 p-4 rounded-lg"
                              >
                                <div className="flex justify-between items-start mb-4">
                                  <h4 className="text-sm font-medium text-gray-700">
                                    Variant {index + 1}
                                  </h4>
                                  <div className="flex items-center space-x-2">
                                    <button
                                      type="button"
                                      onClick={() => moveVariantUp(index)}
                                      disabled={index === 0}
                                      className={`p-1.5 rounded-full transition-colors duration-200 ${
                                        index === 0
                                          ? "text-gray-300 cursor-not-allowed"
                                          : "text-green-600 hover:bg-green-50"
                                      }`}
                                      title="Move up"
                                    >
                                      <ChevronUp size={18} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => moveVariantDown(index)}
                                      disabled={
                                        index ===
                                        selectedProduct.variants.length - 1
                                      }
                                      className={`p-1.5 rounded-full transition-colors duration-200 ${
                                        index ===
                                        selectedProduct.variants.length - 1
                                          ? "text-gray-300 cursor-not-allowed"
                                          : "text-green-600 hover:bg-green-50"
                                      }`}
                                      title="Move down"
                                    >
                                      <ChevronDown size={18} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveVariant(index)}
                                      className="text-red-500 hover:text-red-700 p-1.5 rounded-full hover:bg-red-50 transition-colors duration-200"
                                      title="Remove variant"
                                    >
                                      <Trash2 size={18} />
                                    </button>
                                  </div>
                                </div>

                                <div className="grid grid-cols-4 gap-4">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      Name
                                    </label>
                                    <input
                                      type="text"
                                      value={variant.name}
                                      onChange={(e) =>
                                        handleUpdateVariant(
                                          index,
                                          "name",
                                          e.target.value
                                        )
                                      }
                                      className="w-full border border-gray-300 rounded-lg p-2.5"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      Price
                                    </label>
                                    <input
                                      type="number"
                                      value={variant.price}
                                      onChange={(e) =>
                                        handleUpdateVariant(
                                          index,
                                          "price",
                                          parseFloat(e.target.value)
                                        )
                                      }
                                      className="w-full border border-gray-300 rounded-lg p-2.5"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      MRP
                                    </label>
                                    <input
                                      type="number"
                                      value={variant.mrp}
                                      onChange={(e) =>
                                        handleUpdateVariant(
                                          index,
                                          "mrp",
                                          parseFloat(e.target.value)
                                        )
                                      }
                                      className="w-full border border-gray-300 rounded-lg p-2.5"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      Active
                                    </label>
                                    <Switch
    checked={selectedProduct?.is_active}
    onChange={(checked) => handleProductActiveToggle(checked)}
    className={`${
        selectedProduct?.is_active ? "bg-green-600" : "bg-gray-200"
    } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none`}
>
    <span
        className={`${
            selectedProduct?.is_active ? "translate-x-6" : "translate-x-1"
        } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
    />
</Switch>


                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Images */}
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-medium text-gray-900">
                              Product Images
                            </h3>
                            <button
                              type="button"
                              onClick={() => handleAddImage("images")}
                              className="bg-white text-green-600 hover:bg-green-50 px-4 py-2 rounded-lg flex items-center border border-green-600"
                            >
                              <Plus size={16} className="mr-2" />
                              Add Image
                            </button>
                          </div>
                          <div className="grid grid-cols-4 gap-4">
                            {selectedProduct?.images?.length > 0 ? (
                              selectedProduct.images.map((image, index) => (
                                <div key={index} className="relative">
                                  <img
                                    src={image}
                                    alt={`Product ${index + 1}`}
                                    className="w-full h-24 object-cover rounded-lg"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveImage(index)}
                                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                              ))
                            ) : (
                              <p className="text-gray-500">
                                No images available
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="mt-6 flex justify-end pt-6">
                        <button
                          type="submit"
                          className="bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors duration-200"
                        >
                          Save Product
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
