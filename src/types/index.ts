import { Timestamp } from 'firebase/firestore';

// Type for handling both Date and Firestore Timestamp
export type DateOrTimestamp = Date | Timestamp;

// Social Media Links Interface
export interface SocialMediaLinks {
  id: string;
  facebook?: string;
  instagram?: string;
  tiktok?: string;
  youtube?: string;
  createdAt: DateOrTimestamp;
  updatedAt: DateOrTimestamp;
}

// Home Page Settings Interface
export interface HomePageSettings {
  id: string;
  heroVideoLink?: string;
  uploadedVideoUrl?: string; // URL of the uploaded video
  heroTitle?: string;
  heroSubtitle?: string;
  createdAt: DateOrTimestamp;
  updatedAt: DateOrTimestamp;
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  password?: string; // Optional for password updates
  role: 'student' | 'coach' | 'admin' | 'seller' | 'superadmin';
  profileImage?: string;
  phone?: string;
  credits: number;
  referralCode: string;
  referredBy?: string;
  resetCode?: {
    code: string;
    expires: number;
  };
  customEmoji?: string; // URL to custom emoji image
  authProvider?: 'email' | 'google'; // Track authentication provider
  googleUid?: string; // Store Google UID for reference
  createdAt: DateOrTimestamp;
  updatedAt: DateOrTimestamp;
  preferences?: {
    notifications: {
      email: boolean;
      whatsapp: boolean;
      website: boolean;
    };
    twoFactorEnabled?: boolean; // Optional language preference
  };
}

export interface Course {
  id: string;
  title: string;
  description: string;
  price: number; // price per session
  duration: number; // in minutes
  sessions: number; // number of sessions (default 1)
  totalPrice: number; // price * sessions
  maxStudents: number;
  currentStudents: number;
  coachId: string;
  coachName: string;
  coachImage?: string;
  imageUrl: string;
  videoLink?: string; // New field for video link
  category: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  boosted: boolean;
  boostLevel?: 'basic' | 'premium' | 'featured';
  boostEndDate?: DateOrTimestamp;
  averageRating: number;
  totalReviews: number;
  courseContent?: string[]; // What you will learn
  createdAt: DateOrTimestamp;
  updatedAt: DateOrTimestamp;
}

export type OfferPaymentMethod = 'credit_card' | 'twint' | 'gift_card' | 'discount_card';

export interface OfferOption {
  id: string;
  label: string;
  description?: string;
  price: number;
  paymentMethods?: OfferPaymentMethod[];
  notes?: string[];
  isActive?: boolean;
}

export interface Offer {
  id: string;
  coachId: string;
  coachName?: string;
  slug: string;
  title: string;
  subtitle?: string;
  description: string;
  emoji?: string;
  price: number;
  currency: string;
  buttonLabel: string;
  paymentMethods: OfferPaymentMethod[];
  highlightItems?: string[];
  options?: OfferOption[];
  defaultOptionId?: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: DateOrTimestamp;
  updatedAt: DateOrTimestamp;
}

export interface Booking {
  id: string;
  courseId: string;
  studentId: string;
  coachId: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  paymentStatus: 'pending' | 'completed' | 'failed';
  paymentAmount: number;
  scheduledDate: DateOrTimestamp;
  createdAt: DateOrTimestamp;
  updatedAt: DateOrTimestamp;
}

export interface StudentCourseSession {
  id: string;
  studentId: string;
  courseId: string;
  courseName: string;
  coachId: string;
  coachName: string;
  totalSessions: number;
  remainingSessions: number;
  isComplete: boolean;
  purchaseDate: DateOrTimestamp;
  lastSessionDate?: DateOrTimestamp;
  createdAt: DateOrTimestamp;
  updatedAt: DateOrTimestamp;
}

export interface Review {
  id: string;
  courseId: string;
  studentId: string;
  studentName: string;
  studentImage?: string;
  rating: number;
  comment: string;
  helpful?: number;
  coachId?: string;
  createdAt: DateOrTimestamp;
}

export interface ChatMessage {
  id: string;
  courseId: string;
  senderId: string;
  senderName: string;
  senderRole: 'student' | 'coach' | 'admin' | 'superadmin';
  message: string;
  imageUrl?: string; // URL to attached image
  timestamp: DateOrTimestamp;
}

