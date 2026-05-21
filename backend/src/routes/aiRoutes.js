import { Router } from "express";
import { query } from "../config/db.js";
import {
  chatCompletion,
  detectLanguage,
  getSarvamStatus,
  speechToText,
  textToSpeech,
  translateText,
  transliterateText,
} from "../services/sarvamService.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getRobotDatasetStats, matchRobotDataset } from "../services/robotDataset.js";

const router = Router();
const DEFAULT_MODELS = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.0-flash-lite"];
const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);
const MODEL_RETRY_COUNT = 0;
const REQUEST_TIMEOUT_MS = 6500;
const CHAT_FAST_REPLY_MS = 4500;
const LANGUAGE_DETECT_TIMEOUT_MS = 850;
const DEFAULT_OPENAI_MODEL = "gpt-4.1-mini";

const ADMIN_PROFILE = {
  name: "Surender Dubey",
  email: "surenderdubey9582@gmail.com",
  mobile: "9582514339",
  address: "Delhi, Karol Bagh",
  github: "https://github.com/Surenderdubeyofficial",
  linkedin: "https://www.linkedin.com/in/surenderdubey/",
};

const APP_CONTEXT = `
You are KrishiNova AI, the in-app assistant for KrishiNova Smart Farming Exchange.

About this app:
- Roles: farmer, customer, admin.
- Farmer features: profile, verification, add/edit/delete products, stock, own orders, accept/reject orders, status updates, earnings, payouts, chat, reviews, AI crop tools, fertilizer, weather, news.
- Customer features: profile, browse/search/filter crops, cart, order, Razorpay payment, own orders, invoice, tracking, chat, delivery confirmation, review, dispute/refund.
- Admin features: verify farmers, approve listings, users, all orders/payments, commission, payouts, disputes/refunds, block/unblock, analytics, featured listings, contacts.
- Cash flow: customer pays platform, payment becomes HELD, commission is deducted, payout waits until delivery confirmation, admin releases payout, platform keeps commission.
- Farmer government-service guidance: Gram Panchayat/Sachiv, Patwari/Lekhpal, CSC, Krishi Vigyan Kendra, agriculture department, PM-Kisan, Soil Health Card, Kisan Credit Card, crop insurance, mandi/MSP, FPO/cooperative and subsidy navigation. Explain likely documents and offices, but do not promise eligibility.
- Customer help guidance: crop comparison, verified farmer badge, safe payment, invoice, order chat, delivery confirmation, dispute/refund proof and support contact.
- Admin operations guidance: verification checklist, listing approval checklist, payment audit trail, payout release after delivery confirmation, dispute proof review, refund decision, user blocking and commission analytics.
- Creator/admin identity: KrishiNova and this assistant were made/administered by Surender Dubey. Admin contact: email surenderdubey9582@gmail.com, mobile 9582514339, address Delhi, Karol Bagh, GitHub https://github.com/Surenderdubeyofficial, LinkedIn https://www.linkedin.com/in/surenderdubey/.

Behavior:
- Act like a smart in-app robot named KrishiNova Sahayak.
- Always answer in the selected user language. Do not fall back to Hindi or English unless requested.
- Prefer direct, short, spoken answers.
- Give clear steps with page/tab names.
- Remember and use the user's name when the user says "my name is ...".
- If asked who made you, who created you, owner, admin, or about Surender Dubey, answer with the creator/admin facts above.
- If asked to introduce the app, explain farmer, customer, admin and payment/payout workflow.
- For farming questions, give practical safe guidance and ask for location/soil/season when needed.
- If the local guide cannot answer, answer normally using the live AI provider.
`.trim();

const LANGUAGE_NAMES = {
  "en-IN": "English",
  "hi-IN": "Hindi",
  "bho-IN": "Bhojpuri",
  "hry-IN": "Haryanvi",
  "raj-IN": "Rajasthani",
  "chg-IN": "Chhattisgarhi",
  "as-IN": "Assamese",
  "brx-IN": "Bodo",
  "doi-IN": "Dogri",
  "gu-IN": "Gujarati",
  "kn-IN": "Kannada",
  "kok-IN": "Konkani",
  "ks-IN": "Kashmiri",
  "mai-IN": "Maithili",
  "ml-IN": "Malayalam",
  "mni-IN": "Manipuri",
  "ta-IN": "Tamil",
  "te-IN": "Telugu",
  "mr-IN": "Marathi",
  "ne-IN": "Nepali",
  "od-IN": "Odia",
  "pa-IN": "Punjabi",
  "sa-IN": "Sanskrit",
  "sat-IN": "Santali",
  "sd-IN": "Sindhi",
  "bn-IN": "Bengali",
  "ur-IN": "Urdu",
};

const FALLBACK_BY_LANGUAGE = {
  en: "I can help with buying crops, selling crops, orders, payment, payout, invoice, chat, dispute, admin work, weather, news, crop advice, fertilizer, and app navigation. Ask in your own words.",
  hi: "मैं फसल खरीदने, बेचने, ऑर्डर, पेमेंट, payout, invoice, chat, dispute, admin काम, मौसम, खबर, crop advice और fertilizer में मदद कर सकता हूं। आप अपने शब्दों में पूछिए।",
  kn: "ನಾನು ಬೆಳೆ ಖರೀದಿ, ಮಾರಾಟ, order, payment, payout, invoice, chat, dispute, admin ಕೆಲಸ, ಹವಾಮಾನ, news, crop advice ಮತ್ತು fertilizer ವಿಷಯಗಳಲ್ಲಿ ಸಹಾಯ ಮಾಡಬಹುದು. ನಿಮ್ಮ ಮಾತಿನಲ್ಲಿ ಕೇಳಿ.",
  ta: "பயிர் வாங்குதல், விற்பனை, order, payment, payout, invoice, chat, dispute, admin வேலை, weather, news, crop advice, fertilizer அனைத்திலும் உதவ முடியும். உங்கள் சொற்களில் கேளுங்கள்.",
  te: "పంట కొనడం, అమ్మడం, order, payment, payout, invoice, chat, dispute, admin పని, weather, news, crop advice, fertilizer విషయంలో సహాయం చేస్తాను. మీ మాటల్లో అడగండి.",
  mr: "मी पीक खरेदी, विक्री, order, payment, payout, invoice, chat, dispute, admin काम, हवामान, news, crop advice आणि fertilizer मध्ये मदत करू शकतो. तुमच्या शब्दांत विचारा.",
  bn: "আমি ফসল কেনা, বিক্রি, order, payment, payout, invoice, chat, dispute, admin কাজ, weather, news, crop advice এবং fertilizer বিষয়ে সাহায্য করতে পারি। নিজের ভাষায় প্রশ্ন করুন।",
};

const PROJECT_INTRO = {
  name: "KrishiNova Smart Farming Exchange",
  purpose:
    "A smart agriculture platform where farmers sell crops directly, customers buy safely, and admins manage trust, verification, payments, payouts and disputes.",
  features: [
    "Farmer profile, verification, crop listing, stock, orders, delivery status, earnings and payouts",
    "Customer crop search, filters, cart, order, Razorpay payment, invoice, tracking, chat, review and dispute/refund",
    "Admin farmer verification, listing approval, users, payments, commission, payouts, disputes, contacts, analytics and featured listings",
    "AI Sahayak for multilingual chat, voice, farming advice, weather/news guidance, app navigation and command execution",
  ],
  technologies: [
    "React and Vite frontend",
    "Express.js backend",
    "MySQL database",
    "Gemini live AI with local guide fallback",
    "Sarvam AI for speech, translation and multilingual voice",
    "Razorpay payment flow",
  ],
  workflow:
    "Farmers list verified crops, customers place paid orders, platform holds payment, commission is calculated, delivery is confirmed, and admin releases farmer payout.",
};

