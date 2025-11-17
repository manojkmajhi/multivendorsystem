const NODE_ENV = process.env.NODE_ENV || 'development';
const PORT = process.env.PORT || 3000;

const STATIC_ROOT_CANDIDATES = ['strawhats', 'public'];
const OTP_EXPIRY = 10 * 60 * 1000;

const UPLOAD_LIMITS = {
  fileSize: 5 * 1024 * 1024,
  allowedTypes: /jpeg|jpg|png|gif|webp/
};

const PAGINATION = {
  defaultPageSize: 32,
  maxPageSize: 100
};

const FALLBACK_CATEGORIES = [
  { name: 'Sports', image: '/public/images/Sports.jpg' },
  { name: 'Animals', image: '/public/images/Animals.jpg' },
  { name: 'Movies', image: '' },
  { name: 'Profession', image: '' },
  { name: 'Anime', image: '' },
  { name: 'Cartoon', image: '/public/images/Cartoon.jpg' },
  { name: 'Games', image: '/public/images/Games.jpg' }
];

const FALLBACK_PRODUCTS = [
  { id: '455', name: 'Avengers Logo', price: 45, image: '/media/455_Avengers%20Logo.jpg', type: 'Product', category: 'Marvel-Studios', active: true },
  { id: '516', name: 'God of Beer', price: 45, image: '/media/516_God%20of%20Beer.jpg', type: 'Product', category: 'Marvel-Studios', active: true }
];

module.exports = {
  NODE_ENV,
  PORT,
  STATIC_ROOT_CANDIDATES,
  OTP_EXPIRY,
  UPLOAD_LIMITS,
  PAGINATION,
  FALLBACK_CATEGORIES,
  FALLBACK_PRODUCTS
};