export interface DirectMessage {
  id: string;
  senderId: string;
  receiverId: string;
  senderName: string;
  receiverName: string;
  message: string;
  imageUrl?: string; // URL to attached image
  read: boolean;
  timestamp: DateOrTimestamp;
}

export interface GroupChat {
  id: string;
  name: string;
  description?: string;
  creatorId: string;
  members: string[]; // Array of user IDs
  createdAt: DateOrTimestamp;
  updatedAt: DateOrTimestamp;
}

export interface GroupChatMessage {
  id: string;
  groupId: string;
  senderId: string;
  senderName: string;
  senderRole: 'student' | 'coach' | 'admin' | 'superadmin';
  message: string;
  imageUrl?: string; // URL to attached image
  timestamp: DateOrTimestamp;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'booking' | 'payment' | 'course' | 'referral' | 'system' | 'review' | 'session' | 'order' | 'order_delivery_update' | 'welcome';
  read: boolean;
  createdAt: DateOrTimestamp;
  priority?: 'low' | 'medium' | 'high';
}

export interface Transaction {
  id: string;
  userId: string;
  type: 'topup' | 'course_purchase' | 'referral_bonus' | 'boost_payment' | 'course_boost' | 'subscription_purchase' | 'product_purchase' | 'admin_credit' | 'admin_debit' | 'offer_purchase';
  amount: number;
  description: string;
  status: 'pending' | 'completed' | 'failed';
  createdAt: DateOrTimestamp;
}

export interface OfferPurchase {
  id: string;
  offerId: string;
  offerTitle: string;
  optionId?: string;
  optionLabel?: string;
  purchaserId: string;
  purchaserName: string;
  coachId: string;
  amountPaid: number;
  paymentMethod: 'stripe' | 'paypal' | 'twint' | 'credits' | 'gift-card' | 'discount-card';
  paymentReference?: string;
  status: 'pending' | 'completed' | 'failed';
  createdAt: DateOrTimestamp;
  updatedAt: DateOrTimestamp;
}

export interface CreditTransaction {
  id: string;
  userId: string;
  adminId: string;
  adminName: string;
  type: 'credit' | 'debit';
  amount: number;
  reason: string;
  balanceBefore: number;
  balanceAfter: number;
  createdAt: DateOrTimestamp;
}

export interface PaymentDetails {
  cardNumber: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
  holderName: string;
}

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  keywords: string[];
  category: string;
}

export interface EditableContent {
  id: string;
  type: 'about' | 'privacy' | 'terms';
  title: string;
  content: string;
  imageUrl?: string;
  lastUpdated: DateOrTimestamp;
  lastUpdatedBy: string;
}

export interface CustomEmoji {
  id: string;
  name: string;
  imageUrl: string;
  createdBy: string;
  createdAt: DateOrTimestamp;
}

export interface CourseSchedule {
  id: string;
  courseId: string;
  title: string;
  startTime: DateOrTimestamp;
  endTime: DateOrTimestamp;
  level: 'beginner' | 'intermediate' | 'advanced' | 'all';
  location?: string;
  description?: string;
  createdBy: string;
  createdAt: DateOrTimestamp;
  updatedAt: DateOrTimestamp;
}

// Helmet Reservation Interface
export interface HelmetReservation {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  courseId: string;
  courseName: string;
  scheduleId: string; // Link to specific course schedule
  coachId: string;
  coachName: string;
  reservationDate: DateOrTimestamp; // When the reservation was made
  classDate: DateOrTimestamp; // When the class is scheduled
  classStartTime: DateOrTimestamp;
  classEndTime: DateOrTimestamp;
  location?: string;
  status: 'booked' | 'checked_in' | 'cancelled' | 'no_show';
  checkinTime?: DateOrTimestamp;
  qrCode: string; // User's personal QR code
  createdAt: DateOrTimestamp;
  updatedAt: DateOrTimestamp;
}

// User QR Code Interface
export interface UserQRCode {
  id: string;
  userId: string;
  qrCodeData: string; // Encoded user ID or secure token
  qrCodeImage: string; // Base64 data URL of QR code image
  createdAt: DateOrTimestamp;
  updatedAt: DateOrTimestamp;
}