const ANSWERS = {
  help: {
    en: "I can guide and operate KrishiNova. Say: open marketplace, open orders, add product, buy crops, open invoice, open weather, open payouts, or ask any farming question.",
    hi: "मैं KrishiNova चलाने में मदद कर सकता हूं। बोलिए: marketplace खोलो, orders खोलो, product जोड़ो, फसल खरीदो, invoice खोलो, weather खोलो, payouts खोलो, या खेती का सवाल पूछिए।",
    kn: "ನಾನು KrishiNova ಬಳಸಲು ಸಹಾಯ ಮಾಡುತ್ತೇನೆ. ಹೇಳಿ: marketplace ತೆರೆ, orders ತೆರೆ, product ಸೇರಿಸು, ಬೆಳೆ ಖರೀದಿ, invoice ತೆರೆ, weather ತೆರೆ, payouts ತೆರೆ, ಅಥವಾ ಕೃಷಿ ಪ್ರಶ್ನೆ ಕೇಳಿ.",
    ta: "KrishiNova பயன்படுத்த உதவுவேன். சொல்லுங்கள்: marketplace திற, orders திற, product சேர்க்க, பயிர் வாங்க, invoice திற, weather திற, payouts திற, அல்லது விவசாய கேள்வி கேளுங்கள்.",
    te: "KrishiNova ఉపయోగించడానికి సహాయం చేస్తాను. చెప్పండి: marketplace open, orders open, product add, crops buy, invoice open, weather open, payouts open, లేదా farming question అడగండి.",
    mr: "मी KrishiNova वापरायला मदत करतो. बोला: marketplace उघडा, orders उघडा, product जोडा, crop buy, invoice उघडा, weather उघडा, payouts उघडा, किंवा शेतीचा प्रश्न विचारा.",
    bn: "আমি KrishiNova চালাতে সাহায্য করব। বলুন: marketplace খুলুন, orders খুলুন, product add, crop buy, invoice খুলুন, weather খুলুন, payouts খুলুন, বা কৃষি প্রশ্ন করুন।",
  },
  app_overview: {
    en: "KrishiNova is an agriculture marketplace. Farmers sell crops directly, customers buy and track orders, and admin controls verification, listings, commission, payouts, disputes, and platform trust.",
    hi: "KrishiNova एक agriculture marketplace है। किसान फसल बेचते हैं, customer फसल खरीदते और order track करते हैं, और admin verification, listing, commission, payout, dispute और trust संभालता है।",
    kn: "KrishiNova ಕೃಷಿ marketplace. ರೈತರು ಬೆಳೆ ಮಾರುತ್ತಾರೆ, customer ಖರೀದಿ ಮಾಡಿ order track ಮಾಡುತ್ತಾರೆ, admin verification, listings, commission, payout, dispute ನೋಡುತ್ತಾರೆ.",
    ta: "KrishiNova ஒரு agriculture marketplace. Farmers crops விற்கிறார்கள், customers வாங்கி orders track செய்கிறார்கள், admin verification, listings, commission, payout, dispute பார்த்துக்கொள்கிறார்.",
    te: "KrishiNova agriculture marketplace. Farmers crops అమ్ముతారు, customers కొనుగోలు చేసి orders track చేస్తారు, admin verification, listings, commission, payout, dispute నిర్వహిస్తారు.",
    mr: "KrishiNova agriculture marketplace आहे. Farmers crops विकतात, customers खरेदी करून orders track करतात, admin verification, listings, commission, payout, dispute सांभाळतो.",
    bn: "KrishiNova একটি agriculture marketplace. Farmers crops বিক্রি করেন, customers কিনে orders track করেন, আর admin verification, listings, commission, payout, dispute সামলায়।",
  },
  robot_intro: {
    en: "I am KrishiNova Sahayak, your smart farming robot. I can introduce the app, guide farmers to sell crops, guide customers to buy and track orders, help admin manage verification, payments, payouts and disputes, and answer farming questions in your selected language.",
    hi: "मैं KrishiNova Sahayak हूं, आपका स्मार्ट खेती रोबोट। मैं ऐप समझा सकता हूं, किसानों को फसल बेचने में, ग्राहकों को खरीदारी और ऑर्डर ट्रैकिंग में, और admin को verification, payment, payout और dispute संभालने में मदद करता हूं।",
  },
  creator: {
    en: `I was made for KrishiNova by ${ADMIN_PROFILE.name}. Admin contact: email ${ADMIN_PROFILE.email}, mobile ${ADMIN_PROFILE.mobile}, address ${ADMIN_PROFILE.address}. GitHub: ${ADMIN_PROFILE.github}. LinkedIn: ${ADMIN_PROFILE.linkedin}.`,
    hi: `मुझे KrishiNova के लिए ${ADMIN_PROFILE.name} ने बनाया और administer किया है। Admin contact: email ${ADMIN_PROFILE.email}, mobile ${ADMIN_PROFILE.mobile}, address ${ADMIN_PROFILE.address}. GitHub: ${ADMIN_PROFILE.github}. LinkedIn: ${ADMIN_PROFILE.linkedin}.`,
  },
  remember_name: {
    en: "Nice to meet you, {name}. I will remember your name in this chat. I can now guide you through farmer selling, customer buying, orders, payment, payouts, admin work and farming advice.",
    hi: "आपसे मिलकर अच्छा लगा, {name}। मैं इस chat में आपका नाम याद रखूंगा। मैं farmer selling, customer buying, orders, payment, payouts, admin work और farming advice में guide कर सकता हूं।",
  },
  role_farmer: {
    en: "Farmer can manage profile, request verification, add/edit/delete crop listings, view own stock, accept/reject orders, update delivery status, chat after order, view reviews, earnings, pending payout and released payout.",
    hi: "Farmer profile manage कर सकता है, verification ले सकता है, crop listing add/edit/delete कर सकता है, own stock देख सकता है, orders accept/reject कर सकता है, delivery status update कर सकता है, order के बाद chat कर सकता है, reviews, earnings, pending payout और released payout देख सकता है।",
  },
  role_customer: {
    en: "Customer can manage profile, browse/search/filter crops, view verified farmer badge, add to cart, place order, pay with Razorpay, track own orders, download invoice, chat after order, confirm delivery, review and raise dispute/refund.",
    hi: "Customer profile manage कर सकता है, crops browse/search/filter कर सकता है, verified farmer badge देख सकता है, cart में add कर सकता है, order place कर सकता है, Razorpay payment कर सकता है, own orders track कर सकता है, invoice download कर सकता है, order के बाद chat, delivery confirm, review और dispute/refund raise कर सकता है।",
  },
  voice_help: {
    en: "Voice assistant has Chat mode and Voice mode. In Voice mode press Start listening once. It listens, answers, then listens again until you press Stop listening. Say open contact page, open orders, open invoice, or ask farming questions.",
    hi: "Voice assistant में Chat mode और Voice mode है। Voice mode में Start listening एक बार दबाएं। यह सुनेगा, जवाब देगा, फिर खुद दोबारा सुनेगा, जब तक आप Stop listening नहीं दबाते। आप बोल सकते हैं: contact page खोलो, orders खोलो, invoice खोलो, या farming question पूछो।",
  },
  contact_support: {
    en: "For support, open Contact page. You can send your name, email, phone and message. Admin can read contact messages from Admin Messages.",
    hi: "Support के लिए Contact page खोलें। आप name, email, phone और message भेज सकते हैं। Admin contact messages को Admin Messages में देख सकता है।",
  },
  auth: {
    en: "For login or signup, open Auth. Choose Farmer, Customer, or Admin. Farmers and customers can use email, phone OTP, or Google if configured. Admin uses admin credentials.",
    hi: "Login या signup के लिए Auth खोलिए। Farmer, Customer या Admin चुनिए। Farmer और customer email, phone OTP या Google से जा सकते हैं। Admin admin credentials से login करता है।",
    kn: "Login/signup ಗೆ Auth ತೆರೆ. Farmer, Customer, Admin ಆಯ್ಕೆ ಮಾಡಿ. Farmer/customer email, phone OTP ಅಥವಾ Google ಬಳಸಿ. Admin credentials ಬಳಸಿ.",
    ta: "Login/signup க்கு Auth திறக்கவும். Farmer, Customer, Admin தேர்வு செய்யவும். Farmer/customer email, phone OTP அல்லது Google பயன்படுத்தலாம். Admin credentials பயன்படுத்துவார்.",
    te: "Login/signup కోసం Auth తెరవండి. Farmer, Customer, Admin ఎంచుకోండి. Farmer/customer email, phone OTP లేదా Google వాడవచ్చు. Admin credentials వాడాలి.",
    mr: "Login/signup साठी Auth उघडा. Farmer, Customer, Admin निवडा. Farmer/customer email, phone OTP किंवा Google वापरू शकतात. Admin credentials वापरतो.",
    bn: "Login/signup এর জন্য Auth খুলুন। Farmer, Customer, Admin বাছুন। Farmer/customer email, phone OTP বা Google ব্যবহার করতে পারে। Admin credentials ব্যবহার করে।",
  },
  farmer_profile: {
    en: "Farmer profile is used for farm identity, address, phone, verification and customer trust. Open Farmer Profile, fill details, then save. Admin can verify the farmer.",
    hi: "Farmer profile से farm identity, address, phone, verification और customer trust बनता है। Farmer Profile खोलिए, details भरिए, save करिए। Admin farmer verify कर सकता है।",
  },
  farmer_verification: {
    en: "Farmer verification is controlled by admin. Farmer completes profile, admin opens Farmers or Admin Marketplace, checks details, then verifies or rejects. Verified farmers show a trust badge.",
    hi: "Farmer verification admin करता है। Farmer profile complete करता है, admin Farmers या Admin Marketplace खोलकर details check करता है, फिर verify या reject करता है। Verified farmer पर trust badge दिखता है।",
  },
  product_add: {
    en: "To add crop listing: log in as farmer, open Farmer Marketplace, go to Products or Stock, enter crop name, category, price, quantity, location and description, then submit. Admin approval may be required.",
    hi: "Crop listing जोड़ने के लिए farmer login करें, Farmer Marketplace खोलें, Products या Stock tab में crop name, category, price, quantity, location और description भरें, फिर submit करें। Admin approval लग सकता है।",
  },
  product_manage: {
    en: "To edit or delete a crop, open Farmer Marketplace, go to Products or Stock, choose your own listing, then use Edit or Delete. Farmers can only manage their own products.",
    hi: "Crop edit या delete करने के लिए Farmer Marketplace खोलें, Products या Stock tab में अपनी listing चुनें, फिर Edit या Delete दबाएं। Farmer सिर्फ अपने products manage कर सकता है।",
  },
  browse_search: {
    en: "To search crops, open Customer Marketplace. Use search for crop name and filters for location, price, category and farmer. Check verified farmer badge before buying.",
    hi: "Crop search करने के लिए Customer Marketplace खोलें। Crop name search करें और location, price, category, farmer filters लगाएं। खरीदने से पहले verified farmer badge देखें।",
  },
  cart_order: {
    en: "To buy: open Customer Marketplace, choose crop, add to cart, check quantity, place order, then pay. After order, chat with farmer and track status from Orders.",
    hi: "खरीदने के लिए Customer Marketplace खोलें, crop चुनें, cart में add करें, quantity check करें, order place करें, फिर payment करें। Order के बाद farmer से chat और Orders में tracking करें।",
  },
  orders: {
    en: "Order flow is pending, accepted, packed, shipped, delivered, or cancelled. Customer sees only own orders. Farmer sees only own received orders. Admin sees all orders.",
    hi: "Order status pending, accepted, packed, shipped, delivered या cancelled होता है। Customer सिर्फ अपने orders देखता है। Farmer अपने received orders देखता है। Admin सभी orders देखता है।",
  },
  order_status: {
    en: "Farmer can accept or reject an order, then update it to packed, shipped, delivered, or cancelled. Customer can track it and confirm delivery when received.",
    hi: "Farmer order accept या reject कर सकता है, फिर packed, shipped, delivered या cancelled status लगा सकता है। Customer tracking करता है और delivery मिलने पर confirm करता है।",
  },
  payment_cashflow: {
    en: "Cash flow: customer pays full amount to platform through Razorpay. Payment becomes PAID/HELD. Commission is deducted. Farmer payout stays pending until delivery confirmation and admin release.",
    hi: "Cash flow: customer Razorpay से full amount platform को pay करता है। Payment PAID/HELD होता है। Commission कटता है। Farmer payout delivery confirmation और admin release तक pending रहता है।",
  },
  commission: {
    en: "Commission example: if order total is 1000 and commission is 10 percent, platform commission is 100 and farmer payout is 900.",
    hi: "Commission example: order total 1000 है और commission 10 percent है, तो platform commission 100 और farmer payout 900 होगा।",
  },
  payout: {
    en: "Farmer payout is not direct. Admin releases payout after delivery confirmation. Farmer dashboard shows earnings, pending payout and released payout.",
    hi: "Farmer payout direct नहीं होता। Delivery confirm होने के बाद admin payout release करता है। Farmer dashboard earnings, pending payout और released payout दिखाता है।",
  },
  invoice: {
    en: "Invoice is generated after successful payment. Customer can open Invoices to view or download it. Admin view can include order, customer, farmer, products, total and commission details.",
    hi: "Successful payment के बाद invoice बनता है। Customer Invoices खोलकर देख या download कर सकता है। Admin view में order, customer, farmer, products, total और commission details दिख सकती हैं।",
  },
  chat: {
    en: "Chat starts only after an order is created. Each chat belongs to one order. Only that customer, that farmer and admin can access it.",
    hi: "Chat order create होने के बाद ही शुरू होता है। हर chat एक order से जुड़ा है। सिर्फ वही customer, वही farmer और admin access कर सकते हैं।",
  },
  review: {
    en: "Customer can review after purchase or delivery. Farmer can view customer reviews. Reviews help build farmer rating and trust.",
    hi: "Customer purchase या delivery के बाद review दे सकता है। Farmer customer reviews देख सकता है। Reviews farmer rating और trust बढ़ाते हैं।",
  },
  dispute: {
    en: "For refund or dispute, customer opens order/dispute area and raises a request. Admin checks proof, marks valid or rejected, and refunds if valid.",
    hi: "Refund या dispute के लिए customer order/dispute area खोलकर request raise करता है। Admin proof check करता है, valid या reject करता है, और valid होने पर refund करता है।",
  },
  admin: {
    en: "Admin manages trust and money: farmers, customers, farmer verification, product approval, orders, payments, commission, payouts, disputes, refunds, user blocking, analytics and featured listings.",
    hi: "Admin trust और money manage करता है: farmers, customers, farmer verification, product approval, orders, payments, commission, payouts, disputes, refunds, user blocking, analytics और featured listings।",
  },
  admin_users: {
    en: "Admin can view users, block or unblock them, and manage farmers/customers separately. Use Admin Farmers and Admin Customers pages.",
    hi: "Admin users देख सकता है, block/unblock कर सकता है, और farmers/customers अलग manage कर सकता है। Admin Farmers और Admin Customers pages इस्तेमाल करें।",
  },
  admin_products: {
    en: "Admin approves or rejects crop listings from Admin Marketplace or Stock area. Approved listings become visible to customers.",
    hi: "Admin crop listings को Admin Marketplace या Stock area से approve/reject करता है। Approved listings customers को दिखती हैं।",
  },
  analytics: {
    en: "Analytics shows total revenue, total orders, total commission, active farmers and active customers. Open Admin Marketplace and check Analytics cards.",
    hi: "Analytics total revenue, total orders, total commission, active farmers और active customers दिखाता है। Admin Marketplace खोलकर Analytics cards देखें।",
  },
  featured_contact: {
    en: "Admin can manage featured listings and contact/support messages. Featured crops appear more prominently on marketplace and homepage sections.",
    hi: "Admin featured listings और contact/support messages manage कर सकता है। Featured crops marketplace और homepage में ज्यादा highlight होते हैं।",
  },
  weather_news: {
    en: "Weather and news help farmers plan sowing, irrigation, spraying and selling. Open Weather for city forecast and News for agriculture updates.",
    hi: "Weather और news farmer को sowing, irrigation, spraying और selling plan करने में मदद करते हैं। City forecast के लिए Weather और agriculture updates के लिए News खोलें।",
  },
  ai_crop: {
    en: "AI crop tools can suggest crop, fertilizer, yield and rainfall ideas. For best advice, give state, district, soil type, season, water availability and crop name.",
    hi: "AI crop tools crop, fertilizer, yield और rainfall ideas दे सकते हैं। बेहतर advice के लिए state, district, soil type, season, water availability और crop name बताएं।",
  },
  fertilizer: {
    en: "Fertilizer advice depends on crop, soil and growth stage. Use soil test first. Do not overuse fertilizer. Tell crop name, soil type and field size for better guidance.",
    hi: "Fertilizer advice crop, soil और growth stage पर depend करती है। पहले soil test करें। ज्यादा fertilizer न डालें। बेहतर सलाह के लिए crop name, soil type और field size बताएं।",
  },
  urea: {
    en: "Urea is a nitrogen fertilizer. It helps leaf and plant growth, but overuse can damage soil and crop quality. Use it in split doses and prefer soil-test based quantity.",
    hi: "Urea nitrogen fertilizer है। यह leaf और plant growth में मदद करता है, लेकिन ज्यादा डालने से soil और crop quality खराब हो सकती है। Split dose और soil-test quantity बेहतर है।",
  },
  wheat: {
    en: "For wheat: sow on time, use suitable seed variety, give first irrigation at crown root stage, control weeds early, and apply fertilizer based on soil test.",
    hi: "Wheat के लिए समय पर sowing करें, suitable seed variety लें, first irrigation crown root stage पर दें, weeds जल्दी control करें, और fertilizer soil test के हिसाब से दें।",
  },
  market_price: {
    en: "For crop price, compare local mandi price, transport cost, quality grade, demand and platform commission. Set a price that protects farmer margin and still looks fair to buyers.",
    hi: "Crop price के लिए local mandi price, transport cost, quality grade, demand और platform commission compare करें। ऐसा price रखें जिसमें farmer margin भी रहे और buyer को fair लगे।",
  },
  government_services: {
    en: "For agriculture government-service help, start with your Gram Panchayat/Sachiv for local records and scheme direction, Patwari/Lekhpal for land records, CSC for online forms, KVK or agriculture department for crop advice, and bank/cooperative for KCC. Common documents can include Aadhaar, bank passbook, land record, mobile number, crop details, photos and caste/income certificate if a scheme asks for it. Always verify eligibility at the official office or portal.",
    hi: "Agriculture government service help ke liye Gram Panchayat/Sachiv se local record aur scheme direction poochein, Patwari/Lekhpal se land record, CSC se online forms, KVK ya agriculture department se crop advice, aur bank/cooperative se KCC poochein. Common documents: Aadhaar, bank passbook, land record, mobile number, crop details, photos, aur scheme maangne par caste/income certificate ho sakte hain. Eligibility official office ya portal par verify karein.",
  },
};

