export const productCatalog = [
  {
    id: "p1",
    name: "Herbal Face Wash",
    category: "Skincare",
    price: 24,
    compareAtPrice: 32,
    imageUrl:
      "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "p2",
    name: "Vitamin C Serum",
    category: "Skincare",
    price: 38,
    compareAtPrice: 49,
    imageUrl:
      "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "p3",
    name: "Cotton Tote Bag",
    category: "Accessories",
    price: 18,
    compareAtPrice: 24,
    imageUrl:
      "https://images.unsplash.com/photo-1581605405669-fcdf81165afa?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "p4",
    name: "Desk Organizer Set",
    category: "Workspace",
    price: 29,
    compareAtPrice: 35,
    imageUrl:
      "https://images.unsplash.com/photo-1517705008128-361805f42e86?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "p5",
    name: "Scented Candle",
    category: "Home",
    price: 22,
    compareAtPrice: 28,
    imageUrl:
      "https://images.unsplash.com/photo-1602872029708-84b2c3b4b7a3?auto=format&fit=crop&w=900&q=80",
  },
];

export const getCatalogProduct = (productId) =>
  productCatalog.find((product) => product.id === productId);
