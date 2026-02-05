import { useState, useEffect } from 'react';
import { Eye, Package, X, Box, Tag, TrendingUp } from 'lucide-react';
import { useSelector } from 'react-redux';
import { Pagination } from '@/components/pagination';

interface Product {
  _id: string;
  productName: string;
  brand: string;
  shortDescription: string;
  description: string;
  defaultImages: Array<{ url: string }>;
  variants: Array<{
    variantSku: string;
    variantAttributes: Record<string, string>;
    actualPrice: number;
    discountPercent: number;
    finalPrice: number;
    stockQuantity: number;
    variantsImageUrls: Array<{ url: string }>;
  }>;
  status: string;
  createdAt: string;
  specifications: Array<Record<string, any>>;
  faqs: Array<{ question: string; answer: string }>;
}

const VendorProductsTable = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const limit = 10;

  useEffect(() => {
    fetchProducts();
  }, [page]);

  const vendorId = useSelector((state: any) => state.auth.user?.id);
  const token = useSelector((state: any) => state.auth.token);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${import.meta.env.VITE_PUBLIC_API_URL}/v1/products/vendor/${vendorId}?page=${page}&limit=${limit}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      // Ensure products is always an array
      setProducts(Array.isArray(data.products) ? data.products : []);
      setTotalPages(data?.pagination?.totalPages || 1);
      setTotalProducts(data?.pagination?.total || 0);
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch products');
      setLoading(false);
    }
  };

  const handlePageChange = (nextPage: number) => {
    setPage(nextPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'approved':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'rejected':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getTotalStock = (variants: any[] = []) => {
    return variants.reduce((sum, v) => sum + (v?.stockQuantity || 0), 0);
  };

  const safeMin = (arr: number[]) => {
    if (!arr.length) return 0;
    return Math.min(...arr);
  };

  const safeMax = (arr: number[]) => {
    if (!arr.length) return 0;
    return Math.max(...arr);
  };

  if (loading) {
    return (
      <div className='flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100'>
        <div className='text-center'>
          <div className='mx-auto h-16 w-16 animate-spin rounded-full border-b-4 border-indigo-600'></div>
          <p className='mt-4 font-medium text-slate-600'>Loading products...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className='flex min-h-screen items-center justify-center'>
        <div className='max-w-md rounded-2xl border-2 border-red-200 bg-red-50 p-8'>
          <p className='text-lg font-semibold text-red-700'>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-indigo-50 p-8'>
      <div className='mx-auto max-w-7xl'>
        {/* Header */}
        <div className='mb-8'>
          <div className='mb-2 flex items-center gap-3'>
            <Package className='h-10 w-10 text-indigo-600' />
            <h1 className='text-4xl font-bold text-slate-800'>
              Product Inventory
            </h1>
          </div>
          <p className='ml-13 text-lg text-slate-600'>
            Manage and monitor your product catalog
          </p>
        </div>

        {/* Stats Cards */}
        <div className='mb-8 grid grid-cols-1 gap-6 md:grid-cols-3'>
          <div className='rounded-2xl border border-slate-200 bg-white p-6 shadow-lg'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm font-medium text-slate-500'>
                  Total Products
                </p>
                <p className='mt-1 text-3xl font-bold text-slate-800'>
                  {totalProducts || products.length}
                </p>
              </div>
              <div className='rounded-xl bg-indigo-100 p-4'>
                <Box className='h-8 w-8 text-indigo-600' />
              </div>
            </div>
          </div>
          <div className='rounded-2xl border border-slate-200 bg-white p-6 shadow-lg'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm font-medium text-slate-500'>
                  Total Variants
                </p>
                <p className='mt-1 text-3xl font-bold text-slate-800'>
                  {products.reduce((sum, p) => sum + (Array.isArray(p.variants) ? p.variants.length : 0), 0)}
                </p>
              </div>
              <div className='rounded-xl bg-purple-100 p-4'>
                <Tag className='h-8 w-8 text-purple-600' />
              </div>
            </div>
          </div>
          <div className='rounded-2xl border border-slate-200 bg-white p-6 shadow-lg'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm font-medium text-slate-500'>
                  Total Stock
                </p>
                <p className='mt-1 text-3xl font-bold text-slate-800'>
                  {products.reduce(
                    (sum, p) => sum + getTotalStock(Array.isArray(p.variants) ? p.variants : []),
                    0
                  )}
                </p>
              </div>
              <div className='rounded-xl bg-green-100 p-4'>
                <TrendingUp className='h-8 w-8 text-green-600' />
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className='overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl'>
          <div className='overflow-x-auto'>
            <table className='w-full'>
              <thead>
                <tr className='bg-black text-white'>
                  <th className='px-6 py-4 text-left text-sm font-semibold'>
                    Product
                  </th>
                  <th className='px-6 py-4 text-left text-sm font-semibold'>
                    Brand
                  </th>
                  <th className='px-6 py-4 text-left text-sm font-semibold'>
                    Variants
                  </th>
                  <th className='px-6 py-4 text-left text-sm font-semibold'>
                    Stock
                  </th>
                  <th className='px-6 py-4 text-left text-sm font-semibold'>
                    Price Range
                  </th>
                  <th className='px-6 py-4 text-left text-sm font-semibold'>
                    Status
                  </th>
                  <th className='px-6 py-4 text-center text-sm font-semibold'>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className='divide-y divide-slate-200'>
                {products.map((product) => {
                  const variants = Array.isArray(product.variants) ? product.variants : [];
                  const prices = variants.map(v => v?.finalPrice || 0).filter(p => typeof p === 'number' && !isNaN(p));
                  const minPrice = prices.length ? safeMin(prices) : 0;
                  const maxPrice = prices.length ? safeMax(prices) : 0;

                  return (
                    <tr
                      key={product._id || Math.random().toString()}
                      className='transition-colors duration-150 hover:bg-indigo-50'
                    >
                      <td className='px-6 py-4'>
                        <div className='flex items-center gap-4'>
                          <img
                            src={product.defaultImages?.[0]?.url || ''}
                            alt={product.productName || 'Product'}
                            className='h-16 w-16 rounded-xl border-2 border-slate-200 object-cover shadow-sm'
                            onError={(e) => (e.currentTarget.src = '/fallback-image.png')}
                          />
                          <div className='max-w-xs'>
                            <p className='truncate font-semibold text-slate-800'>
                              {product.productName || 'Unnamed Product'}
                            </p>
                            <p className='truncate text-sm text-slate-500'>
                              {product.shortDescription || 'No description'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className='px-6 py-4'>
                        <span className='font-medium text-slate-700'>
                          {product.brand || '—'}
                        </span>
                      </td>
                      <td className='px-6 py-4'>
                        <span className='inline-flex items-center rounded-full bg-indigo-100 px-3 py-1 text-sm font-medium text-indigo-700'>
                          {variants.length} variant{variants.length !== 1 ? 's' : ''}
                        </span>
                      </td>
                      <td className='px-6 py-4'>
                        <span className='font-semibold text-slate-800'>
                          {getTotalStock(variants)} units
                        </span>
                      </td>
                      <td className='px-6 py-4'>
                        <div className='flex flex-col gap-1'>
                          <span className='text-sm font-semibold text-slate-800'>
                            ₹{minPrice.toLocaleString()}
                          </span>
                          {minPrice !== maxPrice && (
                            <span className='text-xs text-slate-500'>
                              to ₹{maxPrice.toLocaleString()}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className='px-6 py-4'>
                        <span
                          className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${getStatusColor(
                            product.status || 'unknown'
                          )}`}
                        >
                          {(product.status || 'Unknown')
                            .charAt(0)
                            .toUpperCase() +
                            (product.status || 'Unknown').slice(1).toLowerCase()}
                        </span>
                      </td>
                      <td className='px-6 py-4 text-center'>
                        <button
                          onClick={() => setSelectedProduct(product)}
                          className='inline-flex transform items-center gap-2 rounded-lg bg-gray-600 px-4 py-2 font-medium text-white shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:bg-indigo-700 hover:shadow-lg'
                        >
                          <Eye className='h-4 w-4' />
                          View Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          isLoading={loading}
        />
      </div>

      {/* Modal */}
      {selectedProduct && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm'>
          <div className='max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-3xl bg-white shadow-2xl'>
            {/* Modal Header */}
            <div className='sticky top-0 z-10 flex items-center justify-between rounded-t-3xl bg-white p-6'>
              <h2 className='text-2xl font-bold'>Product Details</h2>
              <button
                onClick={() => setSelectedProduct(null)}
                className='rounded-lg p-2 transition-colors hover:bg-white/20'
              >
                <X className='h-6 w-6' />
              </button>
            </div>

            <div className='p-8'>
              {/* Product Images */}
              <div className='mb-8'>
                <img
                  src={selectedProduct.defaultImages?.[0]?.url || '/fallback-image.png'}
                  alt={selectedProduct.productName || 'Product'}
                  className='h-96 w-full rounded-2xl object-cover shadow-lg'
                  onError={(e) => (e.currentTarget.src = '/fallback-image.png')}
                />
              </div>

              {/* Basic Info */}
              <div className='mb-8'>
                <h3 className='mb-2 text-3xl font-bold text-slate-800'>
                  {selectedProduct.productName || 'Unnamed Product'}
                </h3>
                <p className='mb-4 text-slate-600'>
                  {selectedProduct.description || 'No description available.'}
                </p>
                <div className='flex items-center gap-4'>
                  <span className='rounded-lg bg-indigo-100 px-4 py-2 font-semibold text-indigo-700'>
                    {selectedProduct.brand || '—'}
                  </span>
                  <span
                    className={`rounded-lg border px-4 py-2 font-semibold ${getStatusColor(
                      selectedProduct.status || 'unknown'
                    )}`}
                  >
                    {(selectedProduct.status || 'Unknown')
                      .charAt(0)
                      .toUpperCase() +
                      (selectedProduct.status || 'Unknown').slice(1).toLowerCase()}
                  </span>
                </div>
              </div>

              {/* Specifications */}
              {Array.isArray(selectedProduct.specifications) &&
                selectedProduct.specifications.length > 0 &&
                selectedProduct.specifications[0] &&
                Object.keys(selectedProduct.specifications[0]).length > 0 && (
                  <div className='mb-8'>
                    <h4 className='mb-4 flex items-center gap-2 text-xl font-bold text-slate-800'>
                      <Box className='h-5 w-5 text-indigo-600' />
                      Specifications
                    </h4>
                    <div className='rounded-2xl border border-slate-200 bg-slate-50 p-6'>
                      <div className='grid grid-cols-2 gap-4'>
                        {Object.entries(selectedProduct.specifications[0]).map(
                          ([key, value]) => (
                            <div key={key} className='flex flex-col'>
                              <span className='text-sm font-medium text-slate-500 capitalize'>
                                {key.replace(/([A-Z])/g, ' $1').trim()}
                              </span>
                              <span className='font-semibold text-slate-800'>
                                {typeof value === 'boolean'
                                  ? value
                                    ? 'Yes'
                                    : 'No'
                                  : String(value ?? '—')}
                              </span>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                )}

              {/* Variants */}
              <div className='mb-8'>
                <h4 className='mb-4 flex items-center gap-2 text-xl font-bold text-slate-800'>
                  <Tag className='h-5 w-5 text-indigo-600' />
                  Available Variants (
                  {Array.isArray(selectedProduct.variants)
                    ? selectedProduct.variants.length
                    : 0}
                  )
                </h4>
                <div className='space-y-4'>
                  {(Array.isArray(selectedProduct.variants)
                    ? selectedProduct.variants
                    : []
                  ).map((variant, idx) => {
                    const attrs = variant.variantAttributes || {};
                    return (
                      <div
                        key={variant.variantSku || idx}
                        className='rounded-2xl border-2 border-slate-200 bg-gradient-to-r from-slate-50 to-indigo-50 p-6 transition-colors hover:border-indigo-300'
                      >
                        <div className='flex items-start gap-6'>
                          {variant.variantsImageUrls?.[0]?.url && (
                            <img
                              src={variant.variantsImageUrls[0].url}
                              alt={variant.variantSku || 'Variant'}
                              className='h-24 w-24 rounded-xl border-2 border-white object-cover shadow-md'
                              onError={(e) => (e.currentTarget.src = '/fallback-image.png')}
                            />
                          )}
                          <div className='flex-1'>
                            <div className='mb-3 flex flex-wrap items-center gap-2'>
                              {Object.entries(attrs).map(([key, value]) => (
                                <span
                                  key={key}
                                  className='rounded-lg border border-slate-300 bg-white px-3 py-1 text-sm font-semibold text-slate-700 capitalize'
                                >
                                  {String(value || '—')}
                                </span>
                              ))}
                            </div>
                            <div className='grid grid-cols-2 gap-4 md:grid-cols-4'>
                              <div>
                                <p className='text-xs font-medium text-slate-500'>
                                  Original Price
                                </p>
                                <p className='text-lg font-bold text-slate-400 line-through'>
                                  ₹{(variant.actualPrice || 0).toLocaleString()}
                                </p>
                              </div>
                              <div>
                                <p className='text-xs font-medium text-slate-500'>
                                  Final Price
                                </p>
                                <p className='text-lg font-bold text-green-600'>
                                  ₹{(variant.finalPrice || 0).toLocaleString()}
                                </p>
                              </div>
                              <div>
                                <p className='text-xs font-medium text-slate-500'>
                                  Discount
                                </p>
                                <p className='text-lg font-bold text-orange-600'>
                                  {(variant.discountPercent || 0)}% OFF
                                </p>
                              </div>
                              <div>
                                <p className='text-xs font-medium text-slate-500'>
                                  Stock
                                </p>
                                <p className='text-lg font-bold text-indigo-600'>
                                  {(variant.stockQuantity || 0)} units
                                </p>
                              </div>
                            </div>
                            <p className='mt-3 font-mono text-xs text-slate-400'>
                              SKU: {variant.variantSku || '—'}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* FAQs */}
              {Array.isArray(selectedProduct.faqs) && selectedProduct.faqs.length > 0 && (
                <div>
                  <h4 className='mb-4 text-xl font-bold text-slate-800'>
                    Frequently Asked Questions
                  </h4>
                  <div className='space-y-3'>
                    {selectedProduct.faqs.map((faq, idx) => (
                      <div
                        key={idx}
                        className='rounded-xl border border-slate-200 bg-slate-50 p-5'
                      >
                        <p className='mb-2 font-semibold text-slate-800'>
                          Q: {faq.question || '—'}
                        </p>
                        <p className='text-slate-600'>A: {faq.answer || '—'}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorProductsTable;
