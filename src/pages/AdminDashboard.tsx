import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingDown, ArrowLeft, RefreshCw, Users, Package, Activity, DollarSign } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AdminStats {
  totalUsers: number;
  totalTrackers: number;
  totalProducts: number;
  failedScrapes: number;
  totalSavings: number;
  recentScrapes: Array<{
    id: string;
    status: string;
    scraped_at: string;
    error_message: string | null;
    products: { name: string; platform: string } | null;
  }>;
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      loadAdminStats();
    }
  }, [user]);

  const loadAdminStats = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('admin');
      
      if (error) {
        if (error.message?.includes('Forbidden')) {
          toast.error('Admin access required');
          navigate('/dashboard');
          return;
        }
        throw error;
      }

      setStats(data);
    } catch (error: any) {
      console.error('Error loading admin stats:', error);
      toast.error('Failed to load admin dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleForceUpdate = async () => {
    try {
      setUpdating(true);
      toast.info('Starting price updates for all products...');
      
      const { data, error } = await supabase.functions.invoke('update-all-prices');
      
      if (error) throw error;

      toast.success(`Updated ${data.updated} products successfully`);
      loadAdminStats();
    } catch (error: any) {
      console.error('Error forcing update:', error);
      toast.error('Failed to update prices');
    } finally {
      setUpdating(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <TrendingDown className="h-5 w-5 text-primary" />
            </div>
            <span className="text-xl font-semibold">Saleor Admin</span>
          </Link>
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={loadAdminStats} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="outline" onClick={handleForceUpdate} disabled={updating}>
              <Activity className={`h-4 w-4 mr-2 ${updating ? 'animate-spin' : ''}`} />
              Update All Prices
            </Button>
            <Link to="/dashboard">
              <Button variant="ghost">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold mb-2">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            System overview and management
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <CardDescription>Total Users</CardDescription>
              </div>
              <CardTitle className="text-2xl">{stats?.totalUsers || 0}</CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <CardDescription>Active Trackers</CardDescription>
              </div>
              <CardTitle className="text-2xl">{stats?.totalTrackers || 0}</CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                <CardDescription>Total Products</CardDescription>
              </div>
              <CardTitle className="text-2xl">{stats?.totalProducts || 0}</CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <CardDescription>Total Savings</CardDescription>
              </div>
              <CardTitle className="text-2xl">₹{stats?.totalSavings?.toFixed(2) || '0.00'}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Scrape Stats */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Scraper Status</CardTitle>
            <CardDescription>Recent scraping activity and failures</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Failed (24h)</p>
                <p className="text-2xl font-semibold text-destructive">{stats?.failedScrapes || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Scrapes */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Scrapes</CardTitle>
            <CardDescription>Last 10 scraping operations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats?.recentScrapes?.map((scrape) => (
                <div
                  key={scrape.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex-1">
                    <p className="font-medium text-sm">
                      {scrape.products?.name || 'Unknown Product'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {scrape.products?.platform} • {new Date(scrape.scraped_at).toLocaleString()}
                    </p>
                    {scrape.error_message && (
                      <p className="text-xs text-destructive mt-1">{scrape.error_message}</p>
                    )}
                  </div>
                  <Badge variant={scrape.status === 'SUCCESS' ? 'default' : 'destructive'}>
                    {scrape.status}
                  </Badge>
                </div>
              ))}
              {(!stats?.recentScrapes || stats.recentScrapes.length === 0) && (
                <p className="text-center text-muted-foreground py-8">No scrapes yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
