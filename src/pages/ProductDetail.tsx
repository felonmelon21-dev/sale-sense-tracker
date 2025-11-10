import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingDown, ArrowLeft, ExternalLink, Bell, Trash2, TrendingUp } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const ProductDetail = () => {
  const { id } = useParams();

  // Mock data
  const product = {
    id,
    name: "Sony WH-1000XM5 Wireless Noise Cancelling Headphones",
    image: "https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=600&h=600&fit=crop",
    currentPrice: 24990,
    lowestPrice: 22990,
    highestPrice: 29990,
    averagePrice: 26450,
    platform: "Amazon",
    targetPrice: 22000,
    priceChange: -8.0,
    inStock: true,
    lastChecked: "2 hours ago",
  };

  const priceHistory = [
    { date: "Jan 1", price: 29990 },
    { date: "Jan 8", price: 28500 },
    { date: "Jan 15", price: 27990 },
    { date: "Jan 22", price: 26500 },
    { date: "Jan 29", price: 25990 },
    { date: "Feb 5", price: 24990 },
  ];

  const platforms = [
    { name: "Amazon", price: 24990, link: "#", inStock: true },
    { name: "Flipkart", price: 26490, link: "#", inStock: true },
    { name: "Croma", price: 27990, link: "#", inStock: false },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <TrendingDown className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-foreground">Saleor</span>
          </Link>
          <Link to="/dashboard">
            <Button variant="ghost">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Product Info */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardContent className="p-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="aspect-square rounded-lg overflow-hidden bg-muted">
                    <img 
                      src={product.image} 
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="space-y-4">
                    <div>
                      <h1 className="text-2xl font-bold mb-2">{product.name}</h1>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{product.platform}</Badge>
                        {product.inStock ? (
                          <Badge variant="default" className="bg-success">In Stock</Badge>
                        ) : (
                          <Badge variant="destructive">Out of Stock</Badge>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-baseline justify-between">
                        <div>
                          <div className="text-sm text-muted-foreground">Current Price</div>
                          <div className="text-4xl font-bold text-foreground">
                            ₹{product.currentPrice.toLocaleString()}
                          </div>
                        </div>
                        <Badge 
                          variant={product.priceChange < 0 ? "default" : "destructive"}
                          className="gap-1 text-base px-3 py-1"
                        >
                          {product.priceChange < 0 ? (
                            <TrendingDown className="h-4 w-4" />
                          ) : (
                            <TrendingUp className="h-4 w-4" />
                          )}
                          {Math.abs(product.priceChange)}%
                        </Badge>
                      </div>

                      <div className="grid grid-cols-3 gap-2 pt-2">
                        <div className="p-3 rounded-lg bg-muted">
                          <div className="text-xs text-muted-foreground">Lowest</div>
                          <div className="font-semibold">₹{product.lowestPrice.toLocaleString()}</div>
                        </div>
                        <div className="p-3 rounded-lg bg-muted">
                          <div className="text-xs text-muted-foreground">Highest</div>
                          <div className="font-semibold">₹{product.highestPrice.toLocaleString()}</div>
                        </div>
                        <div className="p-3 rounded-lg bg-muted">
                          <div className="text-xs text-muted-foreground">Average</div>
                          <div className="font-semibold">₹{product.averagePrice.toLocaleString()}</div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 text-sm text-muted-foreground">
                      Last checked: {product.lastChecked}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Price History Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Price History</CardTitle>
                <CardDescription>Price trend over the last 30 days</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={priceHistory}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis 
                        dataKey="date" 
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                      />
                      <YAxis 
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                        tickFormatter={(value) => `₹${(value/1000).toFixed(0)}k`}
                      />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                        formatter={(value: number) => [`₹${value.toLocaleString()}`, "Price"]}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="price" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={2}
                        dot={{ fill: "hsl(var(--primary))", r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Platform Comparison */}
            <Card>
              <CardHeader>
                <CardTitle>Platform Comparison</CardTitle>
                <CardDescription>Current prices across different platforms</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {platforms.map((platform) => (
                    <div 
                      key={platform.name}
                      className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center font-semibold text-primary">
                          {platform.name[0]}
                        </div>
                        <div>
                          <div className="font-semibold">{platform.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {platform.inStock ? "In Stock" : "Out of Stock"}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-xl font-bold">
                          ₹{platform.price.toLocaleString()}
                        </div>
                        <Button size="sm" variant="outline" asChild>
                          <a href={platform.link} target="_blank" rel="noopener noreferrer">
                            Visit <ExternalLink className="ml-2 h-3 w-3" />
                          </a>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Actions */}
          <div className="space-y-4">
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="text-lg">Price Alert</CardTitle>
                <CardDescription>
                  Target price: ₹{product.targetPrice.toLocaleString()}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {product.currentPrice <= product.targetPrice ? (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-success/10 text-success">
                    <Bell className="h-5 w-5" />
                    <span className="font-medium">Target price reached!</span>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    ₹{(product.currentPrice - product.targetPrice).toLocaleString()} away from target
                  </div>
                )}
                <Button className="w-full" variant="outline">
                  <Bell className="h-4 w-4 mr-2" />
                  Edit Alert Settings
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button className="w-full bg-primary hover:bg-primary/90">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Buy on {product.platform}
                </Button>
                <Button className="w-full" variant="outline">
                  Share Product
                </Button>
                <Button className="w-full" variant="destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remove Tracker
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Tracking since</span>
                  <span className="text-sm font-medium">Jan 1, 2025</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Price checks</span>
                  <span className="text-sm font-medium">124</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Total savings</span>
                  <span className="text-sm font-medium text-success">₹5,000</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
