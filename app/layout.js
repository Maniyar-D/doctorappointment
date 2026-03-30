import { Inter } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "sonner";
import Header from "@/components/header";
import { dark } from "@clerk/themes";
import { ThemeProvider } from "@/components/theme-provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Doctors Appointment App",
  description: "Connect with doctors anytime, anywhere",
};

export default function RootLayout({ children }) {
  return (
    <ClerkProvider
      appearance={{
        baseTheme: dark,
      }}
    >
      <html lang="en" suppressHydrationWarning>
        <head>
          <link rel="icon" href="/logo.png" sizes="any" />
        </head>
        <body className={`${inter.className}`}>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
          >
            <Header />
            <main className="min-h-screen">{children}</main>
            <Toaster richColors />

            <footer className="bg-muted/50 py-12">
              <div className="container mx-auto px-4">

    {/* Top Section */}
    <div className="flex flex-col md:flex-row justify-between items-center gap-6">

      {/* Branding */}
      <div className="text-center md:text-left">
        <h2 className="text-xl font-semibold text-primary">
          ClinicConnect
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Healthcare made simple, anytime, anywhere.
        </p>
      </div>

      {/* Links */}
      <div className="flex gap-6 text-sm text-muted-foreground">
        <a href="#" className="hover:text-primary transition">Privacy</a>
        <a href="#" className="hover:text-primary transition">Terms</a>
        <a href="#" className="hover:text-primary transition">Support</a>
      </div>

    </div>

    {/* Divider */}
    <div className="border-t border-border my-6"></div>

    {/* Bottom */}
    <div className="text-center text-sm text-muted-foreground">
      <p>
        © {new Date().getFullYear()} ClinicConnect • Built by Danish & Team
      </p>
    </div>

  </div>
            </footer>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
