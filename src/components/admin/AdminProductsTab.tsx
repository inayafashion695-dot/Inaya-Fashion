import { Edit2, FolderPlus, Loader2, Plus, Trash2, Upload, X } from 'lucide-react';
import { useState } from 'react';
import {
  adminDeleteCategory,
  adminDeleteProduct,
  adminSaveCategory,
  adminSaveProduct,
  uploadImageToCloudinary,
} from '../../lib/api';
import type { Category, Product, ProductVariant } from '../../types/ecommerce';

interface AdminProductsTabProps {
  products: Product[];
  categories: Category[];
  onProductsChanged: (products: Product[]) => void;
  onCategoriesChanged: (categories: Category[]) => void;
  onToast: (msg: string, isError?: boolean) => void;
}

export function AdminProductsTab({
  products,
  categories,
  onProductsChanged,
  onCategoriesChanged,
  onToast,
}: AdminProductsTabProps) {
  const [editing, setEditing] = useState<Partial<Product> | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newCatName, setNewCatName] = useState('');
  const [sizesInput, setSizesInput] = useState('');

  const openCreate = () => {
    const defaultCat = categories[0];
    setSizesInput('S, M, L, XL');
    setEditing({
      name: '',
      slug: '',
      category_id: defaultCat?.id || null,
      category_name: defaultCat?.name || 'Knitwear',
      description: '',
      regular_price: 1450,
      discount_price: 1150,
      images: [],
      variants: [],
      sizes: ['S', 'M', 'L', 'XL'],
      stock_quantity: 25,
      is_available: true,
      is_featured: true,
      seo_title: '',
      seo_description: '',
    });
  };

  const openEdit = (p: Product) => {
    setSizesInput((p.sizes || []).join(', '));
    setEditing(structuredClone(p));
  };

  const handleFileUpload = async (files: FileList | null, variantIndex?: number) => {
    if (!files || files.length === 0 || !editing) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const url = await uploadImageToCloudinary(file, 'inaya-fashion/products');
        if (typeof variantIndex === 'number') {
          const nextVariants = [...(editing.variants || [])];
          if (nextVariants[variantIndex]) {
            nextVariants[variantIndex] = { ...nextVariants[variantIndex], image: url };
            setEditing((prev) => (prev ? { ...prev, variants: nextVariants } : prev));
          }
        } else {
          setEditing((prev) =>
            prev ? { ...prev, images: [...(prev.images || []), url] } : prev
          );
        }
      }
      onToast('Uploaded image to Cloudinary');
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Cloudinary upload failed', true);
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing || !editing.name?.trim()) return;
    setSaving(true);
    try {
      const slug =
        editing.slug?.trim() ||
        editing.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '');
      const cat = categories.find((c) => c.id === editing.category_id);
      const parsedSizes = sizesInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const saved = await adminSaveProduct({
        ...editing,
        slug,
        category_name: cat?.name || editing.category_name || 'Knitwear',
        sizes: parsedSizes.length ? parsedSizes : ['S', 'M', 'L', 'XL'],
      });

      const exists = products.some((p) => p.id === saved.id);
      const nextList = exists
        ? products.map((p) => (p.id === saved.id ? saved : p))
        : [saved, ...products];
      onProductsChanged(nextList);
      setEditing(null);
      onToast(`Saved "${saved.name}"`);
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Could not save product', true);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProduct = async (p: Product) => {
    try {
      await adminDeleteProduct(p.id);
      onProductsChanged(products.filter((x) => x.id !== p.id));
      onToast(`Deleted "${p.name}"`);
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Delete failed', true);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    const slug = newCatName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    try {
      const saved = await adminSaveCategory({
        name: newCatName.trim(),
        slug,
        sort_order: categories.length + 1,
        is_active: true,
      });
      onCategoriesChanged([...categories, saved]);
      setNewCatName('');
      onToast(`Category "${saved.name}" added`);
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Failed to create category', true);
    }
  };

  const handleDeleteCategory = async (cat: Category) => {
    try {
      await adminDeleteCategory(cat.id);
      onCategoriesChanged(categories.filter((c) => c.id !== cat.id));
      onToast(`Removed category "${cat.name}"`);
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Failed to remove category', true);
    }
  };

  const addVariantRow = () => {
    if (!editing) return;
    const next: ProductVariant = {
      color: 'New Shade',
      hex: '#D4A853',
      image: editing.images?.[0] || '',
      stock: 15,
    };
    setEditing({ ...editing, variants: [...(editing.variants || []), next] });
  };

  return (
    <div className="space-y-6">
      {/* Category Management */}
      <div className="bg-white border border-[#EAE4DA] rounded-2xl p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#141210]">Categories</h3>
          <span className="text-xs text-[#575148]">{categories.length} active</span>
        </div>

        <form onSubmit={handleAddCategory} className="flex gap-2">
          <input
            type="text"
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            placeholder="New category name (e.g. Winter Cardigans)"
            className="flex-1 px-3.5 py-2.5 text-sm border border-[#EAE4DA] rounded-xl focus:outline-none focus:border-[#B6862C]"
          />
          <button
            type="submit"
            className="min-h-[42px] px-4 py-2 rounded-xl bg-[#141210] text-white text-xs font-semibold flex items-center gap-1.5 hover:bg-[#8C6218]"
          >
            <FolderPlus className="w-4 h-4 text-[#E6C885]" />
            <span>Add</span>
          </button>
        </form>

        <div className="flex flex-wrap gap-2 pt-1">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#FAF8F5] border border-[#EAE4DA] text-xs font-medium text-[#141210]"
            >
              <span>{cat.name}</span>
              <button
                type="button"
                onClick={() => handleDeleteCategory(cat)}
                aria-label={`Delete category ${cat.name}`}
                className="text-[#7D756B] hover:text-red-700"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Product Header & Add Button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-[#141210]">
            Catalog Products ({products.length})
          </h3>
          <p className="text-xs text-[#575148]">
            Manage prices, Cloudinary photography, sizes, and color variants.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreate}
          className="min-h-[44px] px-4 py-2 rounded-xl bg-[#141210] text-white text-xs font-semibold flex items-center gap-1.5 hover:bg-[#8C6218]"
        >
          <Plus className="w-4 h-4 text-[#E6C885]" />
          <span>Add Product</span>
        </button>
      </div>

      {/* Products List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {products.map((product) => (
          <div
            key={product.id}
            className="bg-white border border-[#EAE4DA] rounded-2xl p-4 flex gap-4"
          >
            <img
              src={product.images[0] || product.variants[0]?.image}
              alt={product.name}
              referrerPolicy="no-referrer"
              className="w-20 h-24 object-cover object-top rounded-xl bg-[#FAF8F5] border border-[#EAE4DA] shrink-0"
            />
            <div className="flex-1 min-w-0 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2 text-xs text-[#575148]">
                  <span>{product.category_name}</span>
                  <span>{product.is_available ? 'Active' : 'Hidden'}</span>
                </div>
                <h4 className="mt-0.5 text-sm font-semibold text-[#141210] line-clamp-1">
                  {product.name}
                </h4>
                <div className="mt-1 flex items-baseline gap-2 text-xs tabular-nums">
                  <span className="font-bold text-[#141210]">
                    ৳{(product.discount_price || product.regular_price).toLocaleString()}
                  </span>
                  {product.discount_price && product.discount_price < product.regular_price && (
                    <span className="text-[#7D756B] line-through">
                      ৳{product.regular_price.toLocaleString()}
                    </span>
                  )}
                  <span className="text-[#575148]">· Stock: {product.stock_quantity}</span>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => openEdit(product)}
                  className="min-h-[38px] px-3 py-1.5 rounded-lg border border-[#EAE4DA] text-xs font-medium text-[#141210] flex items-center gap-1.5 hover:bg-[#FAF8F5]"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteProduct(product)}
                  className="min-h-[38px] px-3 py-1.5 rounded-lg border border-red-200 text-xs font-medium text-red-700 flex items-center gap-1.5 hover:bg-red-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Product Editor Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/55 backdrop-blur-xs sm:p-4">
          <form
            onSubmit={handleSaveProduct}
            className="w-full max-w-2xl bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-[#EAE4DA] flex items-center justify-between bg-[#FAF8F5]">
              <h3 className="font-display text-xl font-semibold text-[#141210]">
                {editing.id ? 'Edit Product' : 'New Product'}
              </h3>
              <button
                type="button"
                onClick={() => setEditing(null)}
                aria-label="Close product editor"
                className="min-h-[40px] min-w-[40px] flex items-center justify-center text-[#575148]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#575148] mb-1">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={editing.name || ''}
                    onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                    className="w-full px-3 py-2.5 border border-[#EAE4DA] rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#575148] mb-1">
                    Category
                  </label>
                  <select
                    value={editing.category_id || ''}
                    onChange={(e) => setEditing({ ...editing, category_id: e.target.value })}
                    className="w-full px-3 py-2.5 border border-[#EAE4DA] rounded-xl bg-white"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#575148] mb-1">
                    Regular (৳) *
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={editing.regular_price ?? 0}
                    onChange={(e) =>
                      setEditing({ ...editing, regular_price: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2.5 border border-[#EAE4DA] rounded-xl tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#575148] mb-1">
                    Discount (৳)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={editing.discount_price ?? ''}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        discount_price: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                    className="w-full px-3 py-2.5 border border-[#EAE4DA] rounded-xl tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#575148] mb-1">
                    Stock Qty
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={editing.stock_quantity ?? 20}
                    onChange={(e) =>
                      setEditing({ ...editing, stock_quantity: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2.5 border border-[#EAE4DA] rounded-xl tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#575148] mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={editing.description || ''}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  className="w-full px-3 py-2.5 border border-[#EAE4DA] rounded-xl"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#575148] mb-1">
                    Sizes (comma separated)
                  </label>
                  <input
                    type="text"
                    value={sizesInput}
                    onChange={(e) => setSizesInput(e.target.value)}
                    placeholder="S, M, L, XL"
                    className="w-full px-3 py-2.5 border border-[#EAE4DA] rounded-xl"
                  />
                </div>
                <div className="flex items-end gap-4 pb-2">
                  <label className="flex items-center gap-2 text-xs font-medium text-[#141210]">
                    <input
                      type="checkbox"
                      checked={editing.is_available ?? true}
                      onChange={(e) =>
                        setEditing({ ...editing, is_available: e.target.checked })
                      }
                      className="w-4 h-4 accent-[#141210]"
                    />
                    <span>Available for Sale</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs font-medium text-[#141210]">
                    <input
                      type="checkbox"
                      checked={editing.is_featured ?? true}
                      onChange={(e) =>
                        setEditing({ ...editing, is_featured: e.target.checked })
                      }
                      className="w-4 h-4 accent-[#141210]"
                    />
                    <span>Featured</span>
                  </label>
                </div>
              </div>

              {/* Cloudinary Gallery Upload */}
              <div className="space-y-2 pt-2 border-t border-[#F1ECE4]">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[#575148]">
                    Product Images (Cloudinary Upload or URL)
                  </label>
                  <label className="cursor-pointer px-3 py-1.5 rounded-lg bg-[#FAF8F5] border border-[#EAE4DA] text-xs font-medium text-[#141210] inline-flex items-center gap-1.5 hover:border-[#B6862C]">
                    {uploading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Upload className="w-3.5 h-3.5 text-[#8C6218]" />
                    )}
                    <span>Upload Photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => handleFileUpload(e.target.files)}
                    />
                  </label>
                </div>

                <div className="flex gap-2">
                  <input
                    type="url"
                    value={newImageUrl}
                    onChange={(e) => setNewImageUrl(e.target.value)}
                    placeholder="Or paste image URL..."
                    className="flex-1 px-3 py-2 text-xs border border-[#EAE4DA] rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!newImageUrl.trim()) return;
                      setEditing({
                        ...editing,
                        images: [...(editing.images || []), newImageUrl.trim()],
                      });
                      setNewImageUrl('');
                    }}
                    className="px-3 py-2 rounded-lg border border-[#EAE4DA] text-xs font-medium"
                  >
                    Add URL
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {(editing.images || []).map((img, idx) => (
                    <div key={`${img}-${idx}`} className="relative w-16 h-20 rounded-lg overflow-hidden border border-[#EAE4DA]">
                      <img src={img} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() =>
                          setEditing({
                            ...editing,
                            images: (editing.images || []).filter((_, i) => i !== idx),
                          })
                        }
                        aria-label="Remove image"
                        className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/70 text-white flex items-center justify-center"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Color Variants */}
              <div className="space-y-2.5 pt-2 border-t border-[#F1ECE4]">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[#575148]">
                    Color Variants ({(editing.variants || []).length})
                  </label>
                  <button
                    type="button"
                    onClick={addVariantRow}
                    className="px-3 py-1.5 rounded-lg border border-[#EAE4DA] text-xs font-medium hover:bg-[#FAF8F5]"
                  >
                    + Add Color
                  </button>
                </div>

                {(editing.variants || []).map((variant, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-12 gap-2 items-center bg-[#FAF8F5] p-2.5 rounded-xl border border-[#EAE4DA]"
                  >
                    <input
                      type="color"
                      value={variant.hex || '#141210'}
                      onChange={(e) => {
                        const next = [...(editing.variants || [])];
                        next[idx] = { ...next[idx], hex: e.target.value };
                        setEditing({ ...editing, variants: next });
                      }}
                      className="col-span-2 h-9 w-full rounded cursor-pointer border-0 bg-transparent"
                    />
                    <input
                      type="text"
                      value={variant.color}
                      onChange={(e) => {
                        const next = [...(editing.variants || [])];
                        next[idx] = { ...next[idx], color: e.target.value };
                        setEditing({ ...editing, variants: next });
                      }}
                      placeholder="Color name"
                      className="col-span-4 px-2.5 py-2 text-xs bg-white border border-[#EAE4DA] rounded-lg"
                    />
                    <input
                      type="text"
                      value={variant.image}
                      onChange={(e) => {
                        const next = [...(editing.variants || [])];
                        next[idx] = { ...next[idx], image: e.target.value };
                        setEditing({ ...editing, variants: next });
                      }}
                      placeholder="Variant image URL"
                      className="col-span-4 px-2.5 py-2 text-xs bg-white border border-[#EAE4DA] rounded-lg"
                    />
                    <label className="col-span-1 cursor-pointer flex items-center justify-center p-1.5 rounded-lg bg-white border border-[#EAE4DA]">
                      <Upload className="w-3.5 h-3.5 text-[#8C6218]" />
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleFileUpload(e.target.files, idx)}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setEditing({
                          ...editing,
                          variants: (editing.variants || []).filter((_, i) => i !== idx),
                        })
                      }
                      aria-label="Remove color variant"
                      className="col-span-1 flex items-center justify-center text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Product SEO */}
              <div className="space-y-2 pt-2 border-t border-[#F1ECE4]">
                <label className="block text-xs font-semibold text-[#575148]">
                  Product SEO Title &amp; Meta Description
                </label>
                <input
                  type="text"
                  value={editing.seo_title || ''}
                  onChange={(e) => setEditing({ ...editing, seo_title: e.target.value })}
                  placeholder="SEO Title"
                  className="w-full px-3 py-2 text-xs border border-[#EAE4DA] rounded-lg"
                />
                <textarea
                  rows={2}
                  value={editing.seo_description || ''}
                  onChange={(e) =>
                    setEditing({ ...editing, seo_description: e.target.value })
                  }
                  placeholder="SEO Meta Description"
                  className="w-full px-3 py-2 text-xs border border-[#EAE4DA] rounded-lg"
                />
              </div>
            </div>

            <div className="p-4 border-t border-[#EAE4DA] bg-[#FAF8F5] flex gap-3">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="min-h-[44px] px-5 rounded-xl border border-[#EAE4DA] text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 min-h-[44px] rounded-xl bg-[#141210] text-white text-xs font-semibold flex items-center justify-center gap-2 hover:bg-[#8C6218]"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Save Product</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