// Subscription and Session Management Types
export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  type: 'session_pack' | 'annual';
  sessionCount?: number; // for session packs
  price: number;
  isActive: boolean;
  createdBy: string;
  createdAt: DateOrTimestamp;
  updatedAt: DateOrTimestamp;
}

export interface UserSubscription {
  id: string;
  userId: string;
  planId: string;
  planName: string;
  planType: 'session_pack' | 'annual';
  totalSessions?: number; // only for session packs
  remainingSessions?: number; // only for session packs
  startDate: DateOrTimestamp;
  endDate?: DateOrTimestamp; // for annual subscriptions
  status: 'active' | 'expired' | 'cancelled';
  paymentId: string;
  paymentMethod: 'stripe' | 'paypal' | 'credits' | 'gift-card' | 'discount-card';
  amount: number;
  createdAt: DateOrTimestamp;
  updatedAt: DateOrTimestamp;
}

export interface SessionUsage {
  id: string;
  userId: string;
  subscriptionId: string;
  courseId: string;
  courseName: string;
  coachId: string;
  coachName: string;
  sessionDate: DateOrTimestamp;
  status: 'scheduled' | 'attended' | 'missed' | 'cancelled';
  deductedAt: DateOrTimestamp;
  createdAt: DateOrTimestamp;
}

export interface SubscriptionSettings {
  id: string;
  sessionPackPlans: Array<{
    sessionCount: number;
    price: number;
    isActive: boolean;
  }>;
  singleSessionPrice: number;
  annualSubscriptionPrice: number;
  currency: string;
  lastUpdatedBy: string;
  lastUpdatedAt: DateOrTimestamp;
}

export interface BackgroundSettings {
  id: string;
  backgroundImageUrl: string;
  updatedAt?: DateOrTimestamp;
  updatedBy?: string;
}

// Coach Earnings and Withdrawal System (Consolidated)
export interface CoachEarnings {
  id: string;
  coachId: string;
  coachName: string;
  totalEarnings: number;
  totalCommissionDeducted: number;
  netEarnings: number;
  currentBalance: number;
  availableBalance: number;
  totalWithdrawn: number;
  commissionRate: number; // percentage (e.g., 15 for 15%)
  isActive: boolean;
  effectiveDate: DateOrTimestamp;
  setBy: string;
  createdAt: DateOrTimestamp;
  lastUpdated: DateOrTimestamp;
}

export interface EarningTransaction {
  id: string;
  coachId: string;
  studentId: string;
  studentName: string;
  courseId?: string; // Optional for token packages
  courseName?: string; // Optional for token packages
  packageId?: string; // For token packages
  packageName?: string; // For token packages
  grossAmount: number;
  commissionRate: number;
  commissionAmount: number;
  netAmount: number;
  transactionDate: DateOrTimestamp;
  paymentMethod: string;
  status: 'completed' | 'pending' | 'failed';
  type: 'course_purchase' | 'session_purchase' | 'bonus' | 'refund' | 'token_package_purchase';
  createdAt: DateOrTimestamp;
  updatedAt: DateOrTimestamp;
}

export interface WithdrawalRequest {
  id: string;
  coachId: string;
  coachName: string;
  amount: number;
  paymentMethod: string; // 'paypal', 'bank_transfer', 'other'
  paymentDetails: {
    description: string; // free text description
    accountDetails: string; // account number, IBAN, PayPal ID, etc.
  };
  status: 'pending' | 'approved' | 'rejected';
  requestDate: DateOrTimestamp;
  processedDate?: DateOrTimestamp;
  processedBy?: string;
  adminNote?: string;
  rejectionReason?: string;
  notes?: string;
}

// Token Package Interface
export interface TokenPackage {
  id: string;
  coachId: string;
  coachName: string;
  packageName: string;
  description?: string;
  totalTokens: number;
  price: number;
  expiryDate: DateOrTimestamp;
  isActive: boolean;
  createdAt: DateOrTimestamp;
  updatedAt: DateOrTimestamp;
}

// Student Token Package Interface
export interface StudentTokenPackage {
  id: string;
  studentId: string;
  studentName: string;
  packageId: string;
  coachId: string;
  coachName: string;
  packageName: string;
  totalTokens: number;
  remainingTokens: number;
  purchasePrice: number;
  expiryDate: DateOrTimestamp;
  isExpired: boolean;
  purchaseDate: DateOrTimestamp;
  lastUsedDate?: DateOrTimestamp;
  createdAt: DateOrTimestamp;
  updatedAt: DateOrTimestamp;
}

