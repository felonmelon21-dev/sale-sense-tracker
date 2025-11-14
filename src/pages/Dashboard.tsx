import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { TrendingDown, Plus, Search, Bell, ExternalLink, TrendingUp, LogOut } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTrackers } from "@/hooks/useTrackers";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const { trackers, isLoading, deleteTracker } = useTrackers();
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const filteredTrackers = trackers.filter((tracker) =>
    tracker.products.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate stats
  const totalSavings = trackers.reduce((sum, tracker) => {
    const potential = (tracker.target_price || 0) - tracker.products.latest_price;
    return sum + (potential > 0 ? potential : 0);
  }, 0);

  const activeAlerts = trackers.filter(
    (t) => t.target_price && t.products.latest_price <= t.target_price
  ).length;

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <TrendingDown className="h-5 w-5 text-primary" />
            </div>
            <span className="text-xl font-semibold text-foreground">Saleor</span>
          </Link>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon">
              <Bell className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleSignOut}>
              <LogOut className="h-5 w-5" />
            </Button>
            <Link to="/add-tracker">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Product
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Your Price Trackers</h1>
          <p className="text-muted-foreground">
            {isLoading ? "Loading..." : `Monitoring ${trackers.length} products`}
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-8 flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search your tracked products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Potential Savings</CardDescription>
              <CardTitle className="text-3xl text-success">
                ₹{Math.round(totalSavings).toLocaleString()}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Active Alerts</CardDescription>
              <CardTitle className="text-3xl text-primary">{activeAlerts}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Tracked Products</CardDescription>
              <CardTitle className="text-3xl">{trackers.length}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Products Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : filteredTrackers.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTrackers.map((tracker) => (
              <Link key={tracker.id} to={`/product/${tracker.products.id}`}>
                <Card className="hover:shadow-lg transition-all border-border overflow-hidden group">
                  <div className="aspect-square overflow-hidden bg-muted">
                    <img
                      src={tracker.products.image_url || "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&h=500&fit=crop"}
                      alt={tracker.products.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <CardHeader className="pb-3">
                    <CardTitle className="line-clamp-2 text-lg">{tracker.products.name}</CardTitle>
                    <CardDescription className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {tracker.products.platform}
                      </Badge>
                      {tracker.products.is_available ? (
                        <Badge variant="default" className="text-xs bg-success">In Stock</Badge>
                      ) : (
                        <Badge variant="destructive" className="text-xs">Out of Stock</Badge>
                      )}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-baseline justify-between">
                        <div>
                          <div className="text-2xl font-bold text-foreground">
                            ₹{tracker.products.latest_price.toLocaleString()}
                          </div>
                        </div>
                      </div>

                      {tracker.target_price && tracker.products.latest_price <= tracker.target_price && (
                        <div className="flex items-center gap-2 p-2 rounded-md bg-success/10 text-success text-sm">
                          <Bell className="h-4 w-4" />
                          Below target price!
                        </div>
                      )}

                      <Button className="w-full" variant="outline" size="sm">
                        View Details
                        <ExternalLink className="ml-2 h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card className="text-center py-16">
            <CardContent>
              <TrendingDown className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">
                {trackers.length === 0 ? "No products tracked yet" : "No products found"}
              </h3>
              <p className="text-muted-foreground mb-6">
                {trackers.length === 0
                  ? "Start tracking products to get price alerts and savings"
                  : "Try adjusting your search query"}
              </p>
              {trackers.length === 0 && (
                <Link to="/add-tracker">
                  <Button className="bg-primary hover:bg-primary/90">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Product
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