const INTENTS = [
  { id: "role_customer", words: ["\u0917\u094d\u0930\u093e\u0939\u0915 \u0915\u094d\u092f\u093e", "\u0917\u094d\u0930\u093e\u0939\u0915 \u0915\u093e"] },
  { id: "robot_intro", words: ["introduce me", "introduce this app", "introduce app", "explain app", "what can you do", "robot", "train", "working all thing", "all thing", "app work", "app working", "how app works"] },
  { id: "creator", words: ["who made you", "who created you", "who is creator", "who is owner", "made you", "created you", "admin detail", "admin details", "surender", "surender dubey", "kisne banaya", "creator", "owner"] },
  { id: "help", words: ["help", "madad", "sahayata", "guide", "assist", "मदद", "सहायता"] },
  { id: "app_overview", words: ["features", "about app", "what can this app", "krishinova", "marketplace kya", "app kya", "क्या कर"] },
  { id: "role_farmer", words: ["what can farmer", "farmer do", "farmer dashboard", "farmer features", "किसान क्या"] },
  { id: "role_customer", words: ["what can customer", "customer do", "customer dashboard", "customer features", "ग्राहक क्या"] },
  { id: "voice_help", words: ["voice assistant", "voice mode", "continuous listening", "speak button", "microphone", "बोलकर", "voice"] },
  { id: "contact_support", words: ["contact page", "contact support", "support page", "contact message", "संपर्क"] },
  { id: "auth", words: ["login", "signup", "register", "otp", "google", "auth", "लॉगिन", "साइन", "रजिस्टर"] },
  { id: "farmer_profile", words: ["farmer profile", "profile management", "किसान प्रोफाइल"] },
  { id: "farmer_verification", words: ["verify farmer", "verification", "badge", "verified", "किसान verify", "वेरिफ"] },
  { id: "product_add", words: ["add product", "add crop", "crop listing", "sell crop", "product जोड़", "फसल जोड़", "बेचना"] },
  { id: "product_manage", words: ["edit product", "delete product", "own products", "stock manage", "listing edit", "listing delete"] },
  { id: "browse_search", words: ["browse", "search", "filter", "find crop", "location price", "खोज", "filter"] },
  { id: "cart_order", words: ["buy crop", "buy crops", "cart", "place order", "kharid", "खरीद", "order place"] },
  { id: "orders", words: ["my orders", "track order", "order tracking", "order flow", "order status", "ऑर्डर"] },
  { id: "order_status", words: ["accept order", "reject order", "packed", "shipped", "delivered", "cancelled", "delivery confirm"] },
  { id: "payment_cashflow", words: ["payment", "razorpay", "cash flow", "held", "paid", "failed", "पेमेंट", "रोजरपे", "razarpay"] },
  { id: "commission", words: ["commission", "10%", "platform fee", "कमीशन"] },
  { id: "payout", words: ["payout", "earning", "release payout", "pending payout", "released payout", "कमाई"] },
  { id: "invoice", words: ["invoice", "bill", "download invoice", "बिल", "चालान"] },
  { id: "chat", words: ["chat", "message", "talk farmer", "talk customer", "चैट", "message"] },
  { id: "review", words: ["review", "rating", "farmer rating", "feedback", "रेटिंग"] },
  { id: "dispute", words: ["dispute", "refund", "complaint", "return money", "विवाद", "रिफंड"] },
  { id: "admin", words: ["admin", "admin dashboard", "admin work", "admin manage", "authority", "एडमिन"] },
  { id: "admin_users", words: ["block user", "unblock", "all users", "farmers customers", "customer manage"] },
  { id: "admin_products", words: ["approve product", "reject listing", "approve crop", "listing approval"] },
  { id: "analytics", words: ["analytics", "revenue", "total orders", "active farmers", "active customers"] },
  { id: "featured_contact", words: ["featured", "contact message", "support message", "homepage listing"] },
  { id: "urea", words: ["urea", "यूरिया"] },
  { id: "wheat", words: ["wheat", "गेहूं", "गेहूँ"] },
  { id: "weather_news", words: ["weather", "mausam", "news", "samachar", "मौसम", "समाचार"] },
  { id: "ai_crop", words: ["crop recommendation", "crop advice", "which crop", "yield prediction", "rainfall", "fasal kaun", "फसल कौन", "खेती"] },
  { id: "fertilizer", words: ["fertilizer", "npk", "soil test", "manure", "खाद", "उर्वरक"] },
  { id: "market_price", words: ["price", "rate", "mandi", "market price", "भाव", "दाम"] },
  {
    id: "government_services",
    words: [
      "gram panchayat",
      "sachiv",
      "patwari",
      "lekhpal",
      "csc",
      "pm-kisan",
      "pm kisan",
      "soil health card",
      "kisan credit card",
      "kcc",
      "crop insurance",
      "fasal bima",
      "subsidy",
      "scheme",
      "kvk",
      "agriculture office",
    ],
  },
];

const LIVE_FIRST_INTENTS = new Set(["ai_crop", "fertilizer", "urea", "wheat", "market_price"]);
const LOCAL_APP_INTENTS = new Set([
  "help",
  "app_overview",
  "robot_intro",
  "creator",
  "remember_name",
  "role_farmer",
  "role_customer",
  "voice_help",
  "contact_support",
  "auth",
  "farmer_profile",
  "farmer_verification",
  "product_add",
  "product_manage",
  "browse_search",
  "cart_order",
  "orders",
  "order_status",
  "payment_cashflow",
  "commission",
  "payout",
  "invoice",
  "chat",
  "review",
  "dispute",
  "admin",
  "admin_users",
  "admin_products",
  "analytics",
  "featured_contact",
  "government_services",
]);

const FARMING_LIVE_WORDS = [
  "leaf",
  "leaves",
  "yellow",
  "disease",
  "pest",
  "worm",
  "fungus",
  "blight",
  "rot",
  "soil",
  "seed",
  "sowing",
  "irrigation",
  "spray",
  "dose",
  "tomato",
  "potato",
  "onion",
  "rice",
  "paddy",
  "maize",
  "cotton",
  "mustard",
  "sugarcane",
  "vegetable",
  "fruit",
  "organic",
  "compost",
  "nitrogen",
  "phosphorus",
  "potassium",
  "किसान",
  "फसल",
  "पत्ती",
  "पीली",
  "बीमारी",
  "कीट",
  "मिट्टी",
  "बीज",
  "सिंचाई",
  "छिड़काव",
  "टमाटर",
  "धान",
  "गेहूं",
  "आलू",
  "प्याज",
];

