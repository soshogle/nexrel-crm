import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { CartProvider } from "./contexts/CartContext";
import { EcommerceContentProvider } from "./contexts/EcommerceContentContext";
import CartDrawer from "./components/CartDrawer";
import VoiceAIOrchestrator from "./components/VoiceAIOrchestrator";
import Home from "./pages/Home";
import Shop from "./pages/Shop";
import CategoryPage from "./pages/CategoryPage";
import ProductPage from "./pages/ProductPage";
import BlogPage from "./pages/BlogPage";
import BlogPostPage from "./pages/BlogPostPage";
import AboutPage from "./pages/AboutPage";
import ContactPage from "./pages/ContactPage";
import FAQPage from "./pages/FAQPage";
import VideosPage from "./pages/VideosPage";
import ReviewsPage from "./pages/ReviewsPage";
import ShippingPage from "./pages/ShippingPage";
import PrivacyPage from "./pages/PrivacyPage";
import TermsPage from "./pages/TermsPage";
import GenericPage from "./pages/GenericPage";
import CartPage from "./pages/CartPage";
import AccountPage from "./pages/AccountPage";
import WishlistPage from "./pages/WishlistPage";
import SearchPage from "./pages/SearchPage";
import CheckoutPage from "./pages/CheckoutPage";
import OrderConfirmation from "./pages/OrderConfirmation";
import AdminDashboard from "./pages/AdminDashboard";
import LoginPage from "./pages/LoginPage";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={LoginPage} />
      <Route path="/shop" component={Shop} />
      <Route path="/category/:slug" component={CategoryPage} />
      <Route path="/product/:slug" component={ProductPage} />
      <Route path="/blog" component={BlogPage} />
      <Route path="/blog/:slug" component={BlogPostPage} />
      <Route path="/about" component={AboutPage} />
      <Route path="/contact" component={ContactPage} />
      <Route path="/faq" component={FAQPage} />
      <Route path="/videos" component={VideosPage} />
      <Route path="/reviews" component={ReviewsPage} />
      <Route path="/shipping-and-returns" component={ShippingPage} />
      <Route path="/privacy-policy" component={PrivacyPage} />
      <Route path="/terms-and-conditions" component={TermsPage} />
      <Route path="/cart" component={CartPage} />
      <Route path="/checkout" component={CheckoutPage} />
      <Route path="/order-confirmation/:orderNumber" component={OrderConfirmation} />
      <Route path="/account" component={AccountPage} />
      <Route path="/wishlist" component={WishlistPage} />
      <Route path="/search" component={SearchPage} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/:tab" component={AdminDashboard} />
      <Route path="/page/:slug" component={GenericPage} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <EcommerceContentProvider>
        <CartProvider>
          <TooltipProvider>
            <Toaster />
            <CartDrawer />
            <VoiceAIOrchestrator />
            <Router />
          </TooltipProvider>
        </CartProvider>
        </EcommerceContentProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