// Token Usage Interface
export interface TokenUsage {
  id: string;
  studentId: string;
  studentName: string;
  studentTokenPackageId: string;
  packageId: string;
  coachId: string;
  coachName: string;
  packageName: string;
  courseId: string;
  courseName: string;
  tokensUsed: number;
  usageDate: DateOrTimestamp;
  createdAt: DateOrTimestamp;
}

// Token Transaction Interface
export interface TokenTransaction {
  id: string;
  studentId: string;
  coachId: string;
  packageId: string;
  studentTokenPackageId: string;
  type: 'purchase' | 'usage' | 'refund' | 'expiry';
  amount: number;
  tokensInvolved: number;
  description: string;
  paymentId?: string;
  paymentMethod?: 'stripe' | 'paypal' | 'twint' | 'credits' | 'gift-card' | 'discount-card';
  status: 'completed' | 'pending' | 'failed';
  createdAt: DateOrTimestamp;
  updatedAt: DateOrTimestamp;
}

// Publication Wall Interfaces
export interface Publication {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: 'student' | 'coach' | 'admin' | 'seller' | 'superadmin';
  authorProfileImage?: string;
  caption: string;
  mediaType: 'image' | 'video';
  mediaUrl: string; // Cloudinary URL for uploaded media
  externalMediaUrl?: string; // External link (YouTube, TikTok, etc.)
  socialMediaLinks?: {
    instagram?: string;
    facebook?: string;
    tiktok?: string;
    youtube?: string;
  };
  likes: number;
  comments: number;
  shares: number;
  width: number;
  height: number;
  saves: number;
  isModerated: boolean;
  moderatedBy?: string;
  moderatedAt?: DateOrTimestamp;
  moderationReason?: string;
  createdAt: DateOrTimestamp;
  updatedAt: DateOrTimestamp;
}

export interface PublicationLike {
  id: string;
  publicationId: string;
  userId: string;
  createdAt: DateOrTimestamp;
}

export interface PublicationComment {
  id: string;
  publicationId: string;
  authorId: string;
  authorName: string;
  authorProfileImage?: string;
  authorRole: 'student' | 'coach' | 'admin' | 'seller' | 'superadmin';
  comment: string;
  parentCommentId?: string; // For replies
  likes: number;
  createdAt: DateOrTimestamp;
  updatedAt: DateOrTimestamp;
}

export interface PublicationCommentLike {
  id: string;
  commentId: string;
  userId: string;
  createdAt: DateOrTimestamp;
}

export interface PublicationSave {
  id: string;
  publicationId: string;
  userId: string;
  folderId?: string;
  createdAt: DateOrTimestamp;
}

export interface SaveFolder {
  id: string;
  userId: string;
  name: string;
  description?: string;
  publicationCount: number;
  createdAt: DateOrTimestamp;
  updatedAt: DateOrTimestamp;
}

export interface PublicationShare {
  id: string;
  publicationId: string;
  userId: string;
  shareType: 'facebook' | 'twitter' | 'whatsapp' | 'linkedin' | 'copy_link';
  createdAt: DateOrTimestamp;
}

// Partnership Request Interface
export interface PartnershipRequest {
  id: string;
  partnershipType: string[];
  partnershipTypeOther?: string;
  organizationName: string;
  contactName: string;
  email: string;
  phone?: string;
  entityType: string;
  message: string;
  meetingDate: string;
  meetingStartTime: string;
  meetingEndTime: string;
  attachments: string[];
  status: 'pending' | 'approved' | 'rejected';
  adminNotes?: string;
  // Dynamic fields based on partnership type
  danceStyles?: string;
  expectedStudents?: string;
  eventType?: string;
  expectedAttendees?: string;
  specialization?: string;
  yearsOfExperience?: string;
  // Social media profiles
  linkedinProfile?: string;
  organizationWebsite?: string;
  createdAt: DateOrTimestamp;
  updatedAt: DateOrTimestamp;
}

// Partnership Content Interface (editable from admin)
export interface PartnershipContent {
  id: string;
  title: string;
  subtitle: string;
  opportunities: {
    [key: string]: {
      title: string;
      description: string;
    };
  };
  createdAt: DateOrTimestamp;
  updatedAt: DateOrTimestamp;
}