function extractGeminiText(data) {
  return (
    data?.candidates?.[0]?.content?.parts
      ?.map((part) => part?.text || "")
      .join("")
      .trim() || ""
  );
}

function getLanguageCode(language, prompt = "") {
  if (LANGUAGE_NAMES[language]) return language;
  if (/[\u0900-\u097F]/.test(prompt)) return "hi-IN";
  return "en-IN";
}

function detectLanguageByScript(text = "") {
  const value = String(text || "");
  if (/[\u0900-\u097F]/.test(value)) return "hi-IN";
  if (/[\u0980-\u09FF]/.test(value)) return "bn-IN";
  if (/[\u0A80-\u0AFF]/.test(value)) return "gu-IN";
  if (/[\u0C80-\u0CFF]/.test(value)) return "kn-IN";
  if (/[\u0B80-\u0BFF]/.test(value)) return "ta-IN";
  if (/[\u0C00-\u0C7F]/.test(value)) return "te-IN";
  if (/[\u0D00-\u0D7F]/.test(value)) return "ml-IN";
  if (/[\u0A00-\u0A7F]/.test(value)) return "pa-IN";
  if (/[\u0B00-\u0B7F]/.test(value)) return "od-IN";
  if (/[\u0600-\u06FF]/.test(value)) return "ur-IN";
  return "";
}

function withTimeout(promise, ms, fallback) {
  let timeout;
  return Promise.race([
    promise,
    new Promise((resolve) => {
      timeout = setTimeout(() => resolve(fallback), ms);
    }),
  ]).finally(() => clearTimeout(timeout));
}

function baseLanguage(language) {
  return getLanguageCode(language).split("-")[0];
}

function isHindiFamilyLanguage(language) {
  return ["hi-IN", "bho-IN", "hry-IN", "raj-IN", "chg-IN"].includes(getLanguageCode(language));
}

function dialectizeHindi(text, language) {
  const code = getLanguageCode(language);
  let value = String(text || "");
  if (code === "bho-IN") {
    return value
      .replace(/मैं/g, "हम")
      .replace(/मुझे/g, "हमके")
      .replace(/आपका/g, "रउआ के")
      .replace(/आपको/g, "रउआ के")
      .replace(/आप /g, "रउआ ")
      .replace(/कर सकता हूं/g, "कर सकेनी")
      .replace(/कर सकता है/g, "कर सकेला")
      .replace(/कर सकती है/g, "कर सकेली")
      .replace(/कर सकते हैं/g, "कर सकेला")
      .replace(/बताइए/g, "बताईं")
      .replace(/खोलिए/g, "खोलीं")
      .replace(/देखिए/g, "देखीं")
      .replace(/है।/g, "बा।")
      .replace(/हूं।/g, "बानी।");
  }
  if (code === "hry-IN") {
    return value
      .replace(/मैं/g, "मैं")
      .replace(/मुझे/g, "मन्ने")
      .replace(/आपका/g, "थारा")
      .replace(/आपको/g, "थारे")
      .replace(/आप /g, "तू ")
      .replace(/कर सकता हूं/g, "कर सकूं सूं")
      .replace(/कर सकता है/g, "कर सकै सै")
      .replace(/कर सकती है/g, "कर सकै सै")
      .replace(/कर सकते हैं/g, "कर सकै सै")
      .replace(/बताइए/g, "बता द्यो")
      .replace(/खोलिए/g, "खोल द्यो")
      .replace(/देखिए/g, "देख ल्यो")
      .replace(/है।/g, "सै।")
      .replace(/हूं।/g, "सूं।");
  }
  if (code === "raj-IN") {
    return value
      .replace(/मुझे/g, "म्हाने")
      .replace(/आपका/g, "थारो")
      .replace(/आपको/g, "थाने")
      .replace(/आप /g, "थां ")
      .replace(/बताइए/g, "बतावो")
      .replace(/खोलिए/g, "खोलो")
      .replace(/देखिए/g, "देखो")
      .replace(/है।/g, "है सा।");
  }
  if (code === "chg-IN") {
    return value
      .replace(/मुझे/g, "मोला")
      .replace(/आपको/g, "तुमन ला")
      .replace(/आप /g, "तुमन ")
      .replace(/बताइए/g, "बतावव")
      .replace(/खोलिए/g, "खोलव")
      .replace(/है।/g, "हे।");
  }
  return value;
}

function answerFor(intent, language) {
  const base = baseLanguage(language);
  const entry = ANSWERS[intent];
  if (isHindiFamilyLanguage(language) && getLanguageCode(language) !== "hi-IN") {
    return dialectizeHindi(entry?.hi || entry?.en || FALLBACK_BY_LANGUAGE.hi || FALLBACK_BY_LANGUAGE.en, language);
  }
  return entry?.[base] || entry?.en || entry?.hi || FALLBACK_BY_LANGUAGE[base] || FALLBACK_BY_LANGUAGE.en;
}

function hasLocalAnswer(intent, language) {
  const base = baseLanguage(language);
  const entry = ANSWERS[intent];
  return Boolean(
    entry?.[base] ||
      (base === "en" && entry?.en) ||
      (base === "hi" && entry?.hi) ||
      (isHindiFamilyLanguage(language) && entry?.hi),
  );
}

function fillAnswer(template, values = {}) {
  return String(template || "").replace(/\{(\w+)\}/g, (_match, key) => values[key] || "");
}

