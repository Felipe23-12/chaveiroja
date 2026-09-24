import React, { lazy, Suspense } from 'react';
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

// Páginas carregadas sob demanda — reduz o tempo de inicialização em
// conexões móveis lentas (WebView), pois só o código da rota atual é baixado.
const Home = lazy(() => import('@/pages/Home'));
const History = lazy(() => import('@/pages/History'));
const LocksmithProfile = lazy(() => import('@/pages/LocksmithProfile'));
const Mapa = lazy(() => import('@/pages/Mapa'));
const Chat = lazy(() => import('@/pages/Chat'));
const PainelChaveiro = lazy(() => import('@/pages/PainelChaveiro'));
const PainelFinanceiro = lazy(() => import('@/pages/PainelFinanceiro'));
const LocksmithPublicProfile = lazy(() => import('@/pages/LocksmithPublicProfile'));
const Login = lazy(() => import('@/pages/Login'));
const Register = lazy(() => import('@/pages/Register'));
const ForgotPassword = lazy(() => import('@/pages/ForgotPassword'));
const ResetPassword = lazy(() => import('@/pages/ResetPassword'));
const RegisterCliente = lazy(() => import('@/pages/RegisterCliente'));
const RegisterChaveiro = lazy(() => import('@/pages/RegisterChaveiro'));
const PainelAdmin = lazy(() => import('@/pages/PainelAdmin'));
const PainelFinanceiroAdmin = lazy(() => import('@/pages/PainelFinanceiroAdmin'));
const GoogleComplete = lazy(() => import('@/pages/GoogleComplete'));
const GoogleSignInReturn = lazy(() => import('@/pages/GoogleSignInReturn'));
const PoliticaReembolso = lazy(() => import('@/pages/PoliticaReembolso'));
const TermosPrivacidade = lazy(() => import('@/pages/TermosPrivacidade'));
const Acompanhamento = lazy(() => import('@/pages/Acompanhamento'));
const Pagamentos = lazy(() => import('@/pages/Pagamentos'));
const AceiteTermos = lazy(() => import('@/pages/AceiteTermos'));
const CadastroRecebimentos = lazy(() => import('@/pages/CadastroRecebimentos'));
const CreatePassword = lazy(() => import('@/pages/CreatePassword'));
const ExclusaoConta = lazy(() => import('@/pages/ExclusaoConta'));
const Sobre = lazy(() => import('@/pages/Sobre'));
const Contato = lazy(() => import('@/pages/Contato'));
const About = lazy(() => import('@/pages/About'));
const Contact = lazy(() => import('@/pages/Contact'));
const CalculosChamados = lazy(() => import('@/pages/CalculosChamados'));
const QuoteMode = lazy(() => import('@/pages/QuoteMode'));
const Sugestoes = lazy(() => import('@/pages/Sugestoes'));
const MeusDados = lazy(() => import('@/pages/MeusDados'));
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
              <Route path="/chat/:locksmithId" element={<Chat />} />
              <Route path="/chaveiro/:id" element={<LocksmithPublicProfile />} />
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