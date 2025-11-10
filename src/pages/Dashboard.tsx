import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { TrendingDown, Plus, Search, Bell, ExternalLink, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";

// Mock data for demonstration
const mockTrackedProducts = [
  {
    id: 1,
    name: "Sony WH-1000XM5 Wireless Headphones",
    image: "https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=300&h=300&fit=crop",
    currentPrice: 24990,
    lowestPrice: 22990,
    platform: "Amazon",
    priceChange: -8.0,
    lastUpdated: "2 hours ago",
    targetPrice: 22000,
  },
  {
    id: 2,
    name: "Apple iPhone 15 Pro (256GB)",
    image: "https://images.unsplash.com/photo-1592286927505-2ff516c9373c?w=300&h=300&fit=crop",
    currentPrice: 129900,
    lowestPrice: 129900,
    platform: "Flipkart",
    priceChange: 0,
    lastUpdated: "1 hour ago",
    targetPrice: 125000,
  },
  {
    id: 3,
    name: "Nike Air Zoom Pegasus 40",
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300&h=300&fit=crop",
    currentPrice: 8995,
    lowestPrice: 7495,
    platform: "Myntra",
    priceChange: -16.7,
    lastUpdated: "30 mins ago",
    targetPrice: 7000,
  },
];

const Dashboard = () => {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <TrendingDown className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-foreground">Saleor</span>
          </Link>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon">
              <Bell className="h-5 w-5" />
            </Button>
            <Link to="/add-tracker">
              <Button className="bg-primary hover:bg-primary/90">
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
          <h1 className="text-4xl font-bold mb-2">Your Price Trackers</h1>
          <p className="text-muted-foreground">Monitoring {mockTrackedProducts.length} products across multiple platforms</p>
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
          <Card className="border-primary/20">
            <CardHeader className="pb-3">
              <CardDescription>Total Savings</CardDescription>
              <CardTitle className="text-3xl text-success">₹12,450</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-primary/20">
            <CardHeader className="pb-3">
              <CardDescription>Active Alerts</CardDescription>
              <CardTitle className="text-3xl text-accent">3</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-primary/20">
            <CardHeader className="pb-3">
              <CardDescription>Avg. Price Drop</CardDescription>
              <CardTitle className="text-3xl text-primary">8.2%</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Products Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mockTrackedProducts.map((product) => (
            <Link key={product.id} to={`/product/${product.id}`}>
              <Card className="hover:shadow-lg transition-all border-border overflow-hidden group">
                <div className="aspect-square overflow-hidden bg-muted">
                  <img 
                    src={product.image} 
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <CardHeader className="pb-3">
                  <CardTitle className="line-clamp-2 text-lg">{product.name}</CardTitle>
                  <CardDescription className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {product.platform}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{product.lastUpdated}</span>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-baseline justify-between">
                      <div>
                        <div className="text-2xl font-bold text-foreground">
                          ₹{product.currentPrice.toLocaleString()}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Lowest: ₹{product.lowestPrice.toLocaleString()}
                        </div>
                      </div>
                      {product.priceChange !== 0 && (
                        <Badge 
                          variant={product.priceChange < 0 ? "default" : "destructive"}
                          className="gap-1"
                        >
                          {product.priceChange < 0 ? (
                            <TrendingDown className="h-3 w-3" />
                          ) : (
                            <TrendingUp className="h-3 w-3" />
                          )}
                          {Math.abs(product.priceChange)}%
                        </Badge>
                      )}
                    </div>

                    {product.currentPrice <= product.targetPrice && (
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

        {/* Empty State Call-to-Action */}
        {mockTrackedProducts.length === 0 && (
          <Card className="text-center py-16">
            <CardContent>
              <TrendingDown className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">No products tracked yet</h3>
              <p className="text-muted-foreground mb-6">
                Start tracking products to get price alerts and savings
              </p>
              <Link to="/add-tracker">
                <Button className="bg-primary hover:bg-primary/90">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Product
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
