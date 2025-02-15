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
  writeBatch,
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

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const fetchProducts = async () => {
    try {
      const productsSnapshot = await getDocs(collection(db, "Products"));
      const productsList = productsSnapshot.docs.map((pDoc) => {
        const data = pDoc.data();
        return {
          docId: pDoc.id,
          ...data,
          variants:
            data.variants?.map((variant, index) => ({
              id: index, // Firebase doesn't store an ID, so use index
              productid: pDoc.id, // Ensure it links to the product
              name: variant.name || "",
              price: variant.price || 0,
              discountedPrice: variant.discounted_price || 0, // Rename mrp
              isAvailable: variant.isAvailable ?? false, // Rename is_active
            })) || [],
        };
      });
      setProducts(productsList);
    } catch (error) {
      console.error("Error fetching products:", error);
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
      name: "",
      description: "",
      category_id: "",
      base_price: 0,
      discounted_price: 0,
      is_active: true,
      is_featured: false,
      images: [],
      variants: [{ name: "", price: 0, mrp: 0, stock: 0, is_active: true }],
    });
    setIsAddingProduct(true);
  };

  const handleSaveProduct = async (product) => {
    try {
      const formattedProduct = {
        ...product,
        variants: product.variants.map((variant) => ({
          name: variant.name,
          price: variant.price,
          discounted_price: variant.discountedPrice, // Convert back
          isAvailable: variant.isAvailable, // Convert back
        })),
      };

      if (isAddingProduct) {
        await addDoc(collection(db, "Products"), formattedProduct);
      } else {
        await updateDoc(doc(db, "Products", product.docId), formattedProduct);
      }

      await fetchProducts();
      setSelectedProduct(null);
      setIsAddingProduct(false);
      toast.success("Product saved successfully");
    } catch (error) {
      console.error("Error saving product:", error);
      toast.error("Failed to save product");
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
                      key={product.docId}
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
                              Arabic Name
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
                            />
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

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Arabic Description
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
                            Rating
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
                                    className="border border-gray-300 p-2 rounded w-full"
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
                                    checked={variant.is_active}
                                    onChange={(checked) =>
                                      handleUpdateVariant(
                                        index,
                                        "is_active",
                                        checked
                                      )
                                    }
                                    className={`${
                                      variant.is_active
                                        ? "bg-green-600"
                                        : "bg-gray-200"
                                    } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none`}
                                  >
                                    <span
                                      className={`${
                                        variant.is_active
                                          ? "translate-x-6"
                                          : "translate-x-1"
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
                            onClick={handleAddImage}
                            className="bg-white text-green-600 hover:bg-green-50 px-4 py-2 rounded-lg flex items-center border border-green-600"
                          >
                            <Plus size={16} className="mr-2" />
                            Add Image
                          </button>
                        </div>
                        <div className="grid grid-cols-4 gap-4">
                          {selectedProduct.images.map((image, index) => (
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
                          ))}
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
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