function cleanUserName(value) {
  return String(value || "")
    .replace(/[^\p{L}\p{M}\s.'-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .slice(0, 4)
    .join(" ");
}

function extractUserName(text) {
  const nativeHindiMatch = String(text || "").match(/(?:\u092e\u0947\u0930\u093e\s+\u0928\u093e\u092e|\u092e\u0941\u091d\u0947)\s+([\u0900-\u097F\s.'-]{2,60})/u);
  const match = String(text || "").match(
    /\b(?:my name is|i am|i'm|call me|mera naam|mera name|mujhe|मेरा नाम|मेरा नेम|मुझे)\s+([\p{L}\s.'-]{2,60})/iu,
  );
  const nameOnly = String(nativeHindiMatch?.[1] || match?.[1] || "").split(/\s*(?:[.,;:]|\bintroduce\b|\bexplain\b|\bguide\b|\btell\b|\bshow\b|\bopen\b|\u0939\u0948|\u0939\u0942\u0902|\u0939\u0941\u0902)/i)[0];
  return cleanUserName(nameOnly);
}

function safeSessionId(value) {
  return String(value || "guest-session")
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 120) || "guest-session";
}

async function getRobotMemory(sessionId) {
  try {
    const rows = await query(
      "SELECT memory_key, memory_value FROM ai_robot_memory WHERE session_id = ? ORDER BY updated_at DESC LIMIT 20",
      [safeSessionId(sessionId)],
    );
    return Object.fromEntries(rows.map((row) => [row.memory_key, row.memory_value]));
  } catch {
    return {};
  }
}

async function upsertRobotMemory({ sessionId, userRole = "guest", key, value, confidence = 1 }) {
  if (!key || !value) return;
  try {
    await query(
      `INSERT INTO ai_robot_memory (session_id, user_role, memory_key, memory_value, confidence)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE memory_value = VALUES(memory_value), confidence = VALUES(confidence), updated_at = CURRENT_TIMESTAMP`,
      [safeSessionId(sessionId), userRole, key, String(value).slice(0, 2000), confidence],
    );
  } catch {}
}

async function storeRobotInteraction({ sessionId, userRole, language, detectedLanguage, intentType, action, message, response, provider }) {
  try {
    await query(
      `INSERT INTO ai_robot_interactions
       (session_id, user_role, language_code, detected_language, intent_type, action_type, user_message, assistant_response, action_payload, provider)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        safeSessionId(sessionId),
        userRole || "guest",
        language || "en-IN",
        detectedLanguage || null,
        intentType || "conversation",
        action?.action || null,
        String(message || "").slice(0, 4000),
        String(response || "").slice(0, 4000),
        action ? JSON.stringify(action).slice(0, 4000) : null,
        provider || null,
      ],
    );
  } catch {}
}

function isProjectIntroRequest(text = "") {
  const value = String(text || "");
  const normalized = normalizeText(value);
  return (
    /\b(introduce your project|introduce project|tell everything|project detail|project details|about project|explain project|about app|introduce app|what can this app|what can it do)\b/i.test(value) ||
    (
      (normalized.includes("app") || normalized.includes("project") || value.includes("ऐप") || value.includes("एप") || value.includes("प्रोजेक्ट")) &&
      (
        value.includes("बताइए") ||
        value.includes("बताओ") ||
        value.includes("समझाइए") ||
        value.includes("क्या कर सकता") ||
        value.includes("क्या कर सकती") ||
        value.includes("पूरा") ||
        value.includes("जानना चाहता") ||
        value.includes("जानना चाहती") ||
        normalized.includes("tell") ||
        normalized.includes("explain") ||
        normalized.includes("introduce") ||
        normalized.includes("what can")
      )
    )
  );
}

function classifyRobotIntent(text = "") {
  const normalized = normalizeText(text);
  if (isNavigationIntent(text) || /\b(open|go to|show|navigate|launch|start)\b/i.test(text)) return "action_command";
  if (isProjectIntroRequest(text)) return "project_intro";
  if (/\b(who|what|how|why|when|where|which|tell|explain|guide|suggest|recommend|price|weather|payout|payment|invoice|farmer|customer|admin)\b/i.test(text)) {
    return "information_request";
  }
  if (normalized.length < 30) return "conversation";
  return "information_request";
}

function marketplacePathForRole(role = "guest") {
  if (role === "admin") return "/admin/marketplace";
  if (role === "customer") return "/customer/marketplace";
  if (role === "farmer") return "/farmer/marketplace";
  return "/auth";
}

function classifyRobotAction(text = "", role = "guest") {
  const normalized = normalizeText(text);
  let route = AGENT_ROUTE_CATALOG.map((item) => {
    const score = item.words.reduce((total, word) => (normalized.includes(normalizeText(word)) ? total + normalizeText(word).split(" ").length : total), 0);
    return { item, score };
  })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)[0]?.item;

  if (!route && /(marketplace|market|workspace|dashboard|मार्केटप्लेस|मार्केट|बाजार|डैशबोर्ड)/i.test(normalized)) {
    route = { label: "marketplace", path: marketplacePathForRole(role) };
  }

  if (route && (/\b(open|go|show|navigate|launch|start|take|khol|kholo|dikhao)\b/i.test(text) || /खोल|दिखा|ले चल|जाओ|चालू/i.test(text))) {
    const path = route.path === "__role_marketplace" ? marketplacePathForRole(role) : route.path;
    return {
      action: "navigate",
      parameters: { path, label: route.label },
      path,
      label: route.label,
    };
  }
  const hasNavigationVerb =
    /\b(open|go|show|navigate|launch|start|take|khol|kholo|dikhao)\b/i.test(text) ||
    /\u0916\u094b\u0932|\u0926\u093f\u0916\u093e|\u0932\u0947\s+\u091a\u0932|\u091c\u093e\u0913|\u091a\u093e\u0932\u0942/i.test(text);

  if (route && hasNavigationVerb) {
    const path = route.path === "__role_marketplace" ? marketplacePathForRole(role) : route.path;
    return {
      action: "navigate",
      parameters: { path, label: route.label },
      path,
      label: route.label,
    };
  }

  return null;
}

function explicitRoleIntent(text = "") {
  const normalized = normalizeText(text);
  if (/\b(farmer|farmers|kisan)\b/.test(normalized) || /\u0915\u093f\u0938\u093e\u0928|\u092b\u093e\u0930\u094d\u092e\u0930/.test(normalized)) return "role_farmer";
  if (/\b(customer|customers|buyer|buyers)\b/.test(normalized) || /\u0917\u094d\u0930\u093e\u0939\u0915|\u0915\u0938\u094d\u091f\u092e\u0930|\u0916\u0930\u0940\u0926\u093e\u0930/.test(normalized)) return "role_customer";
  if (/\b(admin|admins|administrator|owner)\b/.test(normalized) || /\u090f\u0921\u092e\u093f\u0928|\u092a\u094d\u0930\u0936\u093e\u0938\u0915/.test(normalized)) return "admin";
  return "";
}

function buildProjectIntroText(memory = {}, language = "en-IN") {
  if (isHindiFamilyLanguage(language)) {
    const greeting = memory.user_name ? `${memory.user_name}, ` : "";
    const hindiIntro = `${greeting}यह KrishiNova Smart Farming Exchange ऐप है।

Project Name: KrishiNova Smart Farming Exchange

Purpose:
यह एक smart agriculture platform है जहां किसान अपनी फसल सीधे बेच सकते हैं, ग्राहक सुरक्षित तरीके से फसल खरीद सकते हैं, और admin verification, listing, payment, payout, dispute और platform trust संभाल सकता है।

Features:
1. Farmer: profile बनाना, verification लेना, crop listing add/edit/delete करना, stock manage करना, orders accept/reject करना, delivery status update करना, earnings और payouts देखना।
2. Customer: crops search/filter करना, cart में add करना, order place करना, Razorpay payment करना, invoice download करना, order tracking, chat, review और dispute/refund raise करना।
3. Admin: farmers verify करना, crop listings approve/reject करना, users manage करना, all orders/payments देखना, commission, payouts, disputes, refunds, analytics और contact messages manage करना।
4. AI Sahayak: multilingual chat, voice command, farming guidance, weather/news help, app navigation और robot-style command operation।

Technologies used:
1. React + Vite frontend
2. Express.js backend
3. MySQL database
4. Gemini live AI with local guide fallback
5. Sarvam AI for speech, translation and multilingual voice
6. Razorpay payment flow

How it works:
Farmer crop list करता है, customer crop खरीदकर payment करता है, platform payment hold करता है, commission calculate होती है, delivery confirm होने के बाद admin farmer payout release करता है।`;
    return dialectizeHindi(hindiIntro, language);
  }

  const rememberedName = memory.user_name ? `User name: ${memory.user_name}.\n` : "";
  const featureLines = PROJECT_INTRO.features.map((feature, index) => `${index + 1}. ${feature}`).join("\n");
  const techLines = PROJECT_INTRO.technologies.map((technology, index) => `${index + 1}. ${technology}`).join("\n");
  return `${rememberedName}Project Name: ${PROJECT_INTRO.name}
Purpose: ${PROJECT_INTRO.purpose}
Features:
${featureLines}
Technologies used:
${techLines}
How it works: ${PROJECT_INTRO.workflow}`;
}

function plainUserText(rawPrompt) {
  const prompt = String(rawPrompt || "").trim();
  const userSaidMatch = prompt.match(/User said:\s*([\s\S]*)$/i);
  return String(userSaidMatch?.[1] || prompt).trim();
}

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}%\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isNavigationIntent(text = "") {
  return (
    /^(open|go to|show|take me|navigate|start|launch)\b/i.test(text) ||
    /\b(open|go to|show|take me to|navigate to|open the|show me|launch|start)\b/i.test(text) ||
    /खोलो|खोलें|दिखाओ|ले चलो|जाओ|चालू करो/i.test(text)
  );
}

function scoreIntent(text, intent) {
  return intent.words.reduce((score, word) => {
    const token = normalizeText(word);
    if (!token) return score;
    if (text.includes(token)) return score + Math.max(1, token.split(" ").length);
    return score;
  }, 0);
}

function buildAgricultureFallback(rawPrompt, language = "en-IN") {
  const userText = plainUserText(rawPrompt);
  const normalized = normalizeText(userText);
  const wantsHindi = baseLanguage(language) === "hi" || /[\u0900-\u097F]/.test(userText);

  if (normalized.includes("tomato") && (normalized.includes("yellow") || normalized.includes("leaf") || normalized.includes("leaves"))) {
    return wantsHindi
      ? "Tomato की पत्तियां पीली हों तो 4 चीजें check करें: 1. पानी ज्यादा या कम तो नहीं है। 2. Nitrogen या magnesium कमी हो सकती है। 3. Whitefly/mites जैसे कीट पत्ती के नीचे देखें। 4. अगर धब्बे या सड़न है तो fungal disease हो सकती है। अभी पानी संतुलित रखें, affected leaves हटाएं, और soil test या local कृषि अधिकारी से dose confirm करें।"
      : "For yellow tomato leaves, check 4 things: 1. Too much or too little water. 2. Nitrogen or magnesium deficiency. 3. Pests under leaves, especially whitefly or mites. 4. Fungal disease if spots or rot are present. Keep watering balanced, remove badly affected leaves, and confirm fertilizer or spray dose with a soil test or local agriculture officer.";
  }

  if (normalized.includes("fertilizer") || normalized.includes("urea") || normalized.includes("dose") || normalized.includes("npk")) {
    return wantsHindi
      ? "Fertilizer dose crop, soil test, crop age और field area पर depend करती है। बिना soil test high dose न दें। Crop name, days after sowing, soil type और acre/bigha area बताइए, तब मैं ज्यादा सही सलाह दूंगा। सामान्य rule: fertilizer split dose में दें और irrigation के साथ नमी रखें।"
      : "Fertilizer dose depends on crop, soil test, crop age and field area. Do not apply a high dose without a soil test. Tell me crop name, days after sowing, soil type and acre/bigha area for a better answer. General rule: use split doses and keep enough soil moisture after application.";
  }

  if (normalized.includes("pest") || normalized.includes("disease") || normalized.includes("worm") || normalized.includes("fungus") || normalized.includes("spray")) {
    return wantsHindi
      ? "Disease या pest के लिए पहले symptom पहचानें: पत्ती पर धब्बे, कीट, चिपचिपापन, सूखना या जड़ सड़ना। Affected part की photo/description, crop name और crop age बताइए। तब तक unnecessary chemical spray न करें; खेत में drainage, spacing और infected leaves removal करें।"
      : "For pest or disease, first identify symptoms: spots, insects, sticky leaves, wilting, or root rot. Share crop name, crop age and visible symptoms. Until then, avoid unnecessary chemical spray; improve drainage, spacing and remove badly infected leaves.";
  }

  if (normalized.includes("which crop") || normalized.includes("crop grow") || normalized.includes("crop recommendation")) {
    return wantsHindi
      ? "सही crop चुनने के लिए मुझे state/district, soil type, season, water availability और market demand चाहिए। सामान्य rule: कम पानी में pulses/millets, ज्यादा पानी में paddy/vegetables, और अच्छी market access में vegetables ज्यादा profit दे सकती हैं।"
      : "To choose the right crop, I need state/district, soil type, season, water availability and market demand. General rule: pulses or millets suit low water, paddy or vegetables need more water, and vegetables can give better profit when market access is good.";
  }

  return wantsHindi
    ? "मैं live AI quota की वजह से local farming guide से जवाब दे रहा हूं। बेहतर सलाह के लिए crop name, location, soil type, crop age और symptom बताइए। अभी safe step: पानी संतुलित रखें, soil test करें, और बिना पहचान के chemical spray न करें।"
    : "Live AI quota is unavailable, so I am answering from the local farming guide. For better advice, tell me crop name, location, soil type, crop age and symptoms. Safe first steps: balance irrigation, use soil testing, and avoid chemical spray before identifying the problem.";
}

function matchLocalGuide(rawPrompt, { language = "en-IN", role = "guest" } = {}) {
  const userText = plainUserText(rawPrompt);
  const normalized = normalizeText(userText);
  const lang = getLanguageCode(language, userText);
  const detectedName = extractUserName(userText);

  if (detectedName && !isProjectIntroRequest(userText)) {
    return {
      found: true,
      confidence: 1,
      intent: "remember_name",
      content: fillAnswer(answerFor("remember_name", lang), { name: detectedName }),
    };
  }

  if (!normalized || ["hi", "hello", "hey", "ok", "okay", "thanks", "thank you", "namaste"].includes(normalized)) {
    return {
      found: true,
      confidence: 1,
      intent: "help",
      content: answerFor("help", lang),
    };
  }

  const datasetMatch = matchRobotDataset(userText, role);
  if (datasetMatch) {
    const content = hasLocalAnswer(datasetMatch.intent, lang)
      ? answerFor(datasetMatch.intent, lang)
      : datasetMatch.content;
    return {
      found: true,
      confidence: datasetMatch.confidence,
      intent: datasetMatch.intent,
      content,
      action: datasetMatch.action,
      dataset: {
        role: datasetMatch.role,
        stats: datasetMatch.datasetSize,
      },
    };
  }

  const best = INTENTS.map((intent) => ({ intent, score: scoreIntent(normalized, intent) }))
    .sort((a, b) => b.score - a.score)[0];

  if (best?.score > 0) {
    return {
      found: true,
      confidence: Math.min(1, best.score / 2),
      intent: best.intent.id,
      content: answerFor(best.intent.id, lang),
    };
  }

  if (FARMING_LIVE_WORDS.some((word) => normalized.includes(normalizeText(word)))) {
    return {
      found: false,
      confidence: 0,
      intent: "agriculture_live",
      content: buildAgricultureFallback(userText, lang),
    };
  }

  return {
    found: false,
    confidence: 0,
    intent: "unknown",
    content: FALLBACK_BY_LANGUAGE[baseLanguage(lang)] || FALLBACK_BY_LANGUAGE.en,
  };
}

function hasLiveAiProvider() {
  return Boolean(
    process.env.GEMINI_API_KEY ||
      process.env.OPENAI_CHAT_API_KEY ||
      process.env.OPENAI_API_KEY,
  );
}

function isQuestionLike(text) {
  return (
    /[?]/.test(text) ||
    /\b(how|what|why|when|where|which|who|tell|explain|guide|suggest|recommend|should|can|dose|treatment|solution)\b/i.test(text) ||
    /कैसे|क्या|क्यों|कब|कहाँ|बताओ|समझाओ|सलाह|इलाज|दवा|कितना|कौन/i.test(text)
  );
}

function isKrishiNovaOperationQuestion(text) {
  return /\b(krishinova|app|website|page|tab|dashboard|marketplace|order|payment|payout|invoice|login|signup|admin|customer|farmer|cart|profile|open|download|release|verify|approve|block|chat)\b/i.test(
    text,
  );
}

function shouldAskLiveAi({ local, rawQuestion, body }) {
  if (!hasLiveAiProvider()) return false;

  const userText = plainUserText(rawQuestion);
  const normalized = normalizeText(userText);
  const preferLive = body?.preferLive === true || body?.forceLive === true;

  if (LOCAL_APP_INTENTS.has(local.intent)) {
    return false;
  }
  if (LIVE_FIRST_INTENTS.has(local.intent)) return true;
  if (preferLive && !isKrishiNovaOperationQuestion(normalized)) return true;
  if (isQuestionLike(userText) && FARMING_LIVE_WORDS.some((word) => normalized.includes(normalizeText(word)))) return true;
  if (local.intent === "unknown" && isQuestionLike(userText)) return true;

  return false;
}

function buildLocalFallback(userPrompt, options = {}) {
  const local = matchLocalGuide(userPrompt, options);
  if (LIVE_FIRST_INTENTS.has(local.intent) || local.intent === "agriculture_live") {
    return buildAgricultureFallback(userPrompt, options.language);
  }
  return local.content;
}

async function translateContentIfNeeded(content, language, intent = "unknown") {
  const targetLanguage = getLanguageCode(language);
  const base = baseLanguage(targetLanguage);
  if (!content || base === "en" || hasLocalAnswer(intent, targetLanguage)) return content;
  if (isHindiFamilyLanguage(targetLanguage) && targetLanguage !== "hi-IN") {
    if (detectLanguageByScript(content) === "hi-IN") return dialectizeHindi(content, targetLanguage);
  }
  if (detectLanguageByScript(content) === targetLanguage) return content;
  if (!getSarvamStatus().configured) return content;

  try {
    const protectedItems = [];
    const protectedContent = String(content).replace(
      /(https?:\/\/\S+|[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}|\+?\d[\d\s-]{6,}\d)/g,
      (match) => {
        const token = `KRISHINOVA_TOKEN_${protectedItems.length}`;
        protectedItems.push(match);
        return token;
      },
    );
    const translated = await translateText({
      input: protectedContent,
      sourceLanguage: "en-IN",
      targetLanguage: isHindiFamilyLanguage(targetLanguage) ? "hi-IN" : targetLanguage,
      mode: "formal",
    });
    const restored = protectedItems.reduce(
      (text, item, index) => text.replace(new RegExp(`KRISHINOVA_TOKEN_${index}`, "g"), item),
      translated.translatedText || content,
    );
    return isHindiFamilyLanguage(targetLanguage) && targetLanguage !== "hi-IN" ? dialectizeHindi(restored, targetLanguage) : restored;
  } catch {
    return content;
  }
}

async function detectRobotLanguage(message, fallbackLanguage) {
  if (!message) return fallbackLanguage;
  const scriptLanguage = detectLanguageByScript(message);
  if (scriptLanguage) {
    if (scriptLanguage === "hi-IN" && isHindiFamilyLanguage(fallbackLanguage)) return getLanguageCode(fallbackLanguage);
    return scriptLanguage;
  }
  const clean = String(message || "").trim();
  if (/^[\x00-\x7F\s.,!?'"()\-:/]+$/.test(clean)) return getLanguageCode(fallbackLanguage, message);
  try {
    if (getSarvamStatus().configured) {
      const result = await withTimeout(detectLanguage({ input: message }), LANGUAGE_DETECT_TIMEOUT_MS, null);
      const detected = result?.languageCode || result?.language_code || result?.detectedLanguage || result?.detected_language;
      if (detected && LANGUAGE_NAMES[detected]) return detected;
    }
  } catch {}
  return getLanguageCode(fallbackLanguage, message);
}

function getGeminiModels() {
  const primary = process.env.GEMINI_MODEL || DEFAULT_MODELS[0];
  const configuredFallbacks = String(process.env.GEMINI_FALLBACK_MODELS || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  return [...new Set([primary, ...configuredFallbacks, ...DEFAULT_MODELS])];
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withFastFallback(promise, rawPrompt, options = {}) {
  let timeout;
  const fallback = new Promise((resolve) => {
    timeout = setTimeout(() => {
      const local = matchLocalGuide(rawPrompt, options);
      resolve({
        configured: true,
        content: local.content,
        fallback: true,
        provider: "local",
        intent: local.intent,
        note: "Live AI was slow, so the local guide answered.",
      });
    }, CHAT_FAST_REPLY_MS);
  });

  return Promise.race([promise, fallback]).finally(() => clearTimeout(timeout));
}

async function requestGeminiModel({ prompt, apiKey, model }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response;
  try {
    response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        generationConfig: {
          temperature: 0.55,
          topP: 0.9,
          maxOutputTokens: 700,
        },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      }),
      signal: controller.signal,
    });
  } catch (error) {
    clearTimeout(timeout);
    return {
      ok: false,
      status: error.name === "AbortError" ? 504 : 500,
      model,
      errorText: error.message || "Gemini request failed",
    };
  }
  clearTimeout(timeout);

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      model,
      errorText: await response.text(),
    };
  }

  const data = await response.json();
  return {
    ok: true,
    model,
    content: extractGeminiText(data) || "Gemini returned an empty response.",
  };
}

async function requestOpenAIModel({ prompt, apiKey, model }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response;
  try {
    response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model, input: prompt }),
      signal: controller.signal,
    });
  } catch (error) {
    clearTimeout(timeout);
    return {
      ok: false,
      status: error.name === "AbortError" ? 504 : 500,
      model,
      errorText: error.message || "OpenAI request failed",
    };
  }
  clearTimeout(timeout);

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      model,
      errorText: await response.text(),
    };
  }

  const data = await response.json();
  const content =
    data.output_text ||
    data.output
      ?.flatMap((item) => item.content || [])
      .map((item) => item.text || "")
      .join("")
      .trim() ||
    "";

  return {
    ok: true,
    model,
    content: content || "OpenAI returned an empty response.",
  };
}

async function callOpenAI(prompt) {
  const apiKey = process.env.OPENAI_CHAT_API_KEY || process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL;

  if (!apiKey) return { configured: false, content: "OpenAI API key is not configured." };

  const result = await requestOpenAIModel({ prompt, apiKey, model });
  if (result.ok) {
    return { configured: true, content: result.content, model: result.model, provider: "openai" };
  }

  return {
    configured: true,
    failed: true,
    status: result.status,
    content: "OpenAI fallback is unavailable right now.",
  };
}

async function requestOpenAiCompatibleChatModel({ prompt, apiKey, model, baseUrl, providerName }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const normalizedBaseUrl = String(baseUrl || "").replace(/\/+$/, "");

  let response;
  try {
    response = await fetch(`${normalizedBaseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content: APP_CONTEXT,
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.45,
        top_p: 0.9,
        max_tokens: 700,
      }),
      signal: controller.signal,
    });
  } catch (error) {
    clearTimeout(timeout);
    return {
      ok: false,
      status: error.name === "AbortError" ? 504 : 500,
      model,
      errorText: error.message || `${providerName} request failed`,
    };
  }
  clearTimeout(timeout);

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      model,
      errorText: await response.text(),
    };
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || data.output_text || "";
  if (!String(content || "").trim()) {
    return {
      ok: false,
      status: 502,
      model,
      errorText: `${providerName} returned an empty response.`,
    };
  }
  return {
    ok: true,
    model,
    content: String(content).trim(),
  };
}

