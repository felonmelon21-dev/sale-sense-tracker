import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, TrendingDown, Bell, LineChart, ShoppingCart, Zap, Shield } from "lucide-react";
import { Link } from "react-router-dom";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <TrendingDown className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-foreground">Saleor</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/auth">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link to="/dashboard">
              <Button className="bg-primary hover:bg-primary/90">
                Get Started <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/50 border border-primary/20 mb-4">
            <Zap className="h-4 w-4 text-accent" />
            <span className="text-sm font-medium text-secondary-foreground">Track prices across 10+ platforms</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-primary via-primary to-accent bg-clip-text text-transparent leading-tight">
            Never Overpay Again
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Track product prices across Amazon, Flipkart, Myntra, and more. Get instant alerts when prices drop below your target.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Link to="/dashboard">
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-lg px-8">
                Start Tracking Free
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="text-lg px-8">
              Watch Demo
            </Button>
          </div>

          <div className="pt-8 text-sm text-muted-foreground">
            Join 50,000+ smart shoppers saving an average of ₹3,500/month
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything You Need to Save</h2>
          <p className="text-muted-foreground text-lg">Powerful features to track, compare, and save on every purchase</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="border-border hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <TrendingDown className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Price Tracking</CardTitle>
              <CardDescription>
                Monitor prices 24/7 across multiple platforms with real-time updates
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-border hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="h-12 w-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                <Bell className="h-6 w-6 text-accent" />
              </div>
              <CardTitle>Smart Alerts</CardTitle>
              <CardDescription>
                Get notified instantly via email, SMS, or push when prices drop
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-border hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="h-12 w-12 rounded-lg bg-success/10 flex items-center justify-center mb-4">
                <LineChart className="h-6 w-6 text-success" />
              </div>
              <CardTitle>Price History</CardTitle>
              <CardDescription>
                View historical price trends and predict the best time to buy
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-border hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <ShoppingCart className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Multi-Platform</CardTitle>
              <CardDescription>
                Compare prices from Amazon, Flipkart, Myntra, Ajio, and more
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-border hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="h-12 w-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                <Zap className="h-6 w-6 text-accent" />
              </div>
              <CardTitle>Instant Comparison</CardTitle>
              <CardDescription>
                See the lowest price at a glance with our smart comparison engine
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-border hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="h-12 w-12 rounded-lg bg-success/10 flex items-center justify-center mb-4">
                <Shield className="h-6 w-6 text-success" />
              </div>
              <CardTitle>Privacy First</CardTitle>
              <CardDescription>
                Your data stays secure. We never share your information
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-card border-y border-border py-16">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-primary mb-2">50K+</div>
              <div className="text-muted-foreground">Active Users</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-accent mb-2">2M+</div>
              <div className="text-muted-foreground">Products Tracked</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-success mb-2">₹45Cr+</div>
              <div className="text-muted-foreground">Total Savings</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary mb-2">10+</div>
              <div className="text-muted-foreground">Platforms</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <Card className="bg-gradient-to-r from-primary to-accent text-white border-0 overflow-hidden relative">
          <div className="absolute inset-0 bg-grid-white/10"></div>
          <CardContent className="relative py-16 px-8 text-center">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Start Saving Today
            </h2>
            <p className="text-xl mb-8 opacity-90">
              Join thousands of smart shoppers. It's free to get started.
            </p>
            <Link to="/dashboard">
              <Button size="lg" variant="secondary" className="text-lg px-8">
                Create Free Account
              </Button>
            </Link>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <TrendingDown className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold">Saleor</span>
            </div>
            <div className="text-sm text-muted-foreground">
              © 2025 Saleor. Track smarter, save more.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