// Partnership Meeting Interface
export interface PartnershipMeeting {
  id: string;
  partnershipRequestId: string;
  title: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  location?: string;
  attendeeEmail: string;
  attendeeName: string;
  organizationName: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  googleCalendarEventId?: string;
  createdAt: DateOrTimestamp;
  updatedAt: DateOrTimestamp;
}

// Marketplace Types

// Seller Application Interface
export interface SellerApplication {
  id: string;
  userId: string;
  fullName: string;
  address: string;
  phone: string;
  email: string;
  idDocumentUrl: string;
  diplomaCertificateUrl?: string;
  socialMediaLinks?: {
    instagram?: string;
    facebook?: string;
    tiktok?: string;
    youtube?: string;
    website?: string;
  };
  activityType: 'products' | 'food' | 'services';
  businessName?: string;
  businessDescription: string;
  businessCategory: string;
  vatNumber?: string;
  bankDetails?: {
    accountName: string;
    accountNumber: string;
    bankName: string;
    iban?: string;
    swiftCode?: string;
  };
  subscriptionModel: 'monthly' | 'commission';
  monthlySubscriptionPrice?: number;
  commissionRate?: number;
  status: 'pending' | 'approved' | 'rejected';
  adminNotes?: string;
  rejectionReason?: string;
  processedBy?: string;
  processedAt?: DateOrTimestamp;
  createdAt: DateOrTimestamp;
  updatedAt: DateOrTimestamp;
}

// Seller Profile Interface
export interface SellerProfile {
  id: string;
  userId: string;
  applicationId: string;
  businessName: string;
  businessDescription: string;
  businessCategory: string;
  activityType: 'products' | 'food' | 'services';
  country: string;
  address: string;
  phone: string;
  email: string;
  businessLogo?: string;
  businessImages?: string[];
  subscriptionModel: 'monthly' | 'commission';
  monthlySubscriptionPrice: number;
  commissionRate: number;
  vatRate: number;
  isActive: boolean;
  totalSales: number;
  totalOrders: number;
  rating: number;
  reviewCount: number;
  subscriptionStatus: 'active' | 'inactive' | 'suspended';
  lastPaymentDate?: DateOrTimestamp;
  nextPaymentDate?: DateOrTimestamp;
  bankDetails?: {
    accountName: string;
    accountNumber: string;
    bankName: string;
    iban?: string;
    swiftCode?: string;
  };
  socialMediaLinks?: {
    instagram?: string;
    facebook?: string;
    tiktok?: string;
    youtube?: string;
    website?: string;
  };
  createdAt: DateOrTimestamp;
  updatedAt: DateOrTimestamp;
}

// Product Categories Interface
export interface ProductCategory {
  id: string;
  name: string;
  description: string;
  icon?: string;
  parentCategoryId?: string;
  isActive: boolean;
  sortOrder: number;
  createdBy: string;
  createdAt: DateOrTimestamp;
  updatedAt: DateOrTimestamp;
}

// Product Interface
export interface Product {
  id: string;
  sellerId: string;
  sellerName: string;
  businessName: string;
  name: string;
  description: string;
  shortDescription?: string;
  categoryId: string;
  categoryName: string;
  price: number;
  salePrice?: number;
  currency: string;
  images: string[]; // Array of uploaded/cloudinary image URLs
  imageLinks?: string[]; // Array of external image links
  videoLinks?: string[]; // Array of video links (YouTube, etc.)
  mainImage: string;
  stock: number;
  isUnlimitedStock: boolean;
  minOrderQuantity: number;
  maxOrderQuantity?: number;
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
  tags?: string[];
  serviceType?: 'delivery' | 'pickup' | 'dine-in' | 'home-service';
  deliveryInfo?: {
    freeDeliveryThreshold?: number;
    deliveryFee: number;
    estimatedDeliveryTime: string;
    deliveryAreas?: string[];
  };
  locationInfo?: {
    address?: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
    openingHours?: {
      [day: string]: {
        open: string;
        close: string;
        closed: boolean;
      };
    };
  };
  nutritionInfo?: {
    calories?: number;
    allergens?: string[];
    ingredients?: string[];
    isVegan?: boolean;
    isVegetarian?: boolean;
    isGlutenFree?: boolean;
  };
  vatRate?: number; // VAT rate percentage (e.g., 7.7 for 7.7%)
  customVatRate?: number; // Custom VAT rate if different from standard options
  deliverySettings?: {
    fee: number;
    freeThreshold?: number;
    estimatedTime?: string;
  };
  // Product Variants System
  hasVariants?: boolean; // Whether this product has variants
  variantTypes?: ProductVariantType[]; // Available variant types (Size, Color, etc.)
  variants?: ProductVariant[]; // Available variants
  material?: string; // Product material/composition
  isActive: boolean;
  isFeatured: boolean;
  views: number;
  totalSold: number;
  rating: number;
  reviewCount: number;
  createdAt: DateOrTimestamp;
  updatedAt: DateOrTimestamp;
}