async function callGemini(prompt, rawPrompt = "", options = {}) {
  const apiKey = process.env.GEMINI_API_KEY;
  const providerMode = String(options.providerMode || "").trim().toLowerCase();
  const geminiLocalOnly = providerMode === "gemini-local";

  if (!apiKey) {
    if (geminiLocalOnly) {
      return {
        configured: false,
        content: buildLocalFallback(rawPrompt, options),
        fallback: true,
        provider: "local",
        note: "Gemini API key is not configured, so the local guide answered.",
      };
    }

    const openAiResult = await callOpenAI(prompt);
    if (openAiResult.configured && !openAiResult.failed) return openAiResult;
    return {
      configured: false,
      content: buildLocalFallback(rawPrompt, options),
      fallback: true,
      provider: "local",
      note: "No live AI key is configured.",
    };
  }

  let lastFailure = null;
  for (const model of getGeminiModels()) {
    for (let attempt = 0; attempt <= MODEL_RETRY_COUNT; attempt += 1) {
      const result = await requestGeminiModel({ prompt, apiKey, model });
      if (result.ok) {
        return { configured: true, content: result.content, model: result.model, provider: "gemini" };
      }

      lastFailure = result;
      if (!RETRYABLE_STATUS_CODES.has(result.status) || attempt === MODEL_RETRY_COUNT) break;
      await delay(700 * (attempt + 1));
    }
  }

  if (geminiLocalOnly) {
    return {
      configured: true,
      content: buildLocalFallback(rawPrompt, options),
      fallback: true,
      provider: "local",
      status: lastFailure?.status || 500,
      note: "Gemini is unavailable, so the local guide answered.",
    };
  }

  const openAiResult = await callOpenAI(prompt);
  if (openAiResult.configured && !openAiResult.failed) return openAiResult;

  return {
    configured: true,
    content: buildLocalFallback(rawPrompt, options),
    fallback: true,
    provider: "local",
    status: lastFailure?.status || openAiResult?.status || 500,
    note: "Live AI is unavailable, so the local guide answered.",
  };
}

function buildAssistantPrompt(userPrompt) {
  return `${APP_CONTEXT}

User question:
${String(userPrompt || "").trim()}

Answer as KrishiNova AI.`;
}

function buildRobotSystemPrompt({ userPrompt, language, detectedLanguage, memory, intentType, action }) {
  return `${APP_CONTEXT}

You are running in a real-time robotic assistant environment.

Robot rules:
1. Detect the user's language and reply in the same language. Selected language code: ${language}. Detected language: ${detectedLanguage || "not detected"}.
2. Classify the user input as: information_request, action_command, or conversation. Current classification: ${intentType}.
3. If action command, keep the spoken answer short and include the action separately as JSON. Current action: ${action ? JSON.stringify(action) : "none"}.
4. Use memory to personalize, but do not reveal private memory unless helpful.
5. If asked "Introduce your project" or "tell everything about project", give structured sections: Project Name, Purpose, Features, Technologies used, How it works.
6. Be fast, clear, human-like and concise.

Stored memory:
${Object.entries(memory || {})
  .map(([key, value]) => `- ${key}: ${value}`)
  .join("\n") || "- none"}

User message:
${String(userPrompt || "").trim()}`;
}

