"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { isMenuItemVisible } from "@/lib/industry-menu-config";
import type { Industry } from "@/lib/industry-menu-config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Package,
  Plus,
  Search,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  Loader2,
  FolderTree,
  Truck,
  MapPin,
  Download,
  Upload,
  Settings,
  TrendingDown,
  BarChart3,
  Barcode,
  Bell,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import AddItemDialog from "@/components/inventory/add-item-dialog";
import StockAdjustmentDialog from "@/components/inventory/stock-adjustment-dialog";
import ManageCategoriesDialog from "@/components/inventory/manage-categories-dialog";
import ManageSuppliersDialog from "@/components/inventory/manage-suppliers-dialog";
import ManageLocationsDialog from "@/components/inventory/manage-locations-dialog";
import BulkImportDialog from "@/components/inventory/bulk-import-dialog";
import ReportsDialog from "@/components/inventory/reports-dialog";
import EcommerceSyncTab from "@/components/inventory/ecommerce-sync-tab";
import BarcodeSearchDialog from "@/components/inventory/barcode-search-dialog";
import EcommerceSyncConfigDialog from "@/components/inventory/ecommerce-sync-config-dialog";
import LowStockAlertsDialog from "@/components/inventory/low-stock-alerts-dialog";

export default function GeneralInventoryPage() {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const [resolvedIndustry, setResolvedIndustry] = useState<Industry | null>(
    (session?.user?.industry as Industry) || null,
  );
  const [isLoading, setIsLoading] = useState(true);

  // Check if user's industry has access to inventory
  const userIndustry =
    resolvedIndustry || (session?.user?.industry as Industry) || null;
  const hasInventoryAccess = isMenuItemVisible(
    "general-inventory",
    userIndustry,
  );
  const isAdmin = ["SUPER_ADMIN", "AGENCY_ADMIN", "BUSINESS_OWNER"].includes(
    (session?.user?.role as string) || "",
  );

  useEffect(() => {
    const fromSession = (session?.user?.industry as Industry) || null;
    if (fromSession) {
      setResolvedIndustry(fromSession);
      return;
    }

    if (sessionStatus === "authenticated") {
      fetch("/api/session/context")
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          const industry = (data?.industry as Industry | null) || null;
          if (industry) setResolvedIndustry(industry);
        })
        .catch(() => {});
    }
  }, [sessionStatus, session?.user?.industry]);

  // Redirect real estate users away from inventory
  useEffect(() => {
    if (
      sessionStatus === "authenticated" &&
      userIndustry &&
      !hasInventoryAccess
    ) {
      router.push("/dashboard");
    }
  }, [sessionStatus, hasInventoryAccess, userIndustry, router]);

  // Show loading while checking access
  if (
    sessionStatus === "loading" ||
    (sessionStatus === "authenticated" && userIndustry && !hasInventoryAccess)
  ) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Guard against unauthenticated state
  if (sessionStatus === "unauthenticated" || !session) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <p className="text-muted-foreground">
            Please sign in to access inventory
          </p>
        </div>
      </div>
    );
  }
  const [stats, setStats] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showAdjustmentDialog, setShowAdjustmentDialog] = useState(false);
  const [showCategoriesDialog, setShowCategoriesDialog] = useState(false);
  const [showSuppliersDialog, setShowSuppliersDialog] = useState(false);
  const [showLocationsDialog, setShowLocationsDialog] = useState(false);
  const [showBulkImportDialog, setShowBulkImportDialog] = useState(false);
  const [showReportsDialog, setShowReportsDialog] = useState(false);
  const [showBarcodeSearchDialog, setShowBarcodeSearchDialog] = useState(false);
  const [showEcommerceSyncDialog, setShowEcommerceSyncDialog] = useState(false);
  const [showLowStockAlertsDialog, setShowLowStockAlertsDialog] =
    useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  useEffect(() => {
    if (!userIndustry) return;
    loadData();
  }, [userIndustry]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [statsRes, itemsRes, categoriesRes, suppliersRes, locationsRes] =
        await Promise.all([
          fetch("/api/general-inventory/stats"),
          fetch("/api/general-inventory/items"),
          fetch("/api/general-inventory/categories"),
          fetch("/api/general-inventory/suppliers"),
          fetch("/api/general-inventory/locations"),
        ]);

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data.stats);
      }

      if (itemsRes.ok) {
        const data = await itemsRes.json();
        setItems(Array.isArray(data?.items) ? data.items : []);
      }

      if (categoriesRes.ok) {
        const data = await categoriesRes.json();
        setCategories(Array.isArray(data?.categories) ? data.categories : []);
      }

      if (suppliersRes.ok) {
        const data = await suppliersRes.json();
        setSuppliers(Array.isArray(data?.suppliers) ? data.suppliers : []);
      }

      if (locationsRes.ok) {
        const data = await locationsRes.json();
        setLocations(Array.isArray(data?.locations) ? data.locations : []);
      }
    } catch (error) {
      console.error("Error loading inventory data:", error);
      toast.error("Failed to load inventory data");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredItems = items.filter(
    (item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleExport = async () => {
    try {
      const response = await fetch("/api/general-inventory/export");
      if (!response.ok) throw new Error("Export failed");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `inventory-export-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success("Inventory exported successfully");
    } catch (error) {
      toast.error("Failed to export inventory");
    }
  };

  const handleAdjustStock = (item: any) => {
    setSelectedItem(item);
    setShowAdjustmentDialog(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-50/50 via-white to-pink-50/50">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50/50 via-white to-pink-50/50 relative overflow-hidden">
      {/* Animated background effects - match My Voice Agents */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
        <div
          className="absolute bottom-0 right-0 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "1s" }}
        />
        <div
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-400/5 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "2s" }}
        />
      </div>

      <div className="relative z-10 container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <span className="text-gray-700">Inventory</span>
              <span className="bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 bg-clip-text text-transparent">
                Management
              </span>
            </h1>
            <p className="text-gray-600 mt-1">
              Manage your stock, suppliers, and locations
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              onClick={() => setShowLowStockAlertsDialog(true)}
              className="gap-2 border-purple-200 text-gray-700 hover:bg-purple-50"
            >
              <Bell className="h-4 w-4" />
              Alerts
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowBarcodeSearchDialog(true)}
              className="gap-2 border-purple-200 text-gray-700 hover:bg-purple-50"
            >
              <Barcode className="h-4 w-4" />
              Barcode Search
            </Button>
            {isAdmin && (
              <>
                <Button
                  variant="outline"
                  onClick={() => setShowEcommerceSyncDialog(true)}
                  className="gap-2 border-purple-200 text-gray-700 hover:bg-purple-50"
                >
                  <RefreshCw className="h-4 w-4" />
                  E-commerce Sync
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowReportsDialog(true)}
                  className="gap-2 border-purple-200 text-gray-700 hover:bg-purple-50"
                >
                  <BarChart3 className="h-4 w-4" />
                  Reports
                </Button>
                <Button
                  variant="outline"
                  onClick={handleExport}
                  className="gap-2 border-purple-200 text-gray-700 hover:bg-purple-50"
                >
                  <Download className="h-4 w-4" />
                  Export
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowBulkImportDialog(true)}
                  className="gap-2 border-purple-200 text-gray-700 hover:bg-purple-50"
                >
                  <Upload className="h-4 w-4" />
                  Bulk Import
                </Button>
                <Button
                  onClick={() => setShowAddDialog(true)}
                  className="gap-2 bg-purple-600 hover:bg-purple-700"
                >
                  <Plus className="h-4 w-4" />
                  Add Item
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Statistics Cards */}
        {stats && (
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="border-2 border-purple-200/50 bg-white/80 backdrop-blur-sm shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Total Items
                </CardTitle>
                <Package className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">
                  {stats.totalItems}
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-purple-200/50 bg-white/80 backdrop-blur-sm shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Total Value
                </CardTitle>
                <DollarSign className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">
                  ${stats.totalInventoryValue.toFixed(2)}
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-purple-200/50 bg-white/80 backdrop-blur-sm shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Low Stock
                </CardTitle>
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">
                  {stats.lowStockCount}
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-purple-200/50 bg-white/80 backdrop-blur-sm shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Out of Stock
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">
                  {stats.outOfStockCount}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Content Tabs */}
        <Tabs defaultValue="items" className="space-y-4">
          <TabsList className="bg-white/80 border border-purple-200 backdrop-blur-sm">
            <TabsTrigger
              value="items"
              className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-gray-600"
            >
              <Package className="h-4 w-4 mr-2" />
              Items
            </TabsTrigger>
            <TabsTrigger
              value="categories"
              className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-gray-600"
            >
              <FolderTree className="h-4 w-4 mr-2" />
              Categories
            </TabsTrigger>
            <TabsTrigger
              value="suppliers"
              className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-gray-600"
            >
              <Truck className="h-4 w-4 mr-2" />
              Suppliers
            </TabsTrigger>
            <TabsTrigger
              value="locations"
              className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-gray-600"
            >
              <MapPin className="h-4 w-4 mr-2" />
              Locations
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger
                value="ecommerce"
                className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-gray-600"
              >
                <Package className="h-4 w-4 mr-2" />
                E-Commerce Sync
              </TabsTrigger>
            )}
          </TabsList>

          {/* Items Tab */}
          <TabsContent value="items" className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Search items by name or SKU..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-white/80 border-purple-200 text-gray-900"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredItems.map((item) => (
                <Card
                  key={item.id}
                  className="border-2 border-purple-200/50 bg-white/80 backdrop-blur-sm shadow-sm"
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-gray-900">
                          {item.name}
                        </CardTitle>
                        <CardDescription className="text-gray-600">
                          SKU: {item.sku}
                        </CardDescription>
                      </div>
                      <Badge
                        variant={
                          item.quantity <= item.reorderLevel
                            ? "destructive"
                            : "default"
                        }
                      >
                        {item.quantity} {item.unit || "pcs"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {item.category && (
                      <div className="text-sm text-gray-600">
                        Category: {item.category.name}
                      </div>
                    )}
                    {item.location && (
                      <div className="text-sm text-gray-600">
                        Location: {item.location.name}
                      </div>
                    )}
                    {item.costPrice && (
                      <div className="text-sm text-gray-600">
                        Cost: ${item.costPrice}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredItems.length === 0 && (
              <div className="text-center py-12">
                <Package className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No items found
                </h3>
                <p className="text-gray-600 mb-4">
                  {isAdmin
                    ? "Get started by adding your first inventory item"
                    : "No items match your search"}
                </p>
                {isAdmin && (
                  <Button onClick={() => setShowAddDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item
                  </Button>
                )}
              </div>
            )}
          </TabsContent>

          {/* Categories Tab */}
          <TabsContent value="categories" className="space-y-4">
            <div className="flex justify-end mb-4">
              <Button
                onClick={() => setShowCategoriesDialog(true)}
                className="gap-2"
              >
                <Settings className="h-4 w-4" />
                Manage Categories
              </Button>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {categories.map((category) => (
                <Card
                  key={category.id}
                  className="border-2 border-purple-200/50 bg-white/80 backdrop-blur-sm shadow-sm hover:border-purple-300 transition-colors"
                >
                  <CardHeader>
                    <CardTitle className="text-gray-900">
                      {category.name}
                    </CardTitle>
                    {category.description && (
                      <CardDescription className="text-gray-600">
                        {category.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-gray-600">
                      {category._count.items} items
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Suppliers Tab */}
          <TabsContent value="suppliers" className="space-y-4">
            <div className="flex justify-end mb-4">
              <Button
                onClick={() => setShowSuppliersDialog(true)}
                className="gap-2"
              >
                <Settings className="h-4 w-4" />
                Manage Suppliers
              </Button>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {suppliers.map((supplier) => (
                <Card
                  key={supplier.id}
                  className="border-2 border-purple-200/50 bg-white/80 backdrop-blur-sm shadow-sm"
                >
                  <CardHeader>
                    <CardTitle className="text-gray-900">
                      {supplier.name}
                    </CardTitle>
                    {supplier.contactName && (
                      <CardDescription className="text-gray-600">
                        Contact: {supplier.contactName}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-1">
                    {supplier.email && (
                      <div className="text-sm text-gray-600">
                        {supplier.email}
                      </div>
                    )}
                    {supplier.phone && (
                      <div className="text-sm text-gray-600">
                        {supplier.phone}
                      </div>
                    )}
                    <div className="text-sm text-gray-600 pt-2">
                      {supplier._count.items} items supplied
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Locations Tab */}
          <TabsContent value="locations" className="space-y-4">
            {isAdmin && (
              <div className="flex justify-end mb-4">
                <Button
                  onClick={() => setShowLocationsDialog(true)}
                  className="gap-2"
                >
                  <Settings className="h-4 w-4" />
                  Manage Locations
                </Button>
              </div>
            )}
            <div className="grid gap-4 md:grid-cols-3">
              {locations.map((location) => (
                <Card
                  key={location.id}
                  className="border-2 border-purple-200/50 bg-white/80 backdrop-blur-sm shadow-sm hover:border-purple-300 transition-colors"
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-gray-900">
                          {location.name}
                        </CardTitle>
                        {location.type && (
                          <CardDescription className="text-gray-600">
                            {location.type}
                          </CardDescription>
                        )}
                      </div>
                      {location.isDefault && (
                        <Badge variant="default">Default</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {location.address && (
                      <div className="text-sm text-gray-600 mb-2">
                        {location.address}
                      </div>
                    )}
                    <div className="text-sm text-gray-600">
                      {location._count.items} items stored
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* E-Commerce Sync Tab - admin only */}
          {isAdmin && (
            <TabsContent value="ecommerce" className="space-y-4">
              <EcommerceSyncTab />
            </TabsContent>
          )}
        </Tabs>

        {/* Dialogs */}
        <AddItemDialog
          open={showAddDialog}
          onOpenChange={setShowAddDialog}
          onSuccess={loadData}
          categories={categories}
          suppliers={suppliers}
          locations={locations}
        />

        <StockAdjustmentDialog
          open={showAdjustmentDialog}
          onOpenChange={setShowAdjustmentDialog}
          onSuccess={loadData}
          item={selectedItem}
          locations={locations}
        />

        <ManageCategoriesDialog
          open={showCategoriesDialog}
          onOpenChange={setShowCategoriesDialog}
          categories={categories}
          onSuccess={loadData}
        />

        <ManageSuppliersDialog
          open={showSuppliersDialog}
          onOpenChange={setShowSuppliersDialog}
          suppliers={suppliers}
          onSuccess={loadData}
        />

        <ManageLocationsDialog
          open={showLocationsDialog}
          onOpenChange={setShowLocationsDialog}
          locations={locations}
          onSuccess={loadData}
        />

        <BulkImportDialog
          open={showBulkImportDialog}
          onOpenChange={setShowBulkImportDialog}
          onSuccess={loadData}
        />

        <ReportsDialog
          open={showReportsDialog}
          onOpenChange={setShowReportsDialog}
        />

        <BarcodeSearchDialog
          open={showBarcodeSearchDialog}
          onOpenChange={setShowBarcodeSearchDialog}
          onItemSelect={(item) => {
            setSelectedItem(item);
            setShowAdjustmentDialog(true);
          }}
        />

        <EcommerceSyncConfigDialog
          open={showEcommerceSyncDialog}
          onOpenChange={setShowEcommerceSyncDialog}
          onSuccess={loadData}
        />

        <LowStockAlertsDialog
          open={showLowStockAlertsDialog}
          onOpenChange={setShowLowStockAlertsDialog}
        />
      </div>
    </div>
  );
}
