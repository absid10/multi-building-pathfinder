import { useState } from "react";
import { Building2, FileImage, LayoutDashboard, LogIn, LogOut, UploadCloud } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface UploadedLayout {
  id: string;
  name: string;
  uploadedAt: string;
  previewUrl: string;
  status: "processing" | "mapped";
}

interface StartupSidebarProps {
  isLoggedIn: boolean;
  onLogin: () => void;
  onLogout: () => void;
  layouts: UploadedLayout[];
  onUploadLayout: (file: File) => void;
}

export const StartupSidebar = ({
  isLoggedIn,
  onLogin,
  onLogout,
  layouts,
  onUploadLayout,
}: StartupSidebarProps) => {
  const [email, setEmail] = useState("admin@indoor-mapx.com");
  const [password, setPassword] = useState("password");

  return (
    <aside className="space-y-4">
      {!isLoggedIn ? (
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <LogIn className="w-4 h-4 text-primary" />
              Startup Admin Login
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={email} onChange={(event) => setEmail(event.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
            <Button
              className="w-full"
              onClick={() => {
                if (email.trim() && password.trim()) {
                  onLogin();
                }
              }}
            >
              Login to Dashboard
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                <span className="flex items-center gap-2">
                  <LayoutDashboard className="w-4 h-4 text-primary" />
                  Product Dashboard
                </span>
                <Button variant="outline" size="sm" onClick={onLogout}>
                  <LogOut className="w-3.5 h-3.5 mr-1" />
                  Logout
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-md border border-border p-2">
                <p className="text-muted-foreground text-xs">Buildings</p>
                <p className="font-semibold">2 active</p>
              </div>
              <div className="rounded-md border border-border p-2">
                <p className="text-muted-foreground text-xs">Layouts</p>
                <p className="font-semibold">{layouts.length}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <UploadCloud className="w-4 h-4 text-primary" />
                Upload Architectural Map
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <label className="block border border-dashed border-border rounded-lg p-3 cursor-pointer hover:bg-muted/40 transition-colors">
                <input
                  type="file"
                  className="hidden"
                  accept="image/*,.pdf"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    onUploadLayout(file);
                    event.currentTarget.value = "";
                  }}
                />
                <p className="text-sm font-medium">Drop file or click to upload</p>
                <p className="text-xs text-muted-foreground">PNG, JPG, PDF floor plans supported</p>
              </label>

              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {layouts.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No layout uploaded yet.</p>
                ) : (
                  layouts.map((layout) => (
                    <div key={layout.id} className="rounded-md border border-border p-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium flex items-center gap-1.5">
                            <FileImage className="w-3.5 h-3.5" />
                            {layout.name}
                          </p>
                          <p className="text-xs text-muted-foreground">{layout.uploadedAt}</p>
                        </div>
                        <span className="text-[10px] uppercase tracking-wide rounded-full bg-primary/10 text-primary px-2 py-0.5">
                          {layout.status}
                        </span>
                      </div>
                      <img src={layout.previewUrl} alt={layout.name} className="mt-2 rounded-md border border-border max-h-24 w-full object-cover" />
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="w-4 h-4 text-primary" />
            Startup Pitch Mode
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            Multi-building indoor navigation platform for hospitals, airports, malls, and campuses with AI map parsing
            and live turn-by-turn guidance.
          </p>
        </CardContent>
      </Card>
    </aside>
  );
};
