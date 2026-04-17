import { Route, Routes } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import HomePage from "./pages/HomePage.jsx";
import AuthPage from "./pages/AuthPage.jsx";
import AccessDeniedPage from "./pages/AccessDeniedPage.jsx";
import ContactPage from "./pages/ContactPage.jsx";
import AuthAliasPage from "./pages/AuthAliasPage.jsx";
import FarmerPage from "./pages/FarmerPage.jsx";
import CustomerPage from "./pages/CustomerPage.jsx";
import CustomerBuyCropsPage from "./pages/CustomerBuyCropsPage.jsx";
import CustomerInvoicesPage from "./pages/CustomerInvoicesPage.jsx";
import CustomerInvoicePage from "./pages/CustomerInvoicePage.jsx";
import AdminPage from "./pages/AdminPage.jsx";
import FarmerCropPredictionPage from "./pages/FarmerCropPredictionPage.jsx";
import FarmerCropRecommendationPage from "./pages/FarmerCropRecommendationPage.jsx";
import FarmerFertilizerPage from "./pages/FarmerFertilizerPage.jsx";
import FarmerRainfallPage from "./pages/FarmerRainfallPage.jsx";
import FarmerWeatherPage from "./pages/FarmerWeatherPage.jsx";
import FarmerNewsPage from "./pages/FarmerNewsPage.jsx";
import FarmerChatbotPage from "./pages/FarmerChatbotPage.jsx";
import FarmerProfilePage from "./pages/FarmerProfilePage.jsx";
import FarmerSellingHistoryPage from "./pages/FarmerSellingHistoryPage.jsx";
import FarmerYieldPredictionPage from "./pages/FarmerYieldPredictionPage.jsx";
import FarmerTradeCropsPage from "./pages/FarmerTradeCropsPage.jsx";
import FarmerStockPage from "./pages/FarmerStockPage.jsx";
import CustomerStockPage from "./pages/CustomerStockPage.jsx";
import CustomerProfilePage from "./pages/CustomerProfilePage.jsx";
import AdminFarmersPage from "./pages/AdminFarmersPage.jsx";
import AdminCustomersPage from "./pages/AdminCustomersPage.jsx";
import AdminMessagesPage from "./pages/AdminMessagesPage.jsx";
import AdminStockPage from "./pages/AdminStockPage.jsx";
import AdminProfilePage from "./pages/AdminProfilePage.jsx";

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/contact.php" element={<ContactPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/access-denied" element={<AccessDeniedPage />} />
        <Route path="/farmer/flogin" element={<AuthAliasPage target="farmer-login" />} />
        <Route path="/farmer/fregister" element={<AuthAliasPage target="farmer-register" />} />
        <Route path="/customer/clogin" element={<AuthAliasPage target="customer-login" />} />
        <Route path="/customer/cregister" element={<AuthAliasPage target="customer-register" />} />
        <Route path="/admin/alogin" element={<AuthAliasPage target="admin-login" />} />
        <Route path="/farmer" element={<FarmerPage />} />
        <Route path="/farmer/crop-prediction" element={<FarmerCropPredictionPage />} />
        <Route path="/farmer/fcrop_prediction" element={<FarmerCropPredictionPage />} />
        <Route path="/farmer/crop-recommendation" element={<FarmerCropRecommendationPage />} />
        <Route path="/farmer/fcrop_recommendation" element={<FarmerCropRecommendationPage />} />
        <Route path="/farmer/fertilizer-recommendation" element={<FarmerFertilizerPage />} />
        <Route path="/farmer/ffertilizer_recommendation" element={<FarmerFertilizerPage />} />
        <Route path="/farmer/rainfall-prediction" element={<FarmerRainfallPage />} />
        <Route path="/farmer/frainfall_prediction" element={<FarmerRainfallPage />} />
        <Route path="/farmer/yield-prediction" element={<FarmerYieldPredictionPage />} />
        <Route path="/farmer/fyield_prediction" element={<FarmerYieldPredictionPage />} />
        <Route path="/farmer/trade-crops" element={<FarmerTradeCropsPage />} />
        <Route path="/farmer/ftradecrops" element={<FarmerTradeCropsPage />} />
        <Route path="/farmer/fstock_crop" element={<FarmerStockPage />} />
        <Route path="/farmer/weather" element={<FarmerWeatherPage />} />
        <Route path="/farmer/fweather_prediction" element={<FarmerWeatherPage />} />
        <Route path="/farmer/news" element={<FarmerNewsPage />} />
        <Route path="/farmer/fnewsfeed" element={<FarmerNewsPage />} />
        <Route path="/farmer/chatbot" element={<FarmerChatbotPage />} />
        <Route path="/farmer/fchatgpt" element={<FarmerChatbotPage />} />
        <Route path="/farmer/profile" element={<FarmerProfilePage />} />
        <Route path="/farmer/fprofile" element={<FarmerProfilePage />} />
        <Route path="/farmer/selling-history" element={<FarmerSellingHistoryPage />} />
        <Route path="/farmer/fselling_history" element={<FarmerSellingHistoryPage />} />
        <Route path="/customer" element={<CustomerPage />} />
        <Route path="/customer/buy-crops" element={<CustomerBuyCropsPage />} />
        <Route path="/customer/cbuy_crops" element={<CustomerBuyCropsPage />} />
        <Route path="/customer/crop-stocks" element={<CustomerStockPage />} />
        <Route path="/customer/cstock_crop" element={<CustomerStockPage />} />
        <Route path="/customer/invoices" element={<CustomerInvoicesPage />} />
        <Route path="/customer/cinvoices" element={<CustomerInvoicesPage />} />
        <Route path="/customer/cinvoices/:invoiceId" element={<CustomerInvoicePage />} />
        <Route path="/customer/profile" element={<CustomerProfilePage />} />
        <Route path="/customer/cprofile" element={<CustomerProfilePage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/admin/farmers" element={<AdminFarmersPage />} />
        <Route path="/admin/afarmers" element={<AdminFarmersPage />} />
        <Route path="/admin/customers" element={<AdminCustomersPage />} />
        <Route path="/admin/acustomers" element={<AdminCustomersPage />} />
        <Route path="/admin/messages" element={<AdminMessagesPage />} />
        <Route path="/admin/aviewmsg" element={<AdminMessagesPage />} />
        <Route path="/admin/stock" element={<AdminStockPage />} />
        <Route path="/admin/aproducedcrop" element={<AdminStockPage />} />
        <Route path="/admin/profile" element={<AdminProfilePage />} />
        <Route path="/admin/aprofile" element={<AdminProfilePage />} />
      </Routes>
    </Layout>
  );
}
