import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Importacoes from "./pages/Importacoes";
import Produtos from "./pages/Produtos";
import Fornecedores from "./pages/Fornecedores";
import Configuracoes from "./pages/Configuracoes";
import NovaImportacao from "./pages/NovaImportacao";
import NovoProduto from "./pages/NovoProduto";
import NovoFornecedor from "./pages/NovoFornecedor";
import DetalhesImportacao from "./pages/DetalhesImportacao";
import Estoque from "./pages/Estoque";
import Relatorios from "./pages/Relatorios";
import DetalhesProduto from "./pages/DetalhesProduto";
import DetalhesFornecedor from "./pages/DetalhesFornecedor";
import ImportarExcel from "./pages/ImportarExcel";
import EditarImportacao from "./pages/EditarImportacao";
import EditarImportacaoCompleta from "./pages/EditarImportacaoCompleta";
import EditarProduto from "./pages/EditarProduto";
import EditarFornecedor from "./pages/EditarFornecedor";
import Galeria from "./pages/Galeria";
import Pedidos from "./pages/Pedidos";
import Login from "./pages/Login";
import Usuarios from "./pages/Usuarios";
import ConfiguracoesUsuarios from "./pages/ConfiguracoesUsuarios";
import VendasExternas from "./pages/VendasExternas";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/login"} component={Login} />
      <Route path={"/"} component={Home} />
      <Route path={"/usuarios"} component={Usuarios} />
      <Route path={"/importacoes"} component={Importacoes} />
      <Route path="/importacoes/nova" component={NovaImportacao} />
      <Route path="/importacoes/importar-excel" component={ImportarExcel} />
      <Route path="/importacoes/:id" component={DetalhesImportacao} />
      <Route path="/importacoes/:id/editar" component={EditarImportacao} />
      <Route path="/importacoes/:id/editar-completa" component={EditarImportacaoCompleta} />
      <Route path="/produtos" component={Produtos} />
      <Route path="/produtos/novo" component={NovoProduto} />
      <Route path="/produtos/:id" component={DetalhesProduto} />
      <Route path="/produtos/:id/editar" component={EditarProduto} />
      <Route path="/fornecedores" component={Fornecedores} />
      <Route path="/fornecedores/novo" component={NovoFornecedor} />
      <Route path="/fornecedores/:id" component={DetalhesFornecedor} />
      <Route path="/fornecedores/:id/editar" component={EditarFornecedor} />
      <Route path="/galeria" component={Galeria} />
      <Route path="/pedidos" component={Pedidos} />
      <Route path="/vendas-externas" component={VendasExternas} />
      <Route path="/estoque" component={Estoque} />
      <Route path="/relatorios" component={Relatorios} />
      <Route path="/configuracoes" component={Configuracoes} />
      <Route path="/configuracoes/usuarios" component={ConfiguracoesUsuarios} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