// Product Variant Type Interface (e.g., Size, Color, Material, etc.)
export interface ProductVariantType {
  id: string;
  name: string; // Size, Color, Length, Format, Style, etc.
  displayName: string; // User-friendly name
  type: 'size' | 'color' | 'material' | 'length' | 'format' | 'style' | 'custom';
  options: ProductVariantOption[];
  required: boolean;
  multiSelect: boolean;
  sortOrder: number;
  // Seller-specific fields
  sellerId: string; // Email of the seller who created this variant type
  sellerName: string; // Name of the seller's business
  productCategories: string[]; // Categories this variant type applies to
  isActive: boolean;
  createdAt: DateOrTimestamp;
  updatedAt: DateOrTimestamp;
}

// Product Variant Option Interface (e.g., XS, S, M, L or Red, Blue, etc.)
export interface ProductVariantOption {
  id: string;
  value: string; // The actual value (e.g., "XS", "Red", "Cotton")
  displayValue: string; // User-friendly display value
  colorHex?: string; // For color options
  image?: string; // For options with specific images
  sortOrder: number;
  isActive: boolean;
}

// Product Variant Interface (specific combination like Size M + Color Red)
export interface ProductVariant {
  id: string;
  productId: string;
  combinations: { [variantTypeId: string]: string }; // e.g., { "size": "M", "color": "Red" }
  sku: string; // Unique SKU for this variant
  price: number; // Price for this specific variant
  salePrice?: number; // Sale price if applicable
  stock: number; // Stock for this specific variant
  weight?: number; // Weight for this variant (for shipping calculation)
  images?: string[]; // Specific images for this variant
  isActive: boolean;
  isDefault: boolean; // Whether this is the default selected variant
  createdAt: DateOrTimestamp;
  updatedAt: DateOrTimestamp;
}

// Order Interface
export interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  sellerId: string;
  sellerName: string;
  businessName: string;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  vatAmount: number;
  vatRate: number;
  totalAmount: number;
  currency: string;
  paymentMethod: 'stripe' | 'paypal' | 'credits' | 'gift-card' | 'discount-card';
  paymentId: string;
  paymentStatus: 'pending' | 'completed' | 'failed' | 'refunded';
  orderStatus: 'processing' | 'confirmed' | 'preparing' | 'dispatched' | 'delivered' | 'cancelled';
  deliveryType: 'delivery' | 'pickup' | 'dine-in' | 'home-service';
  deliveryAddress?: {
    fullName: string;
    address: string;
    city: string;
    postalCode: string;
    country: string;
    phone: string;
    notes?: string;
  };
  estimatedDeliveryTime?: string;
  actualDeliveryTime?: DateOrTimestamp;
  trackingInfo?: {
    carrier?: string;
    trackingNumber?: string;
    trackingUrl?: string;
    currentStatus?: string;
    lastUpdate?: DateOrTimestamp;
  };
  notes?: string;
  sellerNotes?: string;
  cancelReason?: string;
  createdAt: DateOrTimestamp;
  updatedAt: DateOrTimestamp;
}

// Order Item Interface
export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  productImage: string;
  price: number;
  quantity: number;
  subtotal: number;
  // Variant information
  variantId?: string; // ID of the specific variant
  variantSku?: string; // SKU of the variant
  variantDetails?: {
    combinations: { [variantTypeId: string]: string }; // e.g., { "size": "M", "color": "Red" }
    displayText: string; // e.g., "Size: M, Color: Red"
    weight?: number; // Variant-specific weight
  };
  selectedOptions?: {
    [key: string]: string;
  };
  specialInstructions?: string;
}

