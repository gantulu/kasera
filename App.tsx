import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, ShoppingBag, Heart, Star, Sparkles, Home, 
  Grid, User, ChevronLeft, Plus, Minus, CheckCircle2, 
  SlidersHorizontal, X, Zap, ShieldCheck, Truck,
  MapPin, CreditCard, Wallet, QrCode, Tag, PackageCheck, ArrowRight,
  MessageCircle, Send, Loader2, RefreshCw
} from 'lucide-react';

// --- KONFIGURASI API DIVOOM ---
const API_URL = "https://mvwflakurihhakdrlteg.supabase.co/functions/v1/get-divoom-products";

const COLOR_MAP = {
  black: "#18181b",
  white: "#f4f4f5",
  pink: "#f472b6",
  blue: "#60a5fa",
  green: "#34d399",
  red: "#ef4444",
  yellow: "#fbbf24",
  silver: "#9ca3af",
  grey: "#6b7280",
  gray: "#6b7280",
  purple: "#a855f7",
  orange: "#f97316"
};

const getColorHex = (colorName) => {
  if (!colorName) return "#3f3f46";
  const key = colorName.toLowerCase().trim();
  return COLOR_MAP[key] || "#ec4899";
};

const SHIPPING_METHODS = [
  { id: 'reguler', name: 'Reguler (JNE / J&T)', estimate: '2-3 Hari', price: 0, badge: 'Gratis Ongkir' },
  { id: 'express', name: 'Next Day (SiCepat BEST)', estimate: '1 Hari', price: 25000, badge: 'Cepat' },
  { id: 'instant', name: 'Instant Courier (GoSend)', estimate: '2-3 Jam', price: 45000, badge: 'Prioritas' }
];

const KASERA_PAYMENT_CHANNELS = [
  { id: 'va_bri', name: 'Virtual Account BRI', group: 'Bank Transfer' },
  { id: 'va_bni', name: 'Virtual Account BNI', group: 'Bank Transfer' },
  { id: 'va_mandiri', name: 'Virtual Account Mandiri', group: 'Bank Transfer' },
  { id: 'va_permata', name: 'Virtual Account Permata', group: 'Bank Transfer' },
  { id: 'va_cimb', name: 'Virtual Account CIMB Niaga', group: 'Bank Transfer' },
  { id: 'va_danamon', name: 'Virtual Account Danamon', group: 'Bank Transfer' },
  { id: 'va_maybank', name: 'Virtual Account Maybank', group: 'Bank Transfer' }
];

// Format Rupiah
const formatIDR = (price) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(price || 0);
};

