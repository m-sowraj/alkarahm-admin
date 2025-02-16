import { useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { Search, Plus, Edit, X, Trash2 } from "lucide-react";
import Sidebar from "../../components/admin/sidebar";
import { uploadImage } from "../../firebase/image";
import { Switch } from "@headlessui/react";
import { toast } from "react-hot-toast";
import { db } from "../../firebase/firebase.js";
import { useLanguage } from "../../LanguageContext.js";

import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  writeBatch,
  query,
  where,
} from "firebase/firestore";
import placeholder from "../../images/placeholder.svg";

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
  const { language } = useLanguage();

  const translations = {
    en: {
      arabicDescription: "Arabic Description",
      rating: "Rating",
      category: "Category",
      selectCategory: "Select a category",
      variants: "Variants",
      variantName: "Variant Name",
      price: "Price",
      available: "Available",
      discountedPrice: "Discounted Price",
      delete: "Delete",
      addVariant: "Add Variant",
      productImages: "Product Images",
      addImage: "Add Image",
      imageUrl: "Image URL",
      saveProduct: "Save Product",
      productInformation: "Product Information",
      actions: "Actions",
      products: "Products",
      addProduct: "Add Product",
      searchProducts: "Search products...",
      allCategories: "All Categories",
      allStatus: "All Status",
      active: "Active",
      inactive: "Inactive",
      tableHeaders: ["Name", "Category", "Status", "Featured", "Actions"],
      noProductsFound: "No products found",
      basicInformation: "Basic Information",
      name: "Name",
      arabicName: "Arabic Name",
      description: "Description",
    },
    ar: {
      products: "المنتجات",
      addProduct: "إضافة منتج",
      searchProducts: "ابحث عن المنتجات...",
      allCategories: "كل الفئات",
      allStatus: "كل الحالات",
      active: "نشط",
      inactive: "غير نشط",
      tableHeaders: ["الاسم", "الفئة", "الحالة", "مميز", "الإجراءات"],
      noProductsFound: "لم يتم العثور على منتجات",
      basicInformation: "المعلومات الأساسية",
      name: "الاسم",
      arabicName: "الاسم بالعربية",
      description: "الوصف",
      arabicDescription: "الوصف بالعربية",
      rating: "التقييم",
      category: "الفئة",
      selectCategory: "اختر فئة",
      variants: "الخيارات",
      variantName: "اسم الخيار",
      price: "السعر",
      available: "متوفر",
      discountedPrice: "السعر بعد الخصم",
      delete: "حذف",
      addVariant: "إضافة خيار",
      productImages: "صور المنتج",
      addImage: "إضافة صورة",
      imageUrl: "رابط الصورة",
      saveProduct: "حفظ المنتج",
      productInformation: "معلومات المنتج",
      actions: "الإجراءات",
    },
  };

  const t = translations[language] || translations.en;

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const fetchProducts = async () => {
    try {
      console.log("Fetching products...");

      // ✅ Fetch all products
      const productsSnapshot = await getDocs(collection(db, "Products"));
      if (productsSnapshot.empty) {
        console.warn("No products found in Firestore.");
        setProducts([]);
        return;
      }

      // ✅ Fetch all variants
      const variantsSnapshot = await getDocs(collection(db, "PRODUCT_VARIANT"));
      const variantsMap = {};

      // ✅ Group variants by product_id
      variantsSnapshot.docs.forEach((vDoc) => {
        const variantData = vDoc.data();
        if (!variantsMap[variantData.product_id]) {
          variantsMap[variantData.product_id] = [];
        }
        variantsMap[variantData.product_id].push({
          id: vDoc.id,
          ...variantData,
        });
      });

      const productsList = productsSnapshot.docs.map((pDoc) => {
        const productData = pDoc.data();
        return {
          docId: pDoc.id,
          ...productData,
          variants: variantsMap[pDoc.id] || [], // Attach variants to their respective product
        };
      });

      setProducts(productsList);
    } catch (error) {
      console.error("Error fetching products:", error);
      toast.error("Failed to fetch products");
    }
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

  const handleAddProduct = () => {
    setSelectedProduct({
      id: "",
      docId: "",
      name: "",
      arabic_name: "",
      description: "",
      arabic_description: "",
      category_id: "",
      category_name: "", // ✅ Added category_name
      is_active: true,
      is_featured: false,
      imageUrl: "",
      rating: 0, // ✅ Ensure rating is included
      variants: [
        {
          id: "", // ✅ Will be assigned when saved in PRODUCT_VARIANT
          product_id: "", // ✅ Will store product document ID
          name: "",
          price: 0,
          discounted_price: 0,
          isAvailable: true,
        },
      ],
    });
    setIsAddingProduct(true);
  };

  const handleSaveProduct = async (product) => {
    try {
      // Prepare the product data without variants
      const productData = {
        name: product.name,
        arabic_name: product.arabic_name,
        description: product.description,
        arabic_description: product.arabic_description,
        category_id: product.category_id,
        category_name: product.category_name,
        is_active: product.is_active,
        is_featured: product.is_featured,
        imageUrl: product.imageUrl,
        rating: product.rating || 0,
      };
  
      let productRef;
      if (isAddingProduct) {
        // Add new product
        productRef = await addDoc(collection(db, "Products"), productData);
        await updateDoc(productRef, { id: productRef.id, docId: productRef.id }); // ✅ Assign docId as string
      } else {
        // Update existing product
        productRef = doc(db, "Products", product.docId);
        await updateDoc(productRef, { ...productData, docId: product.docId }); // ✅ Ensure docId is updated
      }
  
      // Handle variants separately in PRODUCT_VARIANT collection
      const batch = writeBatch(db);
  
      // If updating, first delete existing variants
      if (!isAddingProduct) {
        const variantsQuery = query(
          collection(db, "PRODUCT_VARIANT"),
          where("product_id", "==", product.docId)
        );
        const existingVariants = await getDocs(variantsQuery);
        existingVariants.docs.forEach((variantDoc) => {
          batch.delete(doc(db, "PRODUCT_VARIANT", variantDoc.id));
        });
      }
  
      // Add new variants
      product.variants.forEach((variant) => {
        const variantRef = doc(collection(db, "PRODUCT_VARIANT"));
        batch.set(variantRef, {
          id: variantRef.id,
          product_id: isAddingProduct ? productRef.id : product.docId,
          name: variant.name,
          price: variant.price,
          discounted_price: variant.discounted_price,
          isAvailable: variant.isAvailable ?? false,
        });
      });
  
      await batch.commit();
      await fetchProducts();
      setSelectedProduct(null);
      setIsAddingProduct(false);
      toast.success("Product saved successfully");
    } catch (error) {
      console.error("Error saving product:", error);
      toast.error("Failed to save product");
    }
  };
  const handleFeaturedToggle = async (product) => {
    try {
      const productRef = doc(db, "Products", product.docId);
      await updateDoc(productRef, { is_featured: !product.is_featured });
      await fetchProducts();
      toast.success(
        `Product ${
          !product.is_featured ? "Featured" : "Unfeatured"
        } successfully`
      );
    } catch (error) {
      console.error("Error updating product status:", error);
      toast.error("Failed to update product status");
    }
  };

  const handleStatusToggle = async (product) => {
    try {
      const productRef = doc(db, "Products", product.docId);
      await updateDoc(productRef, { is_active: !product.is_active });
      await fetchProducts();
      toast.success(
        `Product ${
          !product.is_active ? "activated" : "deactivated"
        } successfully`
      );
    } catch (error) {
      console.error("Error updating product status:", error);
      toast.error("Failed to update product status");
    }
  };

  const sortProducts = (list) => {
    return [...list].sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      return 0;
    });
  };

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

  const handleAddVariant = () => {
    setSelectedProduct((prev) => ({
      ...prev,
      variants: [
        ...prev.variants,
        {
          id: prev.variants.length + 1,
          productid: prev.docId || "", // Set product ID if available
          name: "",
          price: 0,
          discounted_price: 0,
          isAvailable: true,
        },
      ],
    }));
  };

  const handleUpdateVariant = (index, field, value) => {
    setSelectedProduct((prev) => ({
      ...prev,
      variants: prev.variants.map((v, i) =>
        i === index ? { ...v, [field]: value } : v
      ),
    }));
  };

  const handleRemoveVariant = (index) => {
    setSelectedProduct((prev) => ({
      ...prev,
      variants: prev.variants.filter((_, i) => i !== index),
    }));
  };

  const handleAddImage = () => {
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "image/*";
    fileInput.onchange = async (e) => {
      try {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", "product_images");
        formData.append("cloud_name", "df3plfcau");

        const res = await fetch(
          `https://api.cloudinary.com/v1_1/df3plfcau/image/upload`,
          {
            method: "POST",
            body: formData,
          }
        );

        const data = await res.json();
        if (!data.secure_url) throw new Error("Image upload failed");

        setSelectedProduct((prev) => ({
          ...prev,
          imageUrl: data.secure_url,
        }));
      } catch (error) {
        console.error("Error uploading image:", error);
      }
    };
    fileInput.click();
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-gray-50 z-10">
          <div className="px-6 py-4">
            <div className="flex flex-col space-y-4">
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-semibold text-gray-800">
                  {t.products}
                </h1>
                <div className="flex items-center space-x-4">
                  <button
                    onClick={handleAddProduct}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center transition-colors duration-200"
                  >
                    <Plus size={20} className="mr-2" />
                    {t.addProduct}
                  </button>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder={t.searchProducts}
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
                  <option value="">{t.allCategories}</option>
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
                  <option value="all">{t.allStatus}</option>
                  <option value="active">{t.active}</option>
                  <option value="inactive">{t.inactive}</option>
                </select>
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-hidden bg-gray-100 p-6">
          <div className="bg-white rounded-lg shadow h-full flex flex-col">
            <div className="bg-gray-50 border-b border-gray-200">
              <div className="grid grid-cols-5 px-6 py-3">
                {t.tableHeaders.map((header, index) => (
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
                      index === 4 ? "justify-end" : ""
                    }`}
                  >
                    <span>{header}</span>
                    {sortField === header.toLowerCase() && (
                      <span className="ml-2 text-gray-400">
                        {sortDirection === "asc" ? "↑" : "↓"}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-auto">
              {sortedProducts.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-500">
                  {t.noProductsFound}
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {sortedProducts.map((product) => (
                    <div
                      key={product.docId}
                      className="grid grid-cols-5 px-6 py-4 hover:bg-gray-50 cursor-pointer"
                    >
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0">
                          <img
                            src={product.imageUrl || placeholder}
                            alt={product.name || "Product Image"}
                          />
                        </div>
                        <div className="ml-4">
                          <div className="font-medium text-gray-900">
                            {product.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {product.variants?.length > 0
                              ? `${product.variants.length} Variant(s)`
                              : "No Variants"}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center text-sm text-gray-500">
                        {product.category_name}
                      </div>
                      <div className="flex items-center">
                        <Switch
                          checked={product.is_active}
                          onChange={() => handleStatusToggle(product)}
                          className={`${
                            product.is_active ? "bg-green-600" : "bg-gray-200"
                          } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2`}
                        >
                          <span
                            className={`${
                              product.is_active
                                ? "translate-x-6"
                                : "translate-x-1"
                            } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                          />
                        </Switch>
                      </div>
                      <div className="flex items-center">
                        <Switch
                          checked={product.is_featured}
                          onChange={() => handleFeaturedToggle(product)}
                          className={`${
                            product.is_featured ? "bg-green-600" : "bg-gray-200"
                          } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2`}
                        >
                          <span
                            className={`${
                              product.is_featured
                                ? "translate-x-6"
                                : "translate-x-1"
                            } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                          />
                        </Switch>
                      </div>
                      <div className="flex items-center justify-end">
                        <button
                          onClick={() => {
                            setSelectedProduct(product);
                            setIsAddingProduct(false);
                          }}
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

        {selectedProduct && (
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
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleSaveProduct(selectedProduct);
                      }}
                    >
                      <div className="space-y-6">
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <h3 className="text-lg font-medium text-gray-900 mb-4">
                            {t.basicInformation}
                          </h3>
                          <div className="grid grid-cols-2 gap-6">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                {t.name}
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
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                {t.arabicName}
                              </label>
                              <input
                                type="text"
                                value={selectedProduct.arabic_name}
                                onChange={(e) =>
                                  setSelectedProduct({
                                    ...selectedProduct,
                                    arabic_name: e.target.value,
                                  })
                                }
                                className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                required
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              {t.description}
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

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              {t.arabicDescription}
                            </label>
                            <textarea
                              value={selectedProduct.arabic_description}
                              onChange={(e) =>
                                setSelectedProduct({
                                  ...selectedProduct,
                                  arabic_description: e.target.value,
                                })
                              }
                              className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                              rows="3"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              {t.rating}
                            </label>
                            <input
                              type="number"
                              value={selectedProduct.rating}
                              onChange={(e) =>
                                setSelectedProduct({
                                  ...selectedProduct,
                                  rating: parseFloat(e.target.value),
                                })
                              }
                              className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              {t.category}
                            </label>
                            <select
                              value={selectedProduct.category_id || ""}
                              onChange={(e) => {
                                const selectedCat = categories.find(
                                  (cat) => cat.id === e.target.value
                                );
                                setSelectedProduct({
                                  ...selectedProduct,
                                  category_id: selectedCat?.id || "",
                                  category_name: selectedCat?.name || "",
                                });
                              }}
                              className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            >
                              <option value="">{t.selectCategory}</option>
                              {categories.map((category) => (
                                <option key={category.id} value={category.id}>
                                  {category.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="mt-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1 mt-2">
                              {t.variants}
                            </label>
                            {selectedProduct.variants.map((variant, index) => (
                              <div
                                key={index}
                                className="grid grid-cols-4 gap-4 mb-2"
                              >
                                <div>
                                  <label>{t.variantName}</label>
                                  <input
                                    type="text"
                                    value={variant.name || ""}
                                    onChange={(e) => {
                                      const updatedVariants = [
                                        ...selectedProduct.variants,
                                      ];
                                      updatedVariants[index].name =
                                        e.target.value;
                                      setSelectedProduct({
                                        ...selectedProduct,
                                        variants: updatedVariants,
                                      });
                                    }}
                                    className="border border-gray-300 rounded-lg p-2.5 w-full"
                                  />
                                </div>
                                <div>
                                  <label>{t.price}</label>
                                  <input
                                    type="number"
                                    value={variant.price}
                                    onChange={(e) => {
                                      const updatedVariants = [
                                        ...selectedProduct.variants,
                                      ];
                                      updatedVariants[index].price = parseFloat(
                                        e.target.value
                                      );
                                      setSelectedProduct({
                                        ...selectedProduct,
                                        variants: updatedVariants,
                                      });
                                    }}
                                    className="border border-gray-300 rounded-lg p-2.5 w-full"
                                  />
                                </div>
                                <div className="flex flex-col items-center justify-center">
                                  <label className="text-sm text-gray-600 mb-2">
                                    {t.available}
                                  </label>
                                  <Switch
                                    checked={variant.isAvailable}
                                    onChange={() => {
                                      const updatedVariants = [
                                        ...selectedProduct.variants,
                                      ];
                                      updatedVariants[index].isAvailable =
                                        !variant.isAvailable;
                                      setSelectedProduct({
                                        ...selectedProduct,
                                        variants: updatedVariants,
                                      });
                                    }}
                                    className={`${
                                      variant.isAvailable
                                        ? "bg-green-600"
                                        : "bg-gray-200"
                                    } relative inline-flex h-6 w-11 items-center rounded-full transition-colors`}
                                  >
                                    <span
                                      className={`${
                                        variant.isAvailable
                                          ? "translate-x-6"
                                          : "translate-x-1"
                                      } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                                    />
                                  </Switch>
                                </div>
                                <div>
                                  <label>{t.discountedPrice}</label>
                                  <input
                                    type="number"
                                    value={variant.discounted_price}
                                    onChange={(e) => {
                                      const updatedVariants = [
                                        ...selectedProduct.variants,
                                      ];
                                      updatedVariants[index].discounted_price =
                                        parseFloat(e.target.value);
                                      setSelectedProduct({
                                        ...selectedProduct,
                                        variants: updatedVariants,
                                      });
                                    }}
                                    className="border border-gray-300 rounded-lg p-2.5 w-full"
                                  />
                                </div>
                                <button
                                type="button"
                                  onClick={() => {
                                    setSelectedProduct({
                                      ...selectedProduct,
                                      variants: selectedProduct.variants.filter(
                                        (_, i) => i !== index
                                      ),
                                    });
                                  }}
                                  className="text-white bg-red-500 rounded-full flex items-center justify-center w-fit px-5 py-0.5"
                                >
                                  {t.delete}
                                </button>
                                <button
                                 type="button"
                                  onClick={() => {
                                    setSelectedProduct({
                                      ...selectedProduct,
                                      variants: [
                                        ...selectedProduct.variants,
                                        {
                                          name: "",
                                          price: 0,
                                          discounted_price: 0,
                                        },
                                      ],
                                    });
                                  }}
                                  className="text-white bg-green-500 rounded-full flex items-center justify-center  w-fit px-5 py-0.5"
                                >
                                  {t.addVariant}
                                </button>
                              </div>
                            ))}
                          </div>
                          <div className="bg-gray-50 p-4 rounded-lg">
                            <div className="flex justify-between items-center mb-4">
                              <h3 className="text-lg font-medium text-gray-900">
                                {t.productImages}
                              </h3>
                              <button
                                type="button"
                                onClick={handleAddImage}
                                className="bg-white text-green-600 hover:bg-green-50 px-4 py-2 rounded-lg flex items-center border border-green-600"
                              >
                                <Plus size={16} className="mr-2" />
                                {t.addImage}
                              </button>
                            </div>
                            {/* Image URL */}
                            <div className="mb-3">
                              <label className="block text-sm font-medium text-gray-700">
                                {t.imageUrl}
                              </label>
                              <input
                                type="text"
                                name="imageUrl"
                                value={selectedProduct.imageUrl}
                                onChange={(e) =>
                                  setSelectedProduct((prev) => ({
                                    ...prev,
                                    imageUrl: e.target.value,
                                  }))
                                }
                                className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                              />
                            </div>
                          </div>

                          <div className=" flex justify-between  items-end px-1">
                          <div className="flex flex-col">
                          <label htmlFor="preview">Preview</label>
                          {selectedProduct?.imageUrl && (
                                
                                <img
                                        src={selectedProduct.imageUrl || placeholder}
                                        alt="Category Preview"
                                        className="w-40 h-20 object-cover rounded-md"
                                        name="preview"
                                      />
                              )}
                          </div>
                            <button
                              type="submit"
                              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors duration-200"
                            >
                              {t.saveProduct}
                            </button>
                          </div>
                        </div>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
