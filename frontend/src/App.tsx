import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import AppLayout from "./components/AppLayout";
import Overview from "./pages/Overview";
import NewIDS from "./pages/NewIDS";
import Filings from "./pages/Filings";
import FilingDetail from "./pages/FilingDetail";
import { Templates, Patricia, Settings } from "./pages/Stubs";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Overview />} />
            <Route path="/new" element={<NewIDS />} />
            <Route path="/filings" element={<Filings />} />
            <Route path="/filings/:id" element={<FilingDetail />} />
            <Route path="/templates" element={<Templates />} />
            <Route path="/patricia" element={<Patricia />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