// Product Review Interface
export interface ProductReview {
  id: string;
  productId: string;
  orderId: string;
  customerId: string;
  customerName: string;
  sellerId: string;
  rating: number;
  comment: string;
  images?: string[];
  isVerifiedPurchase: boolean;
  isModerated: boolean;
  moderatedBy?: string;
  moderatedAt?: DateOrTimestamp;
  helpfulVotes: number;
  createdAt: DateOrTimestamp;
  updatedAt: DateOrTimestamp;
}

// Delivery Tracking Interface
export interface DeliveryTracking {
  id: string;
  orderId: string;
  customerId: string;
  sellerId: string;
  trackingNumber: string;
  carrier?: string;
  status: 'processing' | 'dispatched' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'exception';
  estimatedDeliveryDate: DateOrTimestamp;
  deliveryAddress: string;
  trackingEvents: TrackingEvent[];
  createdAt: DateOrTimestamp;
  updatedAt: DateOrTimestamp;
}

// Tracking Event Interface
export interface TrackingEvent {
  id: string;
  status: string;
  description: string;
  location?: string;
  timestamp: DateOrTimestamp;
}

// Seller Earnings Interface
export interface SellerEarnings {
  id: string;
  sellerId: string;
  sellerName: string;
  businessName: string;
  totalRevenue: number;
  totalOrders: number;
  subscriptionFees: number;
  commissionFees: number;
  netEarnings: number;
  availableBalance: number;
  totalWithdrawn: number;
  subscriptionModel: 'monthly' | 'commission';
  monthlySubscriptionPrice: number;
  commissionRate: number;
  lastCalculatedAt: DateOrTimestamp;
  createdAt: DateOrTimestamp;
  updatedAt: DateOrTimestamp;
}

// Seller Transaction Interface
export interface SellerTransaction {
  id: string;
  sellerId: string;
  orderId?: string;
  type: 'sale' | 'commission_fee' | 'subscription_fee' | 'withdrawal' | 'refund';
  amount: number;
  currency: string;
  description: string;
  status: 'completed' | 'pending' | 'failed';
  paymentMethod?: string;
  paymentId?: string;
  createdAt: DateOrTimestamp;
}

// Marketplace Settings Interface
export interface MarketplaceSettings {
  id: string;
  commissionRates: {
    products: number;
    food: number;
    services: number;
  };
  subscriptionPrices: {
    products: number;
    food: number;
    services: number;
  };
  vatRates: {
    [country: string]: number;
  };
  deliverySettings: {
    maxDeliveryDistance: number;
    baseDeliveryFee: number;
    freeDeliveryThreshold: number;
  };
  paymentSettings: {
    allowCredits: boolean;
    minimumOrderAmount: number;
  };
  moderationSettings: {
    autoApproveProducts: boolean;
    autoApproveReviews: boolean;
  };
  updatedBy: string;
  updatedAt: DateOrTimestamp;
}

// Gift Card Interface
export interface GiftCard {
  id: string;
  issuerId: string; // seller or coach ID
  issuerType: 'seller' | 'coach';
  issuerName: string;
  businessName?: string;
  cardCode: string; // unique hash code
  qrCodeImage: string; // base64 or URL to QR code image
  amount: number;
  currency: string;
  isActive: boolean;
  isUsed: boolean;
  usedAt?: DateOrTimestamp;
  usedBy?: string; // customer ID who used it
  usedByName?: string;
  usedForOrderId?: string;
  usedForBookingId?: string;
  usageAmount?: number; // amount actually used (for partial usage)
  remainingAmount: number; // for partial usage
  expirationDate: DateOrTimestamp;
  description?: string;
  createdAt: DateOrTimestamp;
  updatedAt: DateOrTimestamp;
}

// Gift Card Transaction Interface
export interface GiftCardTransaction {
  id: string;
  giftCardId: string;
  customerId: string;
  customerName: string;
  orderId?: string;
  bookingId?: string;
  amountUsed: number;
  transactionType: 'redemption' | 'partial_redemption';
  createdAt: DateOrTimestamp;
}

