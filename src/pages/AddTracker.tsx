import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TrendingDown, ArrowLeft, Link as LinkIcon, Search } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useTrackers } from "@/hooks/useTrackers";

const AddTracker = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { createTracker, isCreating } = useTrackers();
  const [productUrl, setProductUrl] = useState("");
  const [targetPrice, setTargetPrice] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    createTracker(
      {
        productUrl,
        targetPrice: targetPrice ? parseFloat(targetPrice) : undefined,
      },
      {
        onSuccess: () => {
          toast.success("Tracker added! Fetching product details...", {
            description: "This may take a few seconds. Check the dashboard for updates."
          });
          navigate("/dashboard");
        },
      }
    );
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const supportedPlatforms = [
    { name: "Amazon", domain: "amazon.in" },
    { name: "Flipkart", domain: "flipkart.com" },
    { name: "Myntra", domain: "myntra.com" },
    { name: "Ajio", domain: "ajio.com" },
    { name: "Snapdeal", domain: "snapdeal.com" },
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

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">Add Product Tracker</h1>
            <p className="text-muted-foreground">
              Paste a product URL from any supported platform to start tracking prices
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Product Details</CardTitle>
              <CardDescription>
                Enter the product URL and set your target price for alerts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="productUrl">Product URL</Label>
                  <div className="relative">
                    <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      id="productUrl"
                      type="url"
                      placeholder="https://www.amazon.in/product..."
                      value={productUrl}
                      onChange={(e) => setProductUrl(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Paste the full URL of the product page
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="targetPrice">Target Price (Optional)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                    <Input
                      id="targetPrice"
                      type="number"
                      placeholder="25000"
                      value={targetPrice}
                      onChange={(e) => setTargetPrice(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Get notified when price drops below this amount
                  </p>
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-primary hover:bg-primary/90"
                  disabled={isCreating}
                >
                  {isCreating ? (
                    "Adding Tracker..."
                  ) : (
                    <>
                      <Search className="h-4 w-4 mr-2" />
                      Start Tracking
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Supported Platforms */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg">Supported Platforms</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {supportedPlatforms.map((platform) => (
                  <div
                    key={platform.name}
                    className="flex items-center gap-2 p-3 rounded-lg border border-border bg-muted/30"
                  >
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                      {platform.name[0]}
                    </div>
                    <div>
                      <div className="font-medium text-sm">{platform.name}</div>
                      <div className="text-xs text-muted-foreground">{platform.domain}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Tips Card */}
          <Card className="mt-6 border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-primary" />
                Pro Tips
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex gap-2">
                  <span className="text-primary">•</span>
                  Set a realistic target price based on historical data
                </li>
                <li className="flex gap-2">
                  <span className="text-primary">•</span>
                  Track multiple sellers of the same product for best deals
                </li>
                <li className="flex gap-2">
                  <span className="text-primary">•</span>
                  Check price history to understand typical price ranges
                </li>
                <li className="flex gap-2">
                  <span className="text-primary">•</span>
                  Enable notifications to never miss a price drop
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AddTracker;
