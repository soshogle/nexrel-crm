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
import { Loader2 } from "lucide-react";
import { isMenuItemVisible } from "@/lib/industry-menu-config";
import type { Industry } from "@/lib/industry-menu-config";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Package,
  AlertTriangle,
  TrendingDown,
  DollarSign,
  Plus,
  Search,
  Truck,
  ChefHat,
} from "lucide-react";
import { toast } from "sonner";

export default function InventoryPage() {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const [resolvedIndustry, setResolvedIndustry] = useState<Industry | null>(
    (session?.user?.industry as Industry) || null,
  );
  const [activeTab, setActiveTab] = useState("items");
  const [stats, setStats] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Check if user's industry has access to inventory (restaurant-specific inventory page)
  const userIndustry =
    resolvedIndustry || (session?.user?.industry as Industry) || null;
  const hasInventoryAccess = isMenuItemVisible("inventory", userIndustry);

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

  useEffect(() => {
    if (!userIndustry) return;
    if (hasInventoryAccess) {
      loadInventoryData();
    }
  }, [hasInventoryAccess, userIndustry]);

  const loadInventoryData = async () => {
    try {
      // Load stats
      const statsRes = await fetch("/api/inventory/stats");
      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data);
      }

      // Load items
      const itemsRes = await fetch("/api/inventory/items");
      if (itemsRes.ok) {
        const data = await itemsRes.json();
        const arr = Array.isArray(data)
          ? data
          : Array.isArray(data?.data)
            ? data.data
            : Array.isArray(data?.items)
              ? data.items
              : [];
        setItems(arr);
      }

      // Load suppliers
      const suppliersRes = await fetch(
        "/api/inventory/suppliers?isActive=true",
      );
      if (suppliersRes.ok) {
        const data = await suppliersRes.json();
        setSuppliers(Array.isArray(data) ? data : []);
      }

      // Load alerts
      const alertsRes = await fetch("/api/inventory/alerts?isResolved=false");
      if (alertsRes.ok) {
        const data = await alertsRes.json();
        setAlerts(Array.isArray(data) ? data : []);
      }

      setLoading(false);
    } catch (error) {
      console.error("Failed to load inventory data:", error);
      toast.error("Failed to load inventory data");
    }
  };

  const handleQuickAddItem = async () => {
    try {
      const name = window.prompt("Item name");
      if (!name) return;
      const sku = window.prompt("SKU (must be unique)");
      if (!sku) return;
      const category = window.prompt(
        "Category (e.g. FOOD, SUPPLIES, BEVERAGES)",
      );
      if (!category) return;
      const unit = window.prompt("Unit (e.g. pcs, kg, L)", "pcs");
      if (!unit) return;

      const currentStockRaw = window.prompt("Current stock", "0");
      const minimumStockRaw = window.prompt("Minimum stock", "0");
      const costPerUnitRaw = window.prompt("Cost per unit", "0");

      const payload = {
        name: name.trim(),
        sku: sku.trim(),
        category: category.trim(),
        unit: unit.trim(),
        currentStock: Number(currentStockRaw || 0),
        minimumStock: Number(minimumStockRaw || 0),
        costPerUnit: Number(costPerUnitRaw || 0),
      };

      const response = await fetch("/api/inventory/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error?.error || "Failed to create item");
      }

      toast.success("Inventory item created");
      await loadInventoryData();
    } catch (error: any) {
      toast.error(error?.message || "Failed to add item");
    }
  };

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

  const getStockStatusColor = (status: string) => {
    switch (status) {
      case "OUT_OF_STOCK":
        return "destructive";
      case "LOW_STOCK":
        return "default";
      case "OK":
        return "secondary";
      case "OVERSTOCKED":
        return "outline";
      default:
        return "secondary";
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "CRITICAL":
        return "destructive";
      case "HIGH":
        return "default";
      case "MEDIUM":
        return "secondary";
      case "LOW":
        return "outline";
      default:
        return "secondary";
    }
  };

  const filteredItems = items.filter(
    (item) =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchTerm.toLowerCase()),
  );

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

      <div className="relative z-10 p-6 space-y-6">
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
              Track stock, manage suppliers, and monitor alerts
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={loadInventoryData}
              className="border-purple-200 text-gray-700 hover:bg-purple-50"
            >
              <Search className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button
              onClick={handleQuickAddItem}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        {stats && (
          <div className="grid gap-4 md:grid-cols-4">
            <div className="p-4 rounded-xl border border-purple-200/50 bg-white/80 backdrop-blur-sm shadow-sm">
              <div className="flex flex-row items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">
                    Total Items
                  </p>
                  <p className="text-2xl font-bold mt-1 text-gray-900">
                    {stats.totalItems}
                  </p>
                  <p className="text-xs text-gray-500">Active inventory</p>
                </div>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-purple-500/20">
                  <Package className="h-5 w-5 text-purple-500" />
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-purple-200/50 bg-white/80 backdrop-blur-sm shadow-sm">
              <div className="flex flex-row items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Low Stock</p>
                  <p className="text-2xl font-bold mt-1 text-gray-900">
                    {stats.lowStockCount}
                  </p>
                  <p className="text-xs text-gray-500">Need attention</p>
                </div>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-amber-500/20">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-purple-200/50 bg-white/80 backdrop-blur-sm shadow-sm">
              <div className="flex flex-row items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">
                    Out of Stock
                  </p>
                  <p className="text-2xl font-bold mt-1 text-gray-900">
                    {stats.outOfStockCount}
                  </p>
                  <p className="text-xs text-gray-500">Critical</p>
                </div>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-red-500/20">
                  <TrendingDown className="h-5 w-5 text-red-500" />
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-purple-200/50 bg-white/80 backdrop-blur-sm shadow-sm">
              <div className="flex flex-row items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">
                    Total Value
                  </p>
                  <p className="text-2xl font-bold mt-1 text-gray-900">
                    ${stats.totalValue}
                  </p>
                  <p className="text-xs text-gray-500">Inventory value</p>
                </div>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-green-500/20">
                  <DollarSign className="h-5 w-5 text-green-500" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-white/80 border border-purple-200 backdrop-blur-sm">
            <TabsTrigger
              value="items"
              className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-gray-600 data-[state=inactive]:hover:text-purple-600"
            >
              <Package className="h-4 w-4 mr-2" />
              Items ({items.length})
            </TabsTrigger>
            <TabsTrigger
              value="suppliers"
              className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-gray-600 data-[state=inactive]:hover:text-purple-600"
            >
              <Truck className="h-4 w-4 mr-2" />
              Suppliers ({suppliers.length})
            </TabsTrigger>
            <TabsTrigger
              value="alerts"
              className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-gray-600 data-[state=inactive]:hover:text-purple-600"
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Alerts ({alerts.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="items" className="space-y-4 mt-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search items by name or SKU..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {loading ? (
              <div className="border-2 border-purple-200/50 bg-white/80 backdrop-blur-sm rounded-lg shadow-sm py-12 text-center text-gray-600">
                Loading items...
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="p-6 border-2 border-dashed border-purple-200 rounded-xl bg-white/50 text-center">
                <Package className="h-12 w-12 text-purple-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">No inventory items yet</p>
                <p className="text-xs text-gray-500 mt-1">
                  Start adding items to track your inventory
                </p>
                <Button
                  onClick={handleQuickAddItem}
                  className="mt-4 bg-purple-600 hover:bg-purple-700"
                >
                  Add First Item
                </Button>
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredItems.map((item) => (
                  <Card
                    key={item.id}
                    className="border-2 border-purple-200/50 bg-white/80 backdrop-blur-sm shadow-sm"
                  >
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{item.name}</CardTitle>
                          <CardDescription>
                            SKU: {item.sku} • {item.category}
                          </CardDescription>
                        </div>
                        <Badge variant={getStockStatusColor(item.stockStatus)}>
                          {item.stockStatus.replace("_", " ")}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Current Stock</p>
                          <p className="font-medium">
                            {Number(item.currentStock).toFixed(2)} {item.unit}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Minimum Stock</p>
                          <p className="font-medium">
                            {Number(item.minimumStock).toFixed(2)} {item.unit}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Cost Per Unit</p>
                          <p className="font-medium">
                            ${Number(item.costPerUnit).toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Supplier</p>
                          <p className="font-medium">
                            {item.supplier?.name || "No supplier"}
                          </p>
                        </div>
                      </div>
                      {item.location && (
                        <div className="mt-3 text-sm text-muted-foreground">
                          Location: {item.location}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="suppliers" className="space-y-4 mt-6">
            {!Array.isArray(suppliers) || suppliers.length === 0 ? (
              <div className="p-6 border-2 border-dashed border-purple-200 rounded-xl bg-white/50 text-center">
                <Truck className="h-12 w-12 text-purple-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">No suppliers yet</p>
                <p className="text-xs text-gray-500 mt-1">
                  Add suppliers to manage your inventory sources
                </p>
                <Button className="mt-4 bg-purple-600 hover:bg-purple-700">
                  Add First Supplier
                </Button>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {suppliers.map((supplier) => (
                  <Card
                    key={supplier.id}
                    className="border-2 border-purple-200/50 bg-white/80 backdrop-blur-sm shadow-sm"
                  >
                    <CardHeader>
                      <CardTitle className="text-lg">{supplier.name}</CardTitle>
                      {supplier.contactPerson && (
                        <CardDescription>
                          Contact: {supplier.contactPerson}
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        {supplier.email && (
                          <div>
                            <span className="text-muted-foreground">
                              Email:
                            </span>{" "}
                            {supplier.email}
                          </div>
                        )}
                        {supplier.phone && (
                          <div>
                            <span className="text-muted-foreground">
                              Phone:
                            </span>{" "}
                            {supplier.phone}
                          </div>
                        )}
                        <div className="flex items-center justify-between pt-2 border-t">
                          <span className="text-muted-foreground">Items:</span>
                          <Badge variant="secondary">
                            {supplier._count.items}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">
                            Purchase Orders:
                          </span>
                          <Badge variant="secondary">
                            {supplier._count.purchaseOrders}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="alerts" className="space-y-4 mt-6">
            {!Array.isArray(alerts) || alerts.length === 0 ? (
              <div className="p-6 border-2 border-dashed border-purple-200 rounded-xl bg-white/50 text-center">
                <AlertTriangle className="h-12 w-12 text-purple-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">No active alerts</p>
                <p className="text-xs text-gray-500 mt-1">
                  All inventory items are at healthy stock levels
                </p>
              </div>
            ) : (
              <div className="grid gap-4">
                {alerts.map((alert) => (
                  <Card
                    key={alert.id}
                    className="border-2 border-purple-200/50 border-l-4 border-l-red-500 bg-white/80 backdrop-blur-sm shadow-sm"
                  >
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5" />
                            {alert.inventoryItem.name}
                          </CardTitle>
                          <CardDescription>{alert.message}</CardDescription>
                        </div>
                        <Badge variant={getSeverityColor(alert.severity)}>
                          {alert.severity}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div className="text-sm">
                          <span className="text-muted-foreground">
                            Alert Type:
                          </span>{" "}
                          {alert.alertType.replace("_", " ")}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(alert.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      {alert.inventoryItem && (
                        <div className="mt-3 p-3 bg-secondary/30 rounded-lg text-sm">
                          <div className="flex items-center justify-between">
                            <span>Current Stock:</span>
                            <span className="font-medium">
                              {Number(alert.inventoryItem.currentStock).toFixed(
                                2,
                              )}{" "}
                              {alert.inventoryItem.unit}
                            </span>
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <span>Minimum Stock:</span>
                            <span className="font-medium">
                              {Number(alert.inventoryItem.minimumStock).toFixed(
                                2,
                              )}{" "}
                              {alert.inventoryItem.unit}
                            </span>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Info Box */}
        <div className="p-4 rounded-xl border border-purple-200 bg-purple-50/50">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
              <Package className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                Inventory Management Active
              </h3>
              <p className="text-sm text-gray-600">
                Track your stock levels, manage suppliers, and receive alerts
                when items run low. Inventory automatically updates when items
                are sold through your POS or used in the kitchen.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
