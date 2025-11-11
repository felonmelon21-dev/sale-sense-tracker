import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingDown, ArrowLeft, ExternalLink, Bell, Trash2 } from "lucide-react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useAuth } from "@/hooks/useAuth";
import { useProduct } from "@/hooks/useProduct";
import { useTrackers } from "@/hooks/useTrackers";
import { toast } from "sonner";

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { data: productData, isLoading, error } = useProduct(id);
  const { deleteTracker, isDeleting } = useTrackers();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !productData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground mb-4">Product not found or error loading data</p>
            <Link to="/dashboard">
              <Button>Back to Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { product, priceHistory, tracker, statistics } = productData;

  const chartData = priceHistory.map((snapshot) => ({
    date: new Date(snapshot.snapshot_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
    price: snapshot.price,
  }));

  const handleRemoveTracker = () => {
    if (tracker) {
      deleteTracker(tracker.id, {
        onSuccess: () => {
          toast.success("Tracker removed successfully");
          navigate("/dashboard");
        },
      });
    }
  };

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
                      src={product.image_url || "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&h=600&fit=crop"}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="space-y-4">
                    <div>
                      <h1 className="text-2xl font-bold mb-2">{product.name}</h1>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{product.platform}</Badge>
                        {product.is_available ? (
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
                            ₹{product.latest_price.toLocaleString()}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 pt-2">
                        <div className="p-3 rounded-lg bg-muted">
                          <div className="text-xs text-muted-foreground">Lowest</div>
                          <div className="font-semibold">₹{statistics.lowestPrice.toLocaleString()}</div>
                        </div>
                        <div className="p-3 rounded-lg bg-muted">
                          <div className="text-xs text-muted-foreground">Highest</div>
                          <div className="font-semibold">₹{statistics.highestPrice.toLocaleString()}</div>
                        </div>
                        <div className="p-3 rounded-lg bg-muted">
                          <div className="text-xs text-muted-foreground">Average</div>
                          <div className="font-semibold">₹{statistics.avgPrice.toLocaleString()}</div>
                        </div>
                      </div>
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
                {chartData.length > 0 ? (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
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
                ) : (
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    No price history available yet
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Actions */}
          <div className="space-y-4">
            {tracker?.target_price && (
              <Card className="border-primary/20 bg-primary/5">
                <CardHeader>
                  <CardTitle className="text-lg">Price Alert</CardTitle>
                  <CardDescription>
                    Target price: ₹{tracker.target_price.toLocaleString()}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {product.latest_price <= tracker.target_price ? (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-success/10 text-success">
                      <Bell className="h-5 w-5" />
                      <span className="font-medium">Target price reached!</span>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      ₹{(product.latest_price - tracker.target_price).toLocaleString()} away from target
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button className="w-full bg-primary hover:bg-primary/90" asChild>
                  <a href={product.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Buy on {product.platform}
                  </a>
                </Button>
                <Button 
                  className="w-full" 
                  variant="destructive"
                  onClick={handleRemoveTracker}
                  disabled={isDeleting}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {isDeleting ? "Removing..." : "Remove Tracker"}
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
                  <span className="text-sm font-medium">
                    {new Date(product.created_at).toLocaleDateString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Price checks</span>
                  <span className="text-sm font-medium">{priceHistory.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Price range</span>
                  <span className="text-sm font-medium">
                    ₹{(statistics.highestPrice - statistics.lowestPrice).toLocaleString()}
                  </span>
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