// Discount Card Interface
export interface DiscountCard {
  id: string;
  coachId: string;
  coachName: string;
  title: string;
  description?: string;
  code: string;
  discountPercentage?: number; // Optional - only for percentage discount
  usageLimit?: number;
  usageCount: number;
  expiryDate: DateOrTimestamp;
  isActive: boolean;
  createdAt: DateOrTimestamp;
  updatedAt: DateOrTimestamp;
  // Optional fields for targeting
  userEmail?: string; // For student-specific cards
  userId?: string; // Student user ID
  userName?: string; // Student name
  courseId?: string; // For course-specific cards
  courseName?: string; // Course name for display
  cardType?: 'student' | 'course'; // Type of discount card
  
  // New fields for simplified flow
  advantageType: 'free' | 'special_price' | 'percentage_discount'; // Advantage type
  value?: number; // Special price amount or percentage value
  recurringSchedule?: string[]; // Array of schedule IDs or time slot identifiers like "Wednesday-18:30"
  qrCodeImage?: string; // Base64 QR code image
}

// Referral Interface
export interface Referral {
  id: string;
  sponsorId: string;
  sponsorName: string;
  sponsorEmail: string;
  refereeId: string;
  refereeName: string;
  refereeEmail: string;
  referralCode: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: DateOrTimestamp;
  approvedAt?: DateOrTimestamp;
  rejectedAt?: DateOrTimestamp;
  approvedBy?: string;
  approvedByName?: string;
  rejectedBy?: string;
  rejectedByName?: string;
  rejectionReason?: string;
  rewardAmount?: number;
  createdAt: DateOrTimestamp;
  updatedAt: DateOrTimestamp;
}

// Coach Referral Activity Interface - tracks course purchases made with referral codes
export interface CoachReferralActivity {
  id: string;
  coachId: string; // Coach who will see this activity in their dashboard
  coachName: string;
  courseId: string;
  courseName: string;
  purchaserUserId: string; // User who bought the course
  purchaserName: string;
  purchaserEmail: string;
  referrerUserId: string; // User whose referral code was used
  referrerName: string;
  referrerEmail: string;
  referralCode: string;
  purchaseAmount: number;
  purchaseDate: DateOrTimestamp;
  rewardStatus: 'pending' | 'rewarded_both' | 'rewarded_purchaser' | 'rewarded_referrer' | 'no_reward';
  purchaserReward?: {
    type: 'credits' | 'course';
    amount?: number; // For credits
    courseId?: string; // For course reward
    courseName?: string;
    sessions?: number; // Number of sessions granted
    rewardedAt: DateOrTimestamp;
    rewardedBy: string; // Coach ID
  };
  referrerReward?: {
    type: 'credits' | 'course';
    amount?: number; // For credits
    courseId?: string; // For course reward
    courseName?: string;
    sessions?: number; // Number of sessions granted
    rewardedAt: DateOrTimestamp;
    rewardedBy: string; // Coach ID
  };
  createdAt: DateOrTimestamp;
  updatedAt: DateOrTimestamp;
}

// Coach Referral License Interface - tracks coach permissions for referral system
export interface CoachReferralLicense {
  id: string;
  coachId: string;
  coachName: string;
  coachEmail: string;
  isEnabled: boolean;
  enabledBy?: string; // Admin ID who enabled
  enabledByName?: string;
  disabledBy?: string; // Admin ID who disabled
  disabledByName?: string;
  disabledReason?: string;
  enabledAt?: DateOrTimestamp;
  disabledAt?: DateOrTimestamp;
  violationCount?: number; // Track violations for future reference
  notes?: string; // Admin notes
  createdAt: DateOrTimestamp;
  updatedAt: DateOrTimestamp;
}

// Coach Referral Stats Interface - aggregated stats for each coach
export interface CoachReferralStats {
  id: string;
  coachId: string;
  totalReferralPurchases: number;
  totalRewardsGiven: number;
  totalCreditsRewarded: number;
  totalCourseSessionsRewarded: number;
  lastActivityDate?: DateOrTimestamp;
  monthlyStats: {
    [month: string]: { // Format: "2024-01"
      purchases: number;
      rewardsGiven: number;
      creditsRewarded: number;
      sessionsRewarded: number;
    };
  };
  createdAt: DateOrTimestamp;
  updatedAt: DateOrTimestamp;
}