// Komponen Gambar Produk dengan Fallback
const ProductImage = ({ src, alt, className = "" }) => {
  const [imgError, setImgError] = useState(false);

  if (!src || imgError) {
    return (
      <div className={`bg-zinc-950 border border-zinc-800 flex flex-col items-center justify-center text-zinc-500 ${className}`}>
        <span className="font-black text-xs tracking-tighter text-pink-500">DIVOOM</span>
        <span className="text-[9px] mt-0.5">No Image</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      onError={() => setImgError(true)}
      className={`object-cover bg-zinc-950 ${className}`}
      loading="lazy"
    />
  );
};

export default function App() {
  // API & Products State (Grouped by item_group_id)
  const [productGroups, setProductGroups] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  // Navigation & View States
  const [activeTab, setActiveTab] = useState('home'); // 'home' | 'catalog' | 'wishlist' | 'profile'
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [orderSuccessData, setOrderSuccessData] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Cart, Wishlist & Livechat States
  const [cart, setCart] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [toastMessage, setToastMessage] = useState(null);
  const [isLiveChatOpen, setIsLiveChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([
    { id: 1, sender: 'agent', text: 'Halo Pixel Lovers! 👋 Ada yang bisa kami bantu seputar produk Divoom?', time: 'Baru saja' }
  ]);

  // Checkout Form States
  const [shippingAddress, setShippingAddress] = useState({
    recipient: 'Pixel Enthusiast',
    email: 'budi@example.com',
    phone: '08123456789',
    address: 'Jl. Sudirman No. 88, Kebayoran Baru, Jakarta Selatan, 12190'
  });
  const [selectedShipping, setSelectedShipping] = useState(SHIPPING_METHODS[0]);
  const [selectedKaseraChannel, setSelectedKaseraChannel] = useState(KASERA_PAYMENT_CHANNELS[0].id);
  const [promoInput, setPromoInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Toast Helper
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Fetch Products & Group By item_group_id
  const fetchProducts = async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const response = await fetch(API_URL);
      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }
      const json = await response.json();
      if (json.success && Array.isArray(json.data)) {
        const groupedMap = new Map();

        json.data.forEach((item) => {
          const groupId = item.item_group_id || item.id;
          const hasSale = item.sale_price !== null && item.sale_price !== undefined && item.sale_price < item.price;
          const effectivePrice = hasSale ? item.sale_price : item.price;
          const originalPrice = hasSale ? item.price : null;

          const variantObj = {
            id: item.id,
            title: item.title,
            color: item.color || 'Default',
            colorHex: getColorHex(item.color),
            size: item.size || 'Standard',
            price: effectivePrice,
            originalPrice,
            availability: item.availability || 'in stock',
            imageLink: item.image_link,
            additionalImages: Array.isArray(item.additional_image_link) ? item.additional_image_link : [],
            desc: item.description || '',
            richDesc: item.rich_text_description || ''
          };

          if (!groupedMap.has(groupId)) {
            // Bersihkan nama warna/ukuran dari judul utama grup jika memungkinkan
            const baseTitle = item.title
              .replace(new RegExp(`\\s*-?\\s*${item.color || ''}$`, 'i'), '')
              .trim() || item.title;

            groupedMap.set(groupId, {
              groupId,
              name: baseTitle,
              category: item.product_type || 'Gadget',
              desc: item.description || '',
              richDesc: item.rich_text_description || '',
              variants: [variantObj],
              defaultVariant: variantObj
            });
          } else {
            const existingGroup = groupedMap.get(groupId);
            existingGroup.variants.push(variantObj);
          }
        });

        // Susun metadata varian unik (color & size) untuk tiap grup
        const finalizedGroups = Array.from(groupedMap.values()).map((group) => {
          const uniqueColorsMap = new Map();
          const uniqueSizesSet = new Set();

          group.variants.forEach((v) => {
            uniqueSizesSet.add(v.size);
            if (!uniqueColorsMap.has(v.color)) {
              uniqueColorsMap.set(v.color, {
                color: v.color,
                colorHex: v.colorHex,
                imageLink: v.imageLink,
                additionalImages: v.additionalImages
              });
            }
          });

          const prices = group.variants.map((v) => v.price);
          const minPrice = Math.min(...prices);
          const maxPrice = Math.max(...prices);
          const hasAnySale = group.variants.some((v) => v.originalPrice !== null);
          const inStock = group.variants.some((v) => v.availability === 'in stock');

          return {
            ...group,
            colors: Array.from(uniqueColorsMap.values()),
            sizes: Array.from(uniqueSizesSet),
            minPrice,
            maxPrice,
            badge: inStock ? (hasAnySale ? 'Promo' : 'In Stock') : 'Pre-Order'
          };
        });

        setProductGroups(finalizedGroups);
      } else {
        throw new Error("Format respons API tidak sesuai.");
      }
    } catch (err) {
      setFetchError(err.message || "Gagal memuat data produk dari server.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Kategori Dinamis dari Data API
  const categories = useMemo(() => {
    const uniqueTypes = Array.from(new Set(productGroups.map(g => g.category).filter(Boolean)));
    return ["Semua", ...uniqueTypes];
  }, [productGroups]);

  // Filtered Product Groups
  const filteredGroups = useMemo(() => {
    return productGroups.filter(g => {
      const matchesCat = selectedCategory === 'Semua' || g.category === selectedCategory;
      const matchesSearch = g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            g.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            g.category.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [productGroups, selectedCategory, searchQuery]);

  // Varian Aktif pada Modal Detail berdasarkan pilihan Color & Size
  const activeDetailVariant = useMemo(() => {
    if (!selectedGroup) return null;
    // 1. Cari yang cocok persis antara color & size
    const exactMatch = selectedGroup.variants.find(
      v => v.color === selectedColor && v.size === selectedSize
    );
    if (exactMatch) return exactMatch;

    // 2. Fallback: cocokkan berdasarkan color dulu (untuk gambar) dan size (untuk harga)
    const colorMatch = selectedGroup.variants.find(v => v.color === selectedColor) || selectedGroup.defaultVariant;
    const sizeMatch = selectedGroup.variants.find(v => v.size === selectedSize) || colorMatch;

    return {
      ...colorMatch,
      size: sizeMatch.size,
      price: sizeMatch.price,
      originalPrice: sizeMatch.originalPrice
    };
  }, [selectedGroup, selectedColor, selectedSize]);

  // Galeri Gambar berdasarkan varian Color yang dipilih (image_link + additional_image_link)
  const activeColorGallery = useMemo(() => {
    if (!selectedGroup) return [];
    const colorObj = selectedGroup.colors.find(c => c.color === selectedColor) || selectedGroup.colors[0];
    if (!colorObj) return [];
    return [colorObj.imageLink, ...(colorObj.additionalImages || [])].filter(Boolean);
  }, [selectedGroup, selectedColor]);

  // Cart Calculations
  const totalCartItems = cart.reduce((acc, item) => acc + item.qty, 0);
  const totalCartPrice = cart.reduce((acc, item) => acc + (item.product.price * item.qty), 0);
  const discountAmount = appliedPromo ? appliedPromo.discount : 0;
  const grandTotal = Math.max(0, totalCartPrice + selectedShipping.price - discountAmount);

  // Handlers
  const openGroupDetail = (group) => {
    setSelectedGroup(group);
    setSelectedColor(group.defaultVariant.color);
    setSelectedSize(group.defaultVariant.size);
    setActiveImageIdx(0);
  };

  const handleSelectColor = (colorName) => {
    setSelectedColor(colorName);
    setActiveImageIdx(0);
    // Otomatis sesuaikan size jika kombinasi color + size saat ini tidak tersedia
    if (selectedGroup) {
      const hasExact = selectedGroup.variants.some(v => v.color === colorName && v.size === selectedSize);
      if (!hasExact) {
        const firstForColor = selectedGroup.variants.find(v => v.color === colorName);
        if (firstForColor) setSelectedSize(firstForColor.size);
      }
    }
  };

  const handleSelectSize = (sizeName) => {
    setSelectedSize(sizeName);
    // Otomatis sesuaikan color jika kombinasi color + size saat ini tidak tersedia
    if (selectedGroup) {
      const hasExact = selectedGroup.variants.some(v => v.color === selectedColor && v.size === sizeName);
      if (!hasExact) {
        const firstForSize = selectedGroup.variants.find(v => v.size === sizeName);
        if (firstForSize) {
          setSelectedColor(firstForSize.color);
          setActiveImageIdx(0);
        }
      }
    }
  };

  const handleAddToCart = (variantItem, groupName) => {
    const cartItemData = {
      ...variantItem,
      displayName: groupName || variantItem.title
    };
    setCart(prev => {
      const existingIndex = prev.findIndex(
        item => item.product.id === cartItemData.id && item.selectedColor === cartItemData.color && item.selectedSize === cartItemData.size
      );
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex].qty += 1;
        return updated;
      }
      return [...prev, { product: cartItemData, qty: 1, selectedColor: cartItemData.colorHex, colorLabel: cartItemData.color, sizeLabel: cartItemData.size }];
    });
    showToast(`${cartItemData.displayName} (${cartItemData.color}${cartItemData.size !== 'Standard' ? `, ${cartItemData.size}` : ''}) ditambahkan!`);
  };

  const updateCartQty = (index, delta) => {
    setCart(prev => {
      const updated = [...prev];
      const newQty = updated[index].qty + delta;
      if (newQty <= 0) {
        updated.splice(index, 1);
      } else {
        updated[index].qty = newQty;
      }
      return updated;
    });
  };

  const toggleWishlist = (e, groupId) => {
    e.stopPropagation();
    setWishlist(prev => {
      const exists = prev.includes(groupId);
      if (exists) {
        showToast("Dihapus dari favorit");
        return prev.filter(id => id !== groupId);
      } else {
        showToast("Disimpan ke favorit");
        return [...prev, groupId];
      }
    });
  };

  const handleApplyPromo = () => {
    const code = promoInput.trim().toUpperCase();
    if (!code) return;
    if (code === 'PIXEL10' || code === 'DIVOOM100') {
      setAppliedPromo({ code, discount: 100000 });
      showToast(`Kode promo ${code} berhasil dipakai! Hemat Rp100.000`);
    } else {
      showToast("Kode promo tidak valid. Coba: PIXEL10");
    }
  };

  const handleOpenCheckout = () => {
    setIsCartOpen(false);
    setIsCheckoutOpen(true);
  };

  const handleConfirmOrder = async (e) => {
    e.preventDefault();
    if (!shippingAddress.recipient.trim() || !shippingAddress.phone.trim() || !shippingAddress.address.trim() || !shippingAddress.email.trim()) {
      showToast("Mohon lengkapi data nama, email, dan alamat pengiriman!");
      return;
    }

    setIsProcessingPayment(true);
    try {
      const idempotencyKey = `divoom-checkout-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const payloadItems = cart.map(item => ({
        product_id: item.product.id,
        quantity: item.qty
      }));

      const kaseraPayload = {
        customer_name: shippingAddress.recipient,
        customer_email: shippingAddress.email,
        customer_phone: shippingAddress.phone,
        payment_method: selectedKaseraChannel,
        idempotency_key: idempotencyKey,
        items: payloadItems,
        return_url: window.location.href
      };

      const res = await fetch("https://oszqantvugvbvydlizix.supabase.co/functions/v1/kasera-create-payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(kaseraPayload)
      });

      const responseJson = await res.json();

      if (!res.ok || (responseJson && responseJson.success === false)) {
        throw new Error(responseJson.error || responseJson.message || "Gagal membuat transaksi pembayaran Kasera.");
      }

      // Jika berhasil, ambil data VA / Payment URL dari response Kasera
      const orderSummary = {
        orderId: responseJson.order_id || responseJson.id || `DVM-${Math.floor(100000 + Math.random() * 900000)}`,
        virtualAccount: responseJson.virtual_account_number || responseJson.va_number || responseJson.payment_code || "888801" + Math.floor(100000000 + Math.random() * 900000000),
        paymentUrl: responseJson.payment_url || responseJson.checkout_url || null,
        items: [...cart],
        totalPaid: grandTotal,
        shipping: selectedShipping,
        payment: KASERA_PAYMENT_CHANNELS.find(p => p.id === selectedKaseraChannel)?.name,
        address: { ...shippingAddress }
      };

      setOrderSuccessData(orderSummary);
      setIsCheckoutOpen(false);
      setCart([]);
      setAppliedPromo(null);
      setPromoInput('');
    } catch (err) {
      showToast(err.message || "Terjadi kesalahan koneksi pembayaran.");
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleSendChat = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: chatInput.trim(),
      time: 'Baru saja'
    };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');

    setTimeout(() => {
      setChatMessages(prev => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'agent',
          text: 'Terima kasih atas pesan Anda! Tim Divoom Support Indonesia sedang mengecek ketersediaan stok & informasi produk untuk Anda.',
          time: 'Baru saja'
        }
      ]);
    }, 800);
  };

  return (
    /* Wrapper luar untuk memusatkan tampilan Mobile-Only di layar besar */
    <div className="min-h-screen bg-zinc-950 flex justify-center items-start sm:py-6 font-sans select-none">
      
      {/* Kontainer Utama Aplikasi Mobile (Maksimal lebar 430px / standar ponsel modern) */}
      <div className="w-full max-w-[430px] min-h-screen sm:min-h-[840px] sm:h-[840px] bg-zinc-900 text-zinc-100 sm:rounded-[38px] sm:border-[6px] sm:border-zinc-800 shadow-2xl relative flex flex-col overflow-hidden">
        
        {/* Toast Notification */}
        {toastMessage && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 w-[88%] bg-emerald-500 text-zinc-950 font-semibold text-xs py-2.5 px-4 rounded-2xl shadow-lg flex items-center gap-2 animate-bounce">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* --- TOP HEADER --- */}
        <header className="px-5 pt-5 pb-3 bg-zinc-900/95 backdrop-blur-md sticky top-0 z-20 flex items-center justify-between border-b border-zinc-800/80">
          <div 
            onClick={() => setActiveTab('home')}
            className="flex items-center gap-2.5 cursor-pointer"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-pink-500 via-purple-500 to-cyan-400 p-[2px]">
              <div className="w-full h-full bg-zinc-950 rounded-[10px] flex items-center justify-center">
                <span className="font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-cyan-400 text-base tracking-tighter">
                  DV
                </span>
              </div>
            </div>
            <div>
              <h1 className="font-extrabold text-base tracking-wide text-white leading-none">
                DIVOOM <span className="text-pink-500">STORE</span>
              </h1>
              <p className="text-[10px] text-zinc-400 font-medium tracking-wider uppercase mt-0.5">
                Official Pixel Gadgets
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Tombol Keranjang */}
            <button 
              onClick={() => setIsCartOpen(true)}
              className="relative p-2.5 bg-zinc-800 hover:bg-zinc-700 active:scale-95 transition rounded-2xl border border-zinc-700/70"
              aria-label="Keranjang Belanja"
            >
              <ShoppingBag className="w-5 h-5 text-zinc-100" />
              {totalCartItems > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-pink-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-md">
                  {totalCartItems}
                </span>
              )}
            </button>

            {/* Tombol Akun di Header (Di sebelah kanan Cart) */}
            <button 
              onClick={() => setActiveTab('profile')}
              className={`relative p-2.5 transition rounded-2xl border active:scale-95 ${
                activeTab === 'profile'
                  ? 'bg-pink-500/20 border-pink-500 text-pink-400'
                  : 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700/70 text-zinc-100'
              }`}
              aria-label="Akun Pengguna"
            >
              <User className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* --- MAIN SCROLLABLE CONTENT --- */}
        <main className="flex-1 overflow-y-auto pb-24 px-5 pt-4 space-y-5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          
          {/* TAB 1: HOME */}
          {activeTab === 'home' && (
            <>
              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari Ditoo, Pixoo, Times Gate..."
                  className="w-full bg-zinc-800/90 text-sm text-white placeholder-zinc-400 pl-10 pr-4 py-3 rounded-2xl border border-zinc-700/60 focus:outline-none focus:border-pink-500 transition"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Promo Hero Banner (Hanya tampil saat tidak sedang mencari) */}
              {!searchQuery && (
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 p-5 border border-pink-500/30 shadow-lg">
                  <div className="relative z-10 flex items-center justify-between gap-3">
                    <div className="space-y-2 max-w-[62%]">
                      <span className="inline-flex items-center gap-1 bg-pink-500/20 border border-pink-400/40 text-pink-200 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                        <Sparkles className="w-3 h-3" /> Official Catalog
                      </span>
                      <h2 className="text-lg font-extrabold text-white leading-tight">
                        Upgrade Meja Gaming Pixel Art
                      </h2>
                      <p className="text-xs text-purple-200/90 leading-relaxed">
                        Koleksi asli Divoom langsung dari katalog resmi.
                      </p>
                      {productGroups[0] && (
                        <button 
                          onClick={() => openGroupDetail(productGroups[0])}
                          className="mt-1 bg-white text-zinc-950 font-bold text-xs px-4 py-2 rounded-xl active:scale-95 transition shadow"
                        >
                          Lihat {productGroups[0].name}
                        </button>
                      )}
                    </div>

                    {/* Visualisasi Produk Unggulan di Banner */}
                    <div className="shrink-0">
                      <ProductImage
                        src={productGroups[0]?.defaultVariant?.imageLink}
                        alt={productGroups[0]?.name || "Divoom Featured"}
                        className="w-24 h-24 rounded-2xl border-2 border-pink-400/40 shadow-lg"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Category Filter Pills */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                    Kategori Produk
                  </h3>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition active:scale-95 ${
                        selectedCategory === cat
                          ? 'bg-pink-500 text-white shadow-md shadow-pink-500/25'
                          : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border border-zinc-700/50'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Product Grid (2 Columns Mobile - Grouped by item_group_id) */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-white">
                    {selectedCategory === 'Semua' ? 'Rekomendasi Populer' : `Seri ${selectedCategory}`}
                  </h3>
                  <span className="text-xs text-zinc-400">{filteredGroups.length} produk</span>
                </div>

                {isLoading ? (
                  <div className="py-14 flex flex-col items-center justify-center gap-3 text-zinc-400">
                    <Loader2 className="w-7 h-7 text-pink-500 animate-spin" />
                    <p className="text-xs font-medium">Memuat katalog Divoom...</p>
                  </div>
                ) : fetchError ? (
                  <div className="text-center py-10 px-4 bg-zinc-800/40 rounded-3xl border border-red-500/30 space-y-3">
                    <p className="text-xs text-red-400">{fetchError}</p>
                    <button
                      onClick={fetchProducts}
                      className="inline-flex items-center gap-1.5 bg-pink-500 text-white text-xs font-bold px-4 py-2 rounded-xl"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Coba Lagi
                    </button>
                  </div>
                ) : filteredGroups.length === 0 ? (
                  <div className="text-center py-10 bg-zinc-800/40 rounded-3xl border border-zinc-800">
                    <p className="text-sm text-zinc-400">Produk tidak ditemukan.</p>
                    <button 
                      onClick={() => { setSearchQuery(''); setSelectedCategory('Semua'); }}
                      className="mt-2 text-xs text-pink-400 font-semibold underline"
                    >
                      Reset Filter
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3.5">
                    {filteredGroups.map((group) => {
                      const isFav = wishlist.includes(group.groupId);
                      const defVar = group.defaultVariant;
                      return (
                        <div
                          key={group.groupId}
                          onClick={() => openGroupDetail(group)}
                          className="bg-zinc-800/70 border border-zinc-700/60 rounded-3xl p-3 flex flex-col justify-between active:scale-[0.98] transition cursor-pointer relative group"
                        >
                          {/* Badge & Wishlist Button */}
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-md bg-zinc-900 text-cyan-400 border border-cyan-500/30">
                              {group.badge}
                            </span>
                            <button
                              onClick={(e) => toggleWishlist(e, group.groupId)}
                              className="p-1.5 rounded-full bg-zinc-900/80 text-zinc-400 hover:text-pink-500"
                            >
                              <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-pink-500 text-pink-500' : ''}`} />
                            </button>
                          </div>

                          {/* Product Image Preview */}
                          <div className="my-1.5 overflow-hidden rounded-2xl aspect-square bg-zinc-950 relative">
                            <ProductImage
                              src={defVar.imageLink}
                              alt={group.name}
                              className="w-full h-full"
                            />
                            {group.variants.length > 1 && (
                              <span className="absolute bottom-1.5 right-1.5 bg-zinc-950/85 backdrop-blur-sm text-[9px] font-bold text-zinc-200 px-1.5 py-0.5 rounded-md border border-zinc-700">
                                {group.variants.length} Varian
                              </span>
                            )}
                          </div>

                          {/* Info Produk */}
                          <div className="mt-1.5 space-y-1">
                            {/* Swatch Varian Warna */}
                            <div className="flex items-center gap-1.5">
                              <div className="flex items-center -space-x-1">
                                {group.colors.slice(0, 4).map((c) => (
                                  <span
                                    key={c.color}
                                    className="w-3 h-3 rounded-full border border-zinc-900 ring-1 ring-zinc-600"
                                    style={{ backgroundColor: c.colorHex }}
                                    title={c.color}
                                  />
                                ))}
                              </div>
                              <span className="text-[10px] text-cyan-400 font-medium truncate">
                                {group.category}
                              </span>
                            </div>
                            <h4 className="font-bold text-xs text-white line-clamp-1">
                              {group.name}
                            </h4>
                            <div className="flex items-center justify-between pt-1">
                              <div>
                                {defVar.originalPrice && (
                                  <p className="text-[10px] text-zinc-500 line-through">
                                    {formatIDR(defVar.originalPrice)}
                                  </p>
                                )}
                                <p className="text-xs font-extrabold text-pink-400">
                                  {formatIDR(group.minPrice)}
                                </p>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAddToCart(defVar, group.name);
                                }}
                                className="w-7 h-7 rounded-xl bg-pink-500 hover:bg-pink-600 text-white flex items-center justify-center shadow active:scale-90 transition"
                                aria-label="Tambah ke keranjang"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}

          {/* TAB 2: KATALOG LENGKAP (GRID VIEW) */}
          {activeTab === 'catalog' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-extrabold text-white">Katalog Divoom</h2>
                  <p className="text-[11px] text-zinc-400">Menampilkan {filteredGroups.length} grup produk resmi</p>
                </div>
                <button
                  onClick={fetchProducts}
                  className="p-2 bg-zinc-800 rounded-xl border border-zinc-700/60 active:scale-95"
                  title="Muat Ulang Katalog"
                >
                  <RefreshCw className={`w-4 h-4 text-pink-400 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {/* Filter Kategori di Katalog */}
              <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition active:scale-95 ${
                      selectedCategory === cat
                        ? 'bg-pink-500 text-white shadow-md shadow-pink-500/25'
                        : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border border-zinc-700/50'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Grid Produk 2 Kolom */}
              {isLoading ? (
                <div className="py-14 flex flex-col items-center justify-center gap-3 text-zinc-400">
                  <Loader2 className="w-7 h-7 text-pink-500 animate-spin" />
                  <p className="text-xs font-medium">Memuat katalog...</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3.5">
                  {filteredGroups.map((group) => {
                    const isFav = wishlist.includes(group.groupId);
                    const defVar = group.defaultVariant;
                    return (
                      <div
                        key={group.groupId}
                        onClick={() => openGroupDetail(group)}
                        className="bg-zinc-800/70 border border-zinc-700/60 rounded-3xl p-3 flex flex-col justify-between active:scale-[0.98] transition cursor-pointer relative group"
                      >
                        {/* Badge & Wishlist Button */}
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-md bg-zinc-900 text-cyan-400 border border-cyan-500/30">
                            {group.badge}
                          </span>
                          <button
                            onClick={(e) => toggleWishlist(e, group.groupId)}
                            className="p-1.5 rounded-full bg-zinc-900/80 text-zinc-400 hover:text-pink-500"
                          >
                            <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-pink-500 text-pink-500' : ''}`} />
                          </button>
                        </div>

                        {/* Product Image Preview */}
                        <div className="my-1.5 overflow-hidden rounded-2xl aspect-square bg-zinc-950 relative">
                          <ProductImage
                            src={defVar.imageLink}
                            alt={group.name}
                            className="w-full h-full"
                          />
                          {group.variants.length > 1 && (
                            <span className="absolute bottom-1.5 right-1.5 bg-zinc-950/85 backdrop-blur-sm text-[9px] font-bold text-zinc-200 px-1.5 py-0.5 rounded-md border border-zinc-700">
                              {group.variants.length} Varian
                            </span>
                          )}
                        </div>

                        {/* Info Produk */}
                        <div className="mt-1.5 space-y-1">
                          <div className="flex items-center gap-1.5">
                            <div className="flex items-center -space-x-1">
                              {group.colors.slice(0, 4).map((c) => (
                                <span
                                  key={c.color}
                                  className="w-3 h-3 rounded-full border border-zinc-900 ring-1 ring-zinc-600"
                                  style={{ backgroundColor: c.colorHex }}
                                />
                              ))}
                            </div>
                            <span className="text-[10px] text-zinc-400 font-medium truncate">
                              {group.colors.length} Warna
                            </span>
                          </div>
                          <h4 className="font-bold text-xs text-white line-clamp-1">
                            {group.name}
                          </h4>
                          <div className="flex items-center justify-between pt-1">
                            <div>
                              {defVar.originalPrice && (
                                <p className="text-[10px] text-zinc-500 line-through">
                                  {formatIDR(defVar.originalPrice)}
                                </p>
                              )}
                              <p className="text-xs font-extrabold text-pink-400">
                                {formatIDR(group.minPrice)}
                              </p>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAddToCart(defVar, group.name);
                              }}
                              className="w-7 h-7 rounded-xl bg-pink-500 hover:bg-pink-600 text-white flex items-center justify-center shadow active:scale-90 transition"
                              aria-label="Tambah ke keranjang"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: WISHLIST / FAVORIT */}
          {activeTab === 'wishlist' && (
            <div className="space-y-4">
              <h2 className="text-lg font-extrabold text-white">Produk Favorit ({wishlist.length})</h2>
              {wishlist.length === 0 ? (
                <div className="text-center py-16 bg-zinc-800/40 rounded-3xl border border-zinc-800 space-y-2">
                  <Heart className="w-10 h-10 text-zinc-600 mx-auto" />
                  <p className="text-sm text-zinc-400">Belum ada produk favorit.</p>
                  <button
                    onClick={() => setActiveTab('home')}
                    className="mt-2 bg-pink-500 text-white text-xs font-bold px-4 py-2 rounded-xl"
                  >
                    Jelajahi Produk
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {productGroups.filter(g => wishlist.includes(g.groupId)).map((group) => (
                    <div
                      key={group.groupId}
                      onClick={() => openGroupDetail(group)}
                      className="bg-zinc-800/80 border border-zinc-700/60 p-3.5 rounded-3xl flex items-center justify-between gap-3 cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <ProductImage
                          src={group.defaultVariant.imageLink}
                          alt={group.name}
                          className="w-14 h-14 rounded-2xl shrink-0"
                        />
                        <div className="min-w-0">
                          <h4 className="font-bold text-sm text-white truncate">{group.name}</h4>
                          <p className="text-[11px] text-zinc-400">{group.colors.length} Varian Warna</p>
                          <p className="text-xs font-extrabold text-pink-400 mt-0.5">
                            {formatIDR(group.minPrice)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddToCart(group.defaultVariant, group.name);
                          }}
                          className="p-2.5 bg-pink-500 text-white rounded-xl"
                        >
                          <ShoppingBag className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => toggleWishlist(e, group.groupId)}
                          className="p-2.5 bg-zinc-700 text-zinc-300 rounded-xl"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: PROFIL & GARANSI RESMI */}
          {activeTab === 'profile' && (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-zinc-800 to-zinc-800/60 p-5 rounded-3xl border border-zinc-700/60 flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-pink-500/20 border border-pink-500/40 flex items-center justify-center text-pink-400 font-black text-xl">
                  PX
                </div>
                <div>
                  <h2 className="font-extrabold text-base text-white">Pixel Enthusiast</h2>
                  <p className="text-xs text-zinc-400">Member Divoom Club Indonesia</p>
                  <span className="inline-block mt-1 text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-md font-semibold">
                    1.250 Divoom Points
                  </span>
                </div>
              </div>

              <div className="bg-zinc-800/50 border border-zinc-800 rounded-3xl p-4 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Jaminan Divoom Official Store
                </h3>
                <div className="flex items-center gap-3 text-xs text-zinc-300">
                  <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span>Garansi Resmi 1 Tahun Tukar Baru</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-zinc-300">
                  <Zap className="w-5 h-5 text-amber-400 shrink-0" />
                  <span>100% Terhubung ke Aplikasi Divoom Smart</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-zinc-300">
                  <Truck className="w-5 h-5 text-cyan-400 shrink-0" />
                  <span>Gratis Ongkir Seluruh Indonesia</span>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* --- BOTTOM NAVIGATION BAR (MOBILE ONLY) --- */}
        <nav className="absolute bottom-0 inset-x-0 bg-zinc-950/95 backdrop-blur-md border-t border-zinc-800 px-6 py-3 flex items-center justify-between z-20">
          {[
            { id: 'home', icon: Home, label: 'Beranda' },
            { id: 'catalog', icon: Grid, label: 'Katalog' },
            { id: 'wishlist', icon: Heart, label: 'Favorit', badge: wishlist.length },
            { id: 'livechat', icon: MessageCircle, label: 'Livechat', isAction: true }
          ].map((nav) => {
            const Icon = nav.icon;
            const isActive = nav.isAction ? isLiveChatOpen : activeTab === nav.id;
            return (
              <button
                key={nav.id}
                onClick={() => {
                  if (nav.isAction) {
                    setIsLiveChatOpen(true);
                  } else {
                    setActiveTab(nav.id);
                  }
                }}
                className={`relative flex flex-col items-center gap-1 transition active:scale-90 ${
                  isActive ? 'text-pink-500' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <div className="relative">
                  <Icon className={`w-5 h-5 ${isActive ? 'fill-pink-500/20' : ''}`} />
                  {nav.badge > 0 && (
                    <span className="absolute -top-1 -right-2 bg-pink-500 text-white text-[9px] font-bold w-3.5 h-3.5 rounded-full flex items-center justify-center">
                      {nav.badge}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-semibold">{nav.label}</span>
              </button>
            );
          })}
        </nav>

        {/* --- MODAL / DRAWER LIVECHAT --- */}
        {isLiveChatOpen && (
          <div className="absolute inset-0 z-50 bg-black/70 backdrop-blur-sm flex flex-col justify-end">
            <div className="bg-zinc-900 rounded-t-[32px] border-t border-zinc-700 h-[78%] flex flex-col">
              {/* Livechat Header */}
              <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-pink-500 to-cyan-400 flex items-center justify-center text-zinc-950 font-black text-xs relative">
                    CS
                    <span className="w-2.5 h-2.5 bg-emerald-400 border-2 border-zinc-900 rounded-full absolute bottom-0 right-0" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-white">Divoom Live Support</h3>
                    <p className="text-[10px] text-emerald-400 font-medium">Online • Respon cepat</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsLiveChatOpen(false)}
                  className="p-2 bg-zinc-800 rounded-full text-zinc-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Chat Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col max-w-[82%] ${
                      msg.sender === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'
                    }`}
                  >
                    <div
                      className={`px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed ${
                        msg.sender === 'user'
                          ? 'bg-pink-500 text-white rounded-br-sm'
                          : 'bg-zinc-800 text-zinc-200 border border-zinc-700/60 rounded-bl-sm'
                      }`}
                    >
                      {msg.text}
                    </div>
                    <span className="text-[9px] text-zinc-500 mt-1 px-1">{msg.time}</span>
                  </div>
                ))}
              </div>

              {/* Quick Replies */}
              <div className="px-4 pb-2 flex gap-1.5 overflow-x-auto no-scrollbar">
                {['Cek stok produk', 'Info garansi resmi', 'Cara konek aplikasi'].map((quick) => (
                  <button
                    key={quick}
                    type="button"
                    onClick={() => setChatInput(quick)}
                    className="text-[10px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700/70 px-2.5 py-1 rounded-full whitespace-nowrap"
                  >
                    {quick}
                  </button>
                ))}
              </div>

              {/* Chat Input Form */}
              <form onSubmit={handleSendChat} className="p-3 bg-zinc-950 border-t border-zinc-800 flex items-center gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Tulis pertanyaan Anda..."
                  className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-pink-500"
                />
                <button
                  type="submit"
                  className="p-2.5 bg-pink-500 hover:bg-pink-600 text-white rounded-xl active:scale-95 transition"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        )}

        {/* --- MODAL / DRAWER DETAIL PRODUK (GROUPED BY item_group_id) --- */}
        {selectedGroup && activeDetailVariant && (
          <div className="absolute inset-0 z-40 bg-zinc-900 flex flex-col animate-fadeIn">
            {/* Detail Header */}
            <div className="px-5 py-4 flex items-center justify-between border-b border-zinc-800">
              <button
                onClick={() => setSelectedGroup(null)}
                className="p-2 bg-zinc-800 rounded-xl text-zinc-200 active:scale-95"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Detail Produk
              </span>
              <button
                onClick={(e) => toggleWishlist(e, selectedGroup.groupId)}
                className="p-2 bg-zinc-800 rounded-xl text-zinc-200"
              >
                <Heart
                  className={`w-5 h-5 ${
                    wishlist.includes(selectedGroup.groupId) ? 'fill-pink-500 text-pink-500' : ''
                  }`}
                />
              </button>
            </div>

            {/* Detail Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Showcase Foto Produk + Additional Image Links berdasarkan Color */}
              <div className="space-y-2.5">
                <div className="bg-zinc-950 rounded-3xl overflow-hidden border border-zinc-800 relative aspect-square">
                  <span className="absolute top-3 left-3 z-10 text-[10px] font-bold bg-zinc-950/80 backdrop-blur-md text-pink-300 border border-pink-500/30 px-2.5 py-1 rounded-lg">
                    {selectedGroup.badge}
                  </span>
                  <ProductImage
                    src={activeColorGallery[activeImageIdx] || activeDetailVariant.imageLink}
                    alt={activeDetailVariant.title}
                    className="w-full h-full"
                  />
                </div>

                {/* Thumbnail Additional Images jika ada */}
                {activeColorGallery.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                    {activeColorGallery.map((imgUrl, idx) => (
                      <button
                        key={`${imgUrl}-${idx}`}
                        type="button"
                        onClick={() => setActiveImageIdx(idx)}
                        className={`w-14 h-14 rounded-xl overflow-hidden border-2 shrink-0 transition ${
                          activeImageIdx === idx ? 'border-pink-500 scale-105' : 'border-zinc-800 opacity-70'
                        }`}
                      >
                        <ProductImage src={imgUrl} alt={`Thumbnail ${idx + 1}`} className="w-full h-full" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Judul & Harga (Dinamis berdasarkan Size) */}
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-cyan-400 uppercase">
                    {selectedGroup.category}
                  </span>
                  <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                    {activeDetailVariant.availability}
                  </span>
                </div>
                <h2 className="text-xl font-extrabold text-white mt-1">
                  {activeDetailVariant.title || selectedGroup.name}
                </h2>
                <div className="flex items-baseline gap-2.5 mt-2">
                  <span className="text-xl font-black text-pink-400">
                    {formatIDR(activeDetailVariant.price)}
                  </span>
                  {activeDetailVariant.originalPrice && (
                    <span className="text-xs text-zinc-500 line-through">
                      {formatIDR(activeDetailVariant.originalPrice)}
                    </span>
                  )}
                </div>
              </div>

              {/* Pilihan Varian COLOR (Mengubah image_link & additional_image_link) */}
              {selectedGroup.colors.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-zinc-300 mb-2">
                    Varian Warna: <span className="text-white">{selectedColor}</span>
                  </h4>
                  <div className="flex flex-wrap gap-2.5">
                    {selectedGroup.colors.map((c) => {
                      const isCurrent = c.color === selectedColor;
                      return (
                        <button
                          key={c.color}
                          type="button"
                          onClick={() => handleSelectColor(c.color)}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition ${
                            isCurrent
                              ? 'bg-pink-500/20 border-pink-500 text-white'
                              : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:border-zinc-500'
                          }`}
                        >
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-zinc-500"
                            style={{ backgroundColor: c.colorHex }}
                          />
                          <span>{c.color}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Pilihan Varian SIZE (Mengubah price & sale_price) */}
              {selectedGroup.sizes.length > 0 && !(selectedGroup.sizes.length === 1 && selectedGroup.sizes[0] === 'Standard') && (
                <div>
                  <h4 className="text-xs font-bold text-zinc-300 mb-2">
                    Varian Ukuran / Model: <span className="text-white">{selectedSize}</span>
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedGroup.sizes.map((sz) => {
                      const isCurrent = sz === selectedSize;
                      const variantForSize = selectedGroup.variants.find(v => v.size === sz);
                      return (
                        <button
                          key={sz}
                          type="button"
                          onClick={() => handleSelectSize(sz)}
                          className={`px-3.5 py-2 rounded-xl border text-xs font-bold transition flex flex-col items-start ${
                            isCurrent
                              ? 'bg-cyan-500/20 border-cyan-400 text-white'
                              : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:border-zinc-500'
                          }`}
                        >
                          <span>{sz}</span>
                          {variantForSize && (
                            <span className="text-[10px] font-normal text-zinc-400">
                              {formatIDR(variantForSize.price)}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Deskripsi */}
              <div className="bg-zinc-800/50 p-4 rounded-2xl border border-zinc-800 space-y-2">
                <h4 className="text-xs font-bold text-white">Deskripsi Produk</h4>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  {activeDetailVariant.desc || selectedGroup.desc}
                </p>
                {(activeDetailVariant.richDesc || selectedGroup.richDesc) && (
                  <div
                    className="text-xs text-zinc-400 leading-relaxed pt-2 border-t border-zinc-700/60 space-y-1.5 [&_ul]:list-disc [&_ul]:pl-4 [&_ul]:space-y-1"
                    dangerouslySetInnerHTML={{ __html: activeDetailVariant.richDesc || selectedGroup.richDesc }}
                  />
                )}
              </div>
            </div>

            {/* Bottom Action Bar Detail */}
            <div className="p-4 bg-zinc-950 border-t border-zinc-800 flex gap-3">
              <button
                onClick={() => {
                  handleAddToCart(activeDetailVariant, selectedGroup.name);
                  setSelectedGroup(null);
                }}
                className="flex-1 bg-pink-500 hover:bg-pink-600 text-white font-bold text-sm py-3.5 rounded-2xl shadow-lg shadow-pink-500/25 active:scale-95 transition flex items-center justify-center gap-2"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Tambah ke Keranjang • {formatIDR(activeDetailVariant.price)}</span>
              </button>
            </div>
          </div>
        )}

        {/* --- MODAL / DRAWER KERANJANG BELANJA --- */}
        {isCartOpen && (
          <div className="absolute inset-0 z-50 bg-black/70 backdrop-blur-sm flex flex-col justify-end">
            <div className="bg-zinc-900 rounded-t-[32px] border-t border-zinc-700 max-h-[85%] flex flex-col">
              {/* Cart Header */}
              <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-pink-500" />
                  <h3 className="font-extrabold text-base text-white">
                    Keranjang ({totalCartItems})
                  </h3>
                </div>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="p-2 bg-zinc-800 rounded-full text-zinc-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Cart Items */}
              <div className="flex-1 overflow-y-auto p-5 space-y-3">
                {cart.length === 0 ? (
                  <div className="text-center py-12 space-y-2">
                    <p className="text-sm text-zinc-400">Keranjang belanja Anda masih kosong.</p>
                  </div>
                ) : (
                  cart.map((item, idx) => (
                    <div
                      key={`${item.product.id}-${item.colorLabel}-${item.sizeLabel}`}
                      className="bg-zinc-800/80 border border-zinc-700/60 p-3 rounded-2xl flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <ProductImage
                          src={item.product.imageLink}
                          alt={item.product.displayName || item.product.title}
                          className="w-11 h-11 rounded-xl shrink-0 border border-zinc-700"
                        />
                        <div className="min-w-0">
                          <h4 className="font-bold text-xs text-white truncate">
                            {item.product.displayName || item.product.title}
                          </h4>
                          <p className="text-[10px] text-zinc-400">
                            {item.colorLabel}
                            {item.sizeLabel && item.sizeLabel !== 'Standard' ? ` • ${item.sizeLabel}` : ''}
                          </p>
                          <p className="text-xs font-extrabold text-pink-400 mt-0.5">
                            {formatIDR(item.product.price)}
                          </p>
                        </div>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-2 bg-zinc-900 px-2 py-1 rounded-xl border border-zinc-700">
                        <button
                          onClick={() => updateCartQty(idx, -1)}
                          className="p-1 text-zinc-400 hover:text-white"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-xs font-bold w-4 text-center">{item.qty}</span>
                        <button
                          onClick={() => updateCartQty(idx, 1)}
                          className="p-1 text-zinc-400 hover:text-white"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Cart Footer / Checkout */}
              {cart.length > 0 && (
                <div className="p-5 bg-zinc-950 border-t border-zinc-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-400">Subtotal Produk</span>
                    <span className="text-lg font-black text-white">
                      {formatIDR(totalCartPrice)}
                    </span>
                  </div>
                  <button
                    onClick={handleOpenCheckout}
                    className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold text-sm py-3.5 rounded-2xl shadow-lg active:scale-95 transition flex items-center justify-center gap-2"
                  >
                    <span>Lanjut ke Checkout</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- HALAMAN CHECKOUT LENGKAP (CHECKOUT PAGE) --- */}
        {isCheckoutOpen && (
          <div className="absolute inset-0 z-50 bg-zinc-900 flex flex-col">
            {/* Header Checkout */}
            <div className="px-5 py-4 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between shrink-0">
              <button
                onClick={() => {
                  setIsCheckoutOpen(false);
                  setIsCartOpen(true);
                }}
                className="p-2 bg-zinc-800 rounded-xl text-zinc-200 active:scale-95"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-white">
                Checkout Pesanan
              </h2>
              <div className="w-9" />
            </div>

            {/* Form Konten Checkout (Scrollable dengan ruang bawah untuk BottomActionBar) */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5 pb-28">
              
              {/* 1. Alamat Pengiriman */}
              <div className="bg-zinc-800/60 border border-zinc-700/60 rounded-3xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-pink-400">
                  <MapPin className="w-4 h-4" />
                  <h3 className="text-xs font-extrabold uppercase tracking-wider">
                    Alamat Pengiriman & Kontak
                  </h3>
                </div>

                <div className="space-y-2.5">
                  <div>
                    <label className="text-[11px] text-zinc-400 block mb-1">Nama Penerima</label>
                    <input
                      type="text"
                      required
                      value={shippingAddress.recipient}
                      onChange={(e) => setShippingAddress({ ...shippingAddress, recipient: e.target.value })}
                      placeholder="Nama lengkap penerima"
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-pink-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-zinc-400 block mb-1">Email Pelanggan</label>
                    <input
                      type="email"
                      required
                      value={shippingAddress.email}
                      onChange={(e) => setShippingAddress({ ...shippingAddress, email: e.target.value })}
                      placeholder="budi@example.com"
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-pink-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-zinc-400 block mb-1">Nomor WhatsApp / HP</label>
                    <input
                      type="tel"
                      required
                      value={shippingAddress.phone}
                      onChange={(e) => setShippingAddress({ ...shippingAddress, phone: e.target.value })}
                      placeholder="+628123456789"
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-pink-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-zinc-400 block mb-1">Alamat Lengkap</label>
                    <textarea
                      rows="2"
                      required
                      value={shippingAddress.address}
                      onChange={(e) => setShippingAddress({ ...shippingAddress, address: e.target.value })}
                      placeholder="Jalan, Nomor Rumah, Kecamatan, Kota, Kode Pos"
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-pink-500 resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* 2. Ringkasan Barang */}
              <div className="bg-zinc-800/60 border border-zinc-700/60 rounded-3xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-300">
                    Ringkasan Produk ({totalCartItems})
                  </h3>
                </div>
                <div className="space-y-2.5 divide-y divide-zinc-700/50">
                  {cart.map((item) => (
                    <div key={`${item.product.id}-${item.selectedColor}`} className="pt-2.5 first:pt-0 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className="w-5 h-5 rounded-md border border-zinc-500 shrink-0"
                          style={{ backgroundColor: item.selectedColor }}
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate">{item.product.name}</p>
                          <p className="text-[11px] text-zinc-400">{item.qty} x {formatIDR(item.product.price)}</p>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-zinc-200 shrink-0">
                        {formatIDR(item.product.price * item.qty)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. Opsi Pengiriman */}
              <div className="bg-zinc-800/60 border border-zinc-700/60 rounded-3xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-cyan-400">
                  <Truck className="w-4 h-4" />
                  <h3 className="text-xs font-extrabold uppercase tracking-wider">
                    Metode Pengiriman
                  </h3>
                </div>
                <div className="space-y-2">
                  {SHIPPING_METHODS.map((ship) => {
                    const isSelected = selectedShipping.id === ship.id;
                    return (
                      <button
                        type="button"
                        key={ship.id}
                        onClick={() => setSelectedShipping(ship)}
                        className={`w-full p-3 rounded-2xl border text-left transition flex items-center justify-between ${
                          isSelected
                            ? 'bg-pink-500/15 border-pink-500 text-white'
                            : 'bg-zinc-900/80 border-zinc-700/70 text-zinc-300'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold">{ship.name}</span>
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-zinc-800 text-cyan-300">
                              {ship.badge}
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-400 mt-0.5">Estimasi tiba: {ship.estimate}</p>
                        </div>
                        <span className="text-xs font-extrabold text-pink-400">
                          {ship.price === 0 ? 'GRATIS' : formatIDR(ship.price)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 4. Kode Promo */}
              <div className="bg-zinc-800/60 border border-zinc-700/60 rounded-3xl p-4 space-y-2.5">
                <div className="flex items-center gap-2 text-amber-400">
                  <Tag className="w-4 h-4" />
                  <h3 className="text-xs font-extrabold uppercase tracking-wider">
                    Voucher & Promo
                  </h3>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={promoInput}
                    onChange={(e) => setPromoInput(e.target.value)}
                    placeholder="Masukkan kode (Coba: PIXEL10)"
                    className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white uppercase focus:outline-none focus:border-pink-500"
                  />
                  <button
                    type="button"
                    onClick={handleApplyPromo}
                    className="bg-zinc-700 hover:bg-pink-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition"
                  >
                    Pakai
                  </button>
                </div>
                {appliedPromo && (
                  <div className="flex items-center justify-between text-[11px] bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 px-3 py-1.5 rounded-xl">
                    <span>Promo <b>{appliedPromo.code}</b> aktif (-{formatIDR(appliedPromo.discount)})</span>
                    <button type="button" onClick={() => setAppliedPromo(null)} className="underline">Hapus</button>
                  </div>
                )}
              </div>

              {/* 5. Kasera Payment Gateway (Virtual Account) */}
              <div className="bg-zinc-800/60 border border-zinc-700/60 rounded-3xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-purple-400">
                  <CreditCard className="w-4 h-4" />
                  <h3 className="text-xs font-extrabold uppercase tracking-wider">
                    Kasera Virtual Account
                  </h3>
                </div>
                <div className="space-y-2">
                  {KASERA_PAYMENT_CHANNELS.map((ch) => {
                    const isSelected = selectedKaseraChannel === ch.id;
                    return (
                      <button
                        type="button"
                        key={ch.id}
                        onClick={() => setSelectedKaseraChannel(ch.id)}
                        className={`w-full p-3 rounded-2xl border flex items-center justify-between transition ${
                          isSelected
                            ? 'bg-purple-500/15 border-purple-500 text-white'
                            : 'bg-zinc-900/80 border-zinc-700/70 text-zinc-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <CreditCard className="w-4 h-4 text-purple-400 shrink-0" />
                          <span className="text-xs font-semibold text-left">{ch.name}</span>
                        </div>
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          isSelected ? 'border-purple-400' : 'border-zinc-600'
                        }`}>
                          {isSelected && <div className="w-2 h-2 rounded-full bg-purple-400" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 6. Rincian Biaya */}
              <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-4 space-y-2 text-xs">
                <div className="flex justify-between text-zinc-400">
                  <span>Subtotal Produk</span>
                  <span>{formatIDR(totalCartPrice)}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Ongkos Kirim ({selectedShipping.name.split(' ')[0]})</span>
                  <span>{selectedShipping.price === 0 ? 'Gratis' : formatIDR(selectedShipping.price)}</span>
                </div>
                {appliedPromo && (
                  <div className="flex justify-between text-emerald-400">
                    <span>Diskon Voucher ({appliedPromo.code})</span>
                    <span>-{formatIDR(appliedPromo.discount)}</span>
                  </div>
                )}
                <div className="border-t border-zinc-800 pt-2 mt-2 flex justify-between items-center">
                  <span className="font-bold text-white">Total Tagihan</span>
                  <span className="text-base font-black text-pink-400">{formatIDR(grandTotal)}</span>
                </div>
              </div>
            </div>

            {/* Bottom Action Bar (Fixed di Bawah Layar Checkout) */}
            <div className="absolute bottom-0 inset-x-0 bg-zinc-950/95 backdrop-blur-md border-t border-zinc-800 p-4 flex items-center justify-between gap-4 z-20">
              <div>
                <p className="text-[10px] text-zinc-400 uppercase font-semibold">Total Tagihan</p>
                <p className="text-base font-black text-pink-400">{formatIDR(grandTotal)}</p>
              </div>
              <button
                type="button"
                onClick={handleConfirmOrder}
                disabled={isProcessingPayment}
                className="bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 text-white font-extrabold text-xs sm:text-sm px-6 py-3.5 rounded-2xl shadow-lg shadow-pink-500/25 active:scale-95 transition disabled:opacity-50 flex items-center gap-2"
              >
                {isProcessingPayment && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>{isProcessingPayment ? 'Memproses VA...' : 'Bayar Sekarang'}</span>
              </button>
            </div>
          </div>
        )}

        {/* --- HALAMAN SUKSES PEMBAYARAN (ORDER CONFIRMATION) --- */}
        {orderSuccessData && (
          <div className="absolute inset-0 z-50 bg-zinc-950 p-6 flex flex-col justify-between items-center text-center overflow-y-auto">
            <div className="w-full pt-6 space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-400 shadow-lg shadow-emerald-500/10">
                <PackageCheck className="w-9 h-9" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full">
                  Virtual Account Berhasil Dibuat
                </span>
                <h2 className="text-xl font-black text-white mt-3">
                  Selesaikan Pembayaran
                </h2>
                <p className="text-xs text-zinc-400 mt-1">
                  Silakan transfer ke nomor Virtual Account Kasera di bawah ini.
                </p>
              </div>

              {/* Kartu Struk Digital & Nomor VA */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-4 text-left space-y-3 mt-4">
                <div className="flex justify-between items-center border-b border-zinc-800 pb-2.5">
                  <span className="text-[11px] text-zinc-400">ID Pesanan</span>
                  <span className="text-xs font-mono font-bold text-cyan-400">{orderSuccessData.orderId}</span>
                </div>
                <div className="bg-zinc-950 border border-purple-500/40 p-3 rounded-2xl text-center space-y-1">
                  <span className="text-[10px] text-zinc-400 uppercase tracking-wider">{orderSuccessData.payment}</span>
                  <p className="text-lg font-mono font-black text-purple-300 tracking-wider select-all">{orderSuccessData.virtualAccount}</p>
                  <span className="text-[10px] text-zinc-500">Salin nomor VA untuk pembayaran m-banking / ATM</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[11px] text-zinc-400">Penerima</span>
                  <span className="text-xs font-semibold text-white">{orderSuccessData.address.recipient}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[11px] text-zinc-400">Kurir</span>
                  <span className="text-xs font-semibold text-white">{orderSuccessData.shipping.name}</span>
                </div>
                <div className="border-t border-zinc-800 pt-2.5 flex justify-between items-center">
                  <span className="text-xs font-bold text-zinc-300">Total Tagihan</span>
                  <span className="text-base font-black text-pink-400">{formatIDR(orderSuccessData.totalPaid)}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                setOrderSuccessData(null);
                setActiveTab('home');
              }}
              className="w-full mt-6 bg-white text-zinc-950 font-extrabold text-sm py-3.5 rounded-2xl active:scale-95 transition shadow-lg"
            >
              Kembali ke Beranda
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