const AGENT_ROUTE_CATALOG = [
  { label: "AI farming tools", path: "/farmer", words: ["tools", "tool", "ai tools", "farming tools", "prediction tools", "ml tools", "farmer tools", "tool page", "\u091f\u0942\u0932", "\u091f\u0942\u0932\u094d\u0938", "\u0915\u0943\u0937\u093f \u091f\u0942\u0932"] },
  { label: "customer marketplace", path: "/customer/marketplace", words: ["customer", "customers", "customer page", "customer marketplace", "customer market", "cusromer", "coustomer", "costumer", "buyer", "buyers", "buying page", "\u0915\u0938\u094d\u091f\u092e\u0930", "\u0917\u094d\u0930\u093e\u0939\u0915", "\u0916\u0930\u0940\u0926"] },
  { label: "crop prediction", path: "/farmer/crop-prediction", words: ["prediction", "prediction tool", "crop prediction", "crop predictor", "predict crop", "predict", "open prediction", "\u092b\u0938\u0932 \u092a\u0942\u0930\u094d\u0935\u093e\u0928\u0941\u092e\u093e\u0928"] },
  { label: "crop recommendation", path: "/farmer/crop-recommendation", words: ["recommendation", "recommentation", "recomendation", "recommend", "crop recommendation", "crop recommend", "crop suggestion", "suggest crop", "suggestion tool", "\u092b\u0938\u0932 \u0938\u0941\u091d\u093e\u0935"] },
  { label: "fertilizer suggestion", path: "/farmer/fertilizer-recommendation", words: ["fertilizer", "fertiliser", "fertilizer tool", "fertiliser tool", "urea", "npk", "manure", "\u0916\u093e\u0926", "\u092f\u0942\u0930\u093f\u092f\u093e", "\u0909\u0930\u094d\u0935\u0930\u0915"] },
  { label: "rainfall prediction", path: "/farmer/rainfall-prediction", words: ["rain", "rainfall", "rain prediction", "rain tool", "rainfall tool", "\u092c\u093e\u0930\u093f\u0936"] },
  { label: "yield prediction", path: "/farmer/yield-prediction", words: ["yield", "yield tool", "yield prediction", "production", "production tool", "\u0909\u092a\u091c"] },
  { label: "contact page", path: "/contact", words: ["contact", "contacts", "contact page", "support", "help page", "\u0915\u093e\u0902\u091f\u0947\u0915\u094d\u091f", "\u0915\u0949\u0928\u094d\u091f\u0948\u0915\u094d\u091f", "\u0915\u0902\u091f\u0947\u0915\u094d\u091f", "\u0938\u0902\u092a\u0930\u094d\u0915", "\u0938\u092a\u094b\u0930\u094d\u091f"] },
  { label: "home page", path: "/", words: ["home", "main page", "landing", "होम"] },
  { label: "marketplace", path: "__role_marketplace", words: ["marketplace", "market", "workspace", "dashboard", "मार्केटप्लेस", "मार्केट", "बाजार", "डैशबोर्ड"] },
  { label: "contact page", path: "/contact", words: ["contact", "कांटेक्ट", "कॉन्टैक्ट", "कंटेक्ट", "संपर्क", "support", "सपोर्ट", "help page"] },
  { label: "login and signup", path: "/auth", words: ["login", "लॉगिन", "signup", "साइन", "register", "रजिस्टर", "auth", "otp"] },
  { label: "farmer marketplace", path: "/farmer/marketplace", words: ["farmer marketplace", "फार्मर मार्केट", "किसान मार्केट", "sell crop", "add product", "प्रोडक्ट जोड़", "stock", "listing", "बेच"] },
  { label: "customer marketplace", path: "/customer/marketplace", words: ["customer marketplace", "कस्टमर मार्केट", "कस्टमर मार्केटप्लेस", "ग्राहक मार्केट", "buy crop", "buy crops", "cart", "browse crop", "खरीद"] },
  { label: "admin marketplace", path: "/admin/marketplace", words: ["admin marketplace", "एडमिन मार्केट", "admin dashboard", "एडमिन डैशबोर्ड", "admin panel"] },
  { label: "farmer profile", path: "/farmer/profile", words: ["farmer profile", "farm profile", "किसान प्रोफाइल", "फार्मर प्रोफाइल"] },
  { label: "customer profile", path: "/customer/profile", words: ["customer profile", "कस्टमर प्रोफाइल", "ग्राहक प्रोफाइल", "my profile"] },
  { label: "admin profile", path: "/admin/profile", words: ["admin profile", "एडमिन प्रोफाइल"] },
  { label: "weather", path: "/farmer/weather", words: ["weather", "वेदर", "forecast", "mausam", "मौसम"] },
  { label: "agriculture news", path: "/farmer/news", words: ["news", "न्यूज", "न्यूज़", "samachar", "समाचार", "खबर", "agriculture news"] },
  { label: "invoice", path: "/customer/invoices", words: ["invoice", "invoices", "इनवॉइस", "इनवाइस", "चालान", "बिल"] },
  { label: "crop prediction", path: "/farmer/crop-prediction", words: ["crop prediction", "predict crop"] },
  { label: "crop recommendation", path: "/farmer/crop-recommendation", words: ["crop recommendation", "which crop"] },
  { label: "fertilizer suggestion", path: "/farmer/fertilizer-recommendation", words: ["fertilizer", "urea", "npk"] },
  { label: "rainfall prediction", path: "/farmer/rainfall-prediction", words: ["rainfall", "rain prediction"] },
  { label: "yield prediction", path: "/farmer/yield-prediction", words: ["yield", "production"] },
  { label: "farmer chatbot", path: "/farmer/chatbot", words: ["chatbot", "ai assistant", "bot"] },
  { label: "admin farmers", path: "/admin/farmers", words: ["verify farmers", "admin farmers", "farmer management", "किसान मैनेज", "फार्मर मैनेज"] },
  { label: "admin customers", path: "/admin/customers", words: ["admin customers", "customer management", "ग्राहक मैनेज", "कस्टमर मैनेज"] },
  { label: "admin stock", path: "/admin/stock", words: ["approve product", "approve listing", "admin stock", "स्टॉक अप्रूवल"] },
  { label: "admin messages", path: "/admin/messages", words: ["contact messages", "support messages", "admin messages", "कांटेक्ट मैसेज", "सपोर्ट मैसेज"] },
];

function matchAgentRoute(text = "") {
  const normalized = normalizeText(text);
  return AGENT_ROUTE_CATALOG.map((route) => {
    const score = route.words.reduce((total, word) => (normalized.includes(normalizeText(word)) ? total + normalizeText(word).split(" ").length : total), 0);
    return { route, score };
  })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)[0]?.route;
}

function extractProductDraft(text = "") {
  const normalized = String(text || "");
  const nameMatch = normalized.match(/(?:sell|add|list|बेच|जोड़)\s+([a-zA-Z\u0900-\u097F ]{2,40}?)(?:\s+\d|\s+at|\s+price|\s+for|$)/i);
  const quantityMatch = normalized.match(/(\d+(?:\.\d+)?)\s*(kg|kilo|kilogram|quintal|ton|tons|किलो|क्विंटल)/i);
  const priceMatch = normalized.match(/(?:₹|rs\.?|rupees?|price|rate)\s*(\d+(?:\.\d+)?)/i) || normalized.match(/(\d+(?:\.\d+)?)\s*(?:rupees?|rs\.?|₹)\s*(?:per|\/)?/i);
  const locationMatch = normalized.match(/(?:in|at|from|location)\s+([a-zA-Z\u0900-\u097F ]{2,40})$/i);
  return {
    name: nameMatch?.[1]?.trim() || "",
    quantity: quantityMatch ? `${quantityMatch[1]} ${quantityMatch[2]}` : "",
    price: priceMatch?.[1] || "",
    location: locationMatch?.[1]?.trim() || "",
  };
}

function deterministicAgentAction(message, role = "guest") {
  const text = String(message || "");
  const normalized = normalizeText(text);
  const route =
    matchAgentRoute(text) ||
    (/(marketplace|market|workspace|dashboard|मार्केटप्लेस|मार्केट|बाजार|डैशबोर्ड)/i.test(normalized)
      ? { label: "marketplace", path: marketplacePathForRole(role) }
      : null);

  const hasNavigationVerb =
    /\b(open|go|show|navigate|launch|start|take|khol|kholo|dikhao)\b/i.test(text) ||
    /\u0916\u094b\u0932|\u0926\u093f\u0916\u093e|\u0932\u0947\s+\u091a\u0932|\u091c\u093e\u0913|\u091a\u093e\u0932\u0942/i.test(text);

  if (route && hasNavigationVerb) {
    const path = route.path === "__role_marketplace" ? marketplacePathForRole(role) : route.path;
    return {
      action: "navigate",
      label: route.label,
      path,
      content: `Opening ${route.label}.`,
      confidence: 0.9,
    };
  }

  if (route && /\b(open|go|show|navigate|launch|start|खोल|दिखा)\b/i.test(text)) {
    const path = route.path === "__role_marketplace" ? marketplacePathForRole(role) : route.path;
    return {
      action: "navigate",
      label: route.label,
      path,
      content: `Opening ${route.label}.`,
      confidence: 0.86,
    };
  }

  if (/(add|list|sell|बेच|जोड़).*(crop|product|फसल|सब्जी|फल)|\b(tomato|potato|onion|rice|wheat|maize)\b/i.test(text)) {
    const draft = extractProductDraft(text);
    return {
      action: "product_draft",
      label: "crop listing draft",
      path: role === "farmer" ? "/farmer/marketplace" : "/auth",
      draft,
      content: "I prepared a crop listing draft. Please review price, quantity, location, and submit from Farmer Marketplace.",
      confidence: 0.72,
    };
  }

  if (/(translate|अनुवाद|language|भाषा)/i.test(text)) {
    return {
      action: "language_tools",
      label: "Sarvam language tools",
      content: "I can translate, transliterate, detect language, and speak replies using Sarvam AI.",
      confidence: 0.7,
    };
  }

  if (/(order|payment|payout|invoice|refund|dispute|commission)/i.test(normalized)) {
    return {
      action: "guide",
      label: "marketplace operation",
      content: "I can guide orders, payment holding, commission, invoices, disputes, and payout release. Open your marketplace workspace to see the live records.",
      path: role === "admin" ? "/admin/marketplace" : role === "customer" ? "/customer/marketplace" : "/farmer/marketplace",
      confidence: 0.65,
    };
  }

  return {
    action: "answer",
    label: "Sarvam assistant",
    content: "Ask me to open a page, create a crop listing draft, translate text, explain orders/payments, or answer farming questions.",
    confidence: 0.45,
  };
}

