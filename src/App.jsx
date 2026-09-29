import React, { lazy, Suspense } from 'react';
import { importWithRetry } from '@/lib/moduleRecovery';
const lazyPage = loader => lazy(() => importWithRetry(loader));
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from '@/components/ProtectedRoute';
import ProfileCompletionGuard from '@/components/ProfileCompletionGuard';
import PasswordCreationGuard from '@/components/PasswordCreationGuard';
import RoleGuard from '@/components/RoleGuard';
import TermsGate from '@/components/TermsGate';
import LoadingCard from '@/components/ui/LoadingCard';
import Layout from '@/components/Layout';
import MercadoPagoOnboardingGuard from '@/components/MercadoPagoOnboardingGuard';
import ModerationBlockGate from '@/components/ModerationBlockGate';
import CustomerCoverageGate from '@/components/location/CustomerCoverageGate';

// Páginas carregadas sob demanda — reduz o tempo de inicialização em
// conexões móveis lentas (WebView), pois só o código da rota atual é baixado.
const Home = lazyPage(() => import('@/pages/Home'));
const History = lazyPage(() => import('@/pages/History'));
const LocksmithProfile = lazyPage(() => import('@/pages/LocksmithProfile'));
const Mapa = lazyPage(() => import('@/pages/Mapa'));
const Chat = lazyPage(() => import('@/pages/Chat'));
const PainelChaveiro = lazyPage(() => import('@/pages/PainelChaveiro'));
const PainelFinanceiro = lazyPage(() => import('@/pages/PainelFinanceiro'));
const LocksmithPublicProfile = lazyPage(() => import('@/pages/LocksmithPublicProfile'));
const Login = lazyPage(() => import('@/pages/Login'));
const Register = lazyPage(() => import('@/pages/Register'));
const ForgotPassword = lazyPage(() => import('@/pages/ForgotPassword'));
const ResetPassword = lazyPage(() => import('@/pages/ResetPassword'));
const RegisterCliente = lazyPage(() => import('@/pages/RegisterCliente'));
const RegisterChaveiro = lazyPage(() => import('@/pages/RegisterChaveiro'));
const PainelAdmin = lazyPage(() => import('@/pages/PainelAdmin'));
const PainelFinanceiroAdmin = lazyPage(() => import('@/pages/PainelFinanceiroAdmin'));
const GoogleComplete = lazyPage(() => import('@/pages/GoogleComplete'));
const GoogleSignInReturn = lazyPage(() => import('@/pages/GoogleSignInReturn'));
const PoliticaReembolso = lazyPage(() => import('@/pages/PoliticaReembolso'));
const TermosPrivacidade = lazyPage(() => import('@/pages/TermosPrivacidade'));
const Acompanhamento = lazyPage(() => import('@/pages/Acompanhamento'));
const Pagamentos = lazyPage(() => import('@/pages/Pagamentos'));
const AceiteTermos = lazyPage(() => import('@/pages/AceiteTermos'));
const CadastroRecebimentos = lazyPage(() => import('@/pages/CadastroRecebimentos'));
const CreatePassword = lazyPage(() => import('@/pages/CreatePassword'));
const ExclusaoConta = lazyPage(() => import('@/pages/ExclusaoConta'));
const Sobre = lazyPage(() => import('@/pages/Sobre'));
const Contato = lazyPage(() => import('@/pages/Contato'));
const About = lazyPage(() => import('@/pages/About'));
const Contact = lazyPage(() => import('@/pages/Contact'));
const CalculosChamados = lazyPage(() => import('@/pages/CalculosChamados'));
const QuoteMode = lazyPage(() => import('@/pages/QuoteMode'));
const Sugestoes = lazyPage(() => import('@/pages/Sugestoes'));
const MeusDados = lazyPage(() => import('@/pages/MeusDados'));
// Add page imports here

const PageFallback = () => (
  <div className="max-w-2xl mx-auto px-4 py-8">
    <LoadingCard label="Carregando..." />
  </div>
);

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // As telas públicas de entrada e o retorno OAuth precisam ficar acessíveis
  // mesmo quando uma sessão antiga falha na checagem inicial.
  const authPaths = ['/login', '/login/cliente', '/login/chaveiro', '/register', '/forgot-password', '/reset-password', '/cadastro/cliente', '/cadastro/chaveiro', '/auth/google-return'];
  if (authError && !authPaths.includes(window.location.pathname)) {
    if (authError.type === 'user_not_registered') return <UserNotRegisteredError />;
    if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/login/cliente" element={<Login />} />
        <Route path="/login/chaveiro" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/cadastro/cliente" element={<RegisterCliente />} />
        <Route path="/cadastro/chaveiro" element={<RegisterChaveiro />} />
        <Route path="/google-complete" element={<GoogleComplete />} />
        <Route path="/auth/google-return" element={<GoogleSignInReturn />} />
        <Route path="/politica-reembolso" element={<PoliticaReembolso />} />
        <Route path="/termos-privacidade" element={<TermosPrivacidade />} />
        <Route path="/exclusao-de-conta" element={<ExclusaoConta />} />
        <Route path="/sobre" element={<Sobre />} />
        <Route path="/about" element={<About />} />
        <Route path="/contato" element={<Contato />} />
        <Route path="/contact" element={<Contact />} />
        <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
          <Route element={<ModerationBlockGate />}>
          <Route path="/criar-senha" element={<CreatePassword />} />
          <Route element={<PasswordCreationGuard />}>
          <Route path="/meus-dados" element={<MeusDados />} />
          <Route element={<ProfileCompletionGuard />}>
          <Route path="/aceite-termos" element={<AceiteTermos />} />
          <Route element={<TermsGate />}>
          <Route element={<MercadoPagoOnboardingGuard />}>
          <Route element={<Layout />}>
            <Route path="/calculos-chamados" element={<CalculosChamados />} />
            <Route path="/sugestoes" element={<Sugestoes />} />
            <Route element={<RoleGuard allow={["cliente", "chaveiro"]} />}>
              <Route path="/orcamentos" element={<QuoteMode />} />
            </Route>
            <Route element={<RoleGuard allow={["cliente"]} />}>
              <Route path="/" element={<Home />} />
              <Route path="/mapa" element={<Mapa />} />
              <Route path="/historico" element={<History />} />
              <Route path="/pagamentos" element={<Pagamentos />} />
              <Route element={<CustomerCoverageGate />}>
                <Route path="/chat/:locksmithId" element={<Chat />} />
                <Route path="/chaveiro/:id" element={<LocksmithPublicProfile />} />
              </Route>
              <Route path="/acompanhamento/:requestId" element={<Acompanhamento />} />
            </Route>
            <Route element={<RoleGuard allow={["chaveiro"]} />}>
              <Route path="/cadastro/recebimentos" element={<CadastroRecebimentos />} />
              <Route path="/painel-chaveiro" element={<PainelChaveiro />} />
              <Route path="/painel-financeiro" element={<PainelFinanceiro />} />
              <Route path="/modo-trabalho" element={<LocksmithProfile />} />
            </Route>
            <Route element={<RoleGuard allow={["admin"]} />}>
              <Route path="/painel-admin" element={<PainelAdmin />} />
              <Route path="/painel-financeiro-admin" element={<PainelFinanceiroAdmin />} />
            </Route>
          </Route>
          </Route>
          </Route>
          </Route>
          </Route>
          </Route>
        </Route>
        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </Suspense>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App