const AGENT_TOOLS = [
  {
    type: "function",
    function: {
      name: "navigate_to_page",
      description: "Open a KrishiNova page/workspace for the user.",
      parameters: {
        type: "object",
        properties: {
          label: { type: "string" },
          path: { type: "string" },
        },
        required: ["label", "path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_crop_listing_draft",
      description: "Extract a farmer crop/product listing draft from natural speech.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string" },
          quantity: { type: "string" },
          price: { type: "string" },
          location: { type: "string" },
          category: { type: "string" },
        },
        required: ["name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "guide_marketplace_flow",
      description: "Guide user for orders, payments, commission, invoices, disputes, payouts, and admin trust workflows.",
      parameters: {
        type: "object",
        properties: {
          topic: { type: "string" },
          role: { type: "string" },
        },
        required: ["topic"],
      },
    },
  },
];

function actionFromToolCall(toolCall, fallback) {
  const name = toolCall?.function?.name;
  let args = {};
  try {
    args = JSON.parse(toolCall?.function?.arguments || "{}");
  } catch {}

  if (name === "navigate_to_page") {
    const route = AGENT_ROUTE_CATALOG.find((item) => item.path === args.path) || matchAgentRoute(args.label || "");
    const routePath = route?.path === "__role_marketplace" ? fallback.path : route?.path;
    return {
      action: "navigate",
      label: route?.label || args.label || fallback.label,
      path: routePath || args.path || fallback.path,
      content: `Opening ${route?.label || args.label || "page"}.`,
      confidence: 0.9,
    };
  }

  if (name === "create_crop_listing_draft") {
    return {
      action: "product_draft",
      label: "crop listing draft",
      path: "/farmer/marketplace",
      draft: args,
      content: "I prepared a crop listing draft from your speech. Review it before submitting.",
      confidence: 0.85,
    };
  }

  if (name === "guide_marketplace_flow") {
    return {
      action: "guide",
      label: args.topic || "marketplace flow",
      content: fallback.content,
      path: fallback.path,
      confidence: 0.78,
    };
  }

  return fallback;
}

router.post(
  "/quote",
  asyncHandler(async (_req, res) => {
    const result = await callGemini(
      `${APP_CONTEXT}

Give me a short quote related to agriculture and farming in the format:
quote - author`,
    );
    res.json(result);
  }),
);

router.post(
  "/chat",
  asyncHandler(async (req, res) => {
    const message = String(req.body?.message || "").trim();
    const requestedLanguage = getLanguageCode(String(req.body?.language || "en-IN").trim(), message);
    const detectedLanguage = await detectRobotLanguage(message, requestedLanguage);
    const language = detectedLanguage || requestedLanguage;
    const userRole = String(req.body?.userRole || "guest").trim();
    const currentPage = String(req.body?.currentPage || "").trim();
    const sessionId = safeSessionId(req.body?.sessionId || req.body?.userId || `${userRole || "guest"}-browser`);
    const memory = await getRobotMemory(sessionId);
    const detectedName = extractUserName(message);
    if (detectedName) {
      memory.user_name = detectedName;
      await upsertRobotMemory({ sessionId, userRole, key: "user_name", value: detectedName, confidence: 1 });
    }
    const intentType = classifyRobotIntent(message);
    const action = classifyRobotAction(message, userRole);

    const prompt =
      req.body?.prompt ||
      `User language: ${LANGUAGE_NAMES[language] || "English"}.
User language code: ${language}.
User role: ${userRole || "guest"}.
Current page: ${currentPage || "unknown"}.
User said: ${message || "Hello"}`;
    const rawQuestion = message || prompt;

    if (intentType === "project_intro") {
      const content = await translateContentIfNeeded(buildProjectIntroText(memory, language), language, "project_intro");
      await storeRobotInteraction({
        sessionId,
        userRole,
        language,
        detectedLanguage,
        intentType,
        action: null,
        message,
        response: content,
        provider: "robot-memory",
      });
      return res.json({
        configured: true,
        content,
        fallback: true,
        provider: "robot-memory",
        intent: "project_intro",
        intentType,
        detectedLanguage,
        memory,
      });
    }

    if (action) {
      const content = await translateContentIfNeeded(`Command detected. Opening ${action.label}.`, language, "action_command");
      await storeRobotInteraction({
        sessionId,
        userRole,
        language,
        detectedLanguage,
        intentType,
        action,
        message,
        response: content,
        provider: "robot-action",
      });
      return res.json({
        configured: true,
        content,
        fallback: true,
        provider: "robot-action",
        intent: "action_command",
        intentType,
        detectedLanguage,
        action,
        json: {
          action: action.action,
          parameters: action.parameters,
        },
        memory,
      });
    }

    const roleIntent = explicitRoleIntent(message);
    if (roleIntent && /\b(what|tell|explain|guide|can|do|work|features|dashboard)\b/i.test(message + " ") || (roleIntent && /क्या|का|कर|काम|बताओ|बताईं|बता/i.test(message))) {
      const content = await translateContentIfNeeded(answerFor(roleIntent, language), language, roleIntent);
      await storeRobotInteraction({
        sessionId,
        userRole,
        language,
        detectedLanguage,
        intentType: "information_request",
        action: null,
        message,
        response: content,
        provider: "local",
      });
      return res.json({
        configured: true,
        content,
        fallback: true,
        provider: "local",
        intent: roleIntent,
        action: null,
        dataset: { role: roleIntent === "role_farmer" ? "farmer" : roleIntent === "role_customer" ? "customer" : "admin", stats: getRobotDatasetStats() },
        intentType: "information_request",
        detectedLanguage,
        memory,
        note: "Role guide answered without waiting for live AI.",
      });
    }

    const local = matchLocalGuide(rawQuestion, { language, role: userRole });
    const useLiveAi = shouldAskLiveAi({ local, rawQuestion, body: req.body });

    if (!useLiveAi && local.found && local.confidence >= 0.5) {
      const content = await translateContentIfNeeded(local.content, language, local.intent);
      await storeRobotInteraction({
        sessionId,
        userRole,
        language,
        detectedLanguage,
        intentType: local.intent === "remember_name" ? "conversation" : intentType,
        action: null,
        message,
        response: content,
        provider: "local",
      });
      return res.json({
        configured: true,
        content,
        fallback: true,
        provider: "local",
        intent: local.intent,
        action: local.action || null,
        dataset: local.dataset || null,
        intentType,
        detectedLanguage,
        memory,
        note: "Local guide answered without waiting for live AI.",
      });
    }

    const robotPrompt = buildRobotSystemPrompt({
      userPrompt: prompt,
      language,
      detectedLanguage,
      memory,
      intentType,
      action,
    });
    const result = await withFastFallback(
      callGemini(robotPrompt, rawQuestion, {
        language,
        role: userRole,
        preferredProvider: req.body?.preferredProvider,
        providerMode: req.body?.providerMode,
      }),
      rawQuestion,
      {
        language,
        role: userRole,
        preferredProvider: req.body?.preferredProvider,
        providerMode: req.body?.providerMode,
      },
    );
    if (result?.provider === "local" || result?.fallback) {
      result.content = await translateContentIfNeeded(result.content, language, result.intent);
    }
    result.intentType = intentType;
    result.detectedLanguage = detectedLanguage;
    result.memory = memory;
    await storeRobotInteraction({
      sessionId,
      userRole,
      language,
      detectedLanguage,
      intentType,
      action: result.action || null,
      message,
      response: result.content,
      provider: result.provider,
    });
    res.json(result);
  }),
);

router.get(
  "/sarvam/status",
  asyncHandler(async (_req, res) => {
    res.json(getSarvamStatus());
  }),
);

router.get(
  "/robot/dataset",
  asyncHandler(async (_req, res) => {
    res.json(getRobotDatasetStats());
  }),
);

router.post(
  "/sarvam/tts",
  asyncHandler(async (req, res) => {
    try {
      const result = await textToSpeech({
        text: req.body?.text,
        language: req.body?.language,
        speaker: req.body?.speaker,
        pace: req.body?.pace,
        temperature: req.body?.temperature,
      });
      res.json(result);
    } catch (error) {
      res.status(error.status || 503).json({
        configured: false,
        provider: "sarvam",
        fallback: true,
        message: error.message || "Sarvam voice is unavailable. Use browser voice fallback.",
      });
    }
  }),
);

router.post(
  "/sarvam/stt",
  asyncHandler(async (req, res) => {
    try {
      const result = await speechToText({
        audioBase64: req.body?.audioBase64,
        mimeType: String(req.body?.mimeType || "").split(";")[0] || req.body?.mimeType,
        language: req.body?.language,
        mode: req.body?.mode,
      });
      res.json(result);
    } catch (error) {
      res.status(error.status || 503).json({
        configured: false,
        provider: "sarvam",
        fallback: true,
        transcript: "",
        message: error.message || "Sarvam speech recognition is unavailable. Use browser microphone fallback.",
      });
    }
  }),
);

router.post(
  "/sarvam/translate",
  asyncHandler(async (req, res) => {
    const result = await translateText({
      input: req.body?.input || req.body?.text,
      sourceLanguage: req.body?.sourceLanguage || req.body?.source_language_code || "auto",
      targetLanguage: req.body?.targetLanguage || req.body?.target_language_code || "hi-IN",
      mode: req.body?.mode,
      speakerGender: req.body?.speakerGender,
      outputScript: req.body?.outputScript,
      numeralsFormat: req.body?.numeralsFormat,
    });
    res.json(result);
  }),
);

router.post(
  "/sarvam/transliterate",
  asyncHandler(async (req, res) => {
    const result = await transliterateText({
      input: req.body?.input || req.body?.text,
      sourceLanguage: req.body?.sourceLanguage || req.body?.source_language_code || "hi-IN",
      targetLanguage: req.body?.targetLanguage || req.body?.target_language_code || "en-IN",
      spokenForm: req.body?.spokenForm,
      numeralsFormat: req.body?.numeralsFormat,
      spokenFormNumeralsLanguage: req.body?.spokenFormNumeralsLanguage,
    });
    res.json(result);
  }),
);

router.post(
  "/sarvam/detect-language",
  asyncHandler(async (req, res) => {
    const result = await detectLanguage({ input: req.body?.input || req.body?.text });
    res.json(result);
  }),
);

router.post(
  "/sarvam/chat",
  asyncHandler(async (req, res) => {
    const messages = Array.isArray(req.body?.messages)
      ? req.body.messages
      : [
          {
            role: "system",
            content: APP_CONTEXT,
          },
          {
            role: "user",
            content: String(req.body?.message || "Hello"),
          },
        ];
    const result = await chatCompletion({
      messages,
      temperature: req.body?.temperature,
      maxTokens: req.body?.maxTokens,
    });
    res.json(result);
  }),
);

router.post(
  "/sarvam/agent",
  asyncHandler(async (req, res) => {
    const message = String(req.body?.message || "").trim();
    const language = getLanguageCode(String(req.body?.language || "en-IN"), message);
    const userRole = String(req.body?.userRole || "guest");
    const fallback = deterministicAgentAction(message, userRole);

    if (!message) return res.json(fallback);
    if (fallback.action && fallback.action !== "answer") {
      return res.json({
        ...fallback,
        provider: "local-agent-fallback",
        note: "Deterministic app command handled before live AI.",
      });
    }

    try {
      const result = await chatCompletion({
        messages: [
          {
            role: "system",
            content: `${APP_CONTEXT}

You are an action agent. If the user asks to open or operate the app, call one of the provided tools.
Only use paths from KrishiNova. Never invent external links. Keep any normal answer short and practical.
User role: ${userRole}. Reply language code: ${language}.`,
          },
          { role: "user", content: message },
        ],
        tools: AGENT_TOOLS,
        toolChoice: "auto",
        temperature: 0.1,
        maxTokens: 400,
      });

      const toolAction = result.toolCalls?.length ? actionFromToolCall(result.toolCalls[0], fallback) : fallback;
      return res.json({
        ...toolAction,
        content: result.content || toolAction.content,
        provider: "sarvam",
        model: result.model,
        toolCalls: result.toolCalls || [],
      });
    } catch (error) {
      return res.json({
        ...fallback,
        provider: "local-agent-fallback",
        note: error.message || "Sarvam agent fallback used.",
      });
    }
  }),
);

export default router;
