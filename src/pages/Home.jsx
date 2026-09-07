import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ArrowRight, ArrowLeft, Bell, Loader2, Navigation, CheckCircle2, AlertTriangle, MessageCircle, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SERVICE_CATALOG, calculateCancellationFee, CANCELLATION_THRESHOLD_MINUTES, calculateLongDistanceFee, isOpeningService } from "@/lib/pricing";
import { calculateDynamicPrice } from "@/lib/dynamicPricing";
import { getCancellationWindow } from "@/lib/cancellationWindow";
import { searchFipeAndKeyValue } from "@/lib/carKey";
import { detectCarKeyProgramming } from "@/lib/carKeyProgramming";
import { getKeyCancelBlock } from "@/lib/keyCancelBlock";
import KeyBlockBanner from "@/components/locksmith/KeyBlockBanner";
import { getMotoKeyRange, getMotoModel, MOTO_BRANDS } from "@/lib/motoKey";
import MotoKeyConfig from "@/components/locksmith/MotoKeyConfig";
import ServiceCard from "@/components/locksmith/ServiceCard";
import ServiceConfig from "@/components/locksmith/ServiceConfig";
import CarKeyConfig from "@/components/locksmith/CarKeyConfig";
import RequestTracking from "@/components/locksmith/RequestTracking";
import LiveLocksmithsMap from "@/components/locksmith/LiveLocksmithsMap";
import ModuleSelector from "@/components/locksmith/ModuleSelector";
import LightMap from "@/components/map/LightMap";
import UpgradeToUrgentButton from "@/components/locksmith/UpgradeToUrgentButton";
import UrgencySelector from "@/components/client/UrgencySelector";
import UrgentArrivalCountdown from "@/components/locksmith/UrgentArrivalCountdown";
import { DEFAULT_CENTER, getCustomerLocation, haversineKm, calculateInitialServiceDistance, fetchDrivingRoute, etaMinutes } from "@/lib/geo";
import { getClientLoyalty, applyLoyaltyDiscount } from "@/lib/loyalty";
import { buildEligibleQueue } from "@/lib/ringRotation";
import { loadScoreMap, withScores, selectScoreBroadcast } from "@/lib/locksmithScore";
import { safeUnsubscribe } from "@/lib/safeUnsubscribe";

import { createLock, locksSummary } from "@/lib/locks";
import { DEFAULT_RADIUS_KM, expandUntilFound } from "@/lib/searchRadius";
import { useRadiusExpansion } from "@/hooks/useRadiusExpansion";
import useWeatherSurge from "@/hooks/useWeatherSurge";
import SearchRadiusSelector from "@/components/locksmith/SearchRadiusSelector";
import PointsProgressCard from "@/components/locksmith/PointsProgressCard";
import PaymentStep from "@/components/payment/PaymentStep";
import ReceiptButton from "@/components/payment/ReceiptButton";
import { createPaymentRecord, confirmPaymentPaid } from "@/lib/payments";
import { ensureNotificationPermission, notifyClient } from "@/lib/clientNotifications";
import { sendServiceStatusMessage } from "@/lib/serviceStatusMessages";
import { Image } from "@/components/ui/image";
import StepTransition from "@/components/ui/StepTransition";
import StepProgress from "@/components/ui/StepProgress";
import ErrorBanner from "@/components/ui/ErrorBanner";
import LoadingCard from "@/components/ui/LoadingCard";
import { useToast } from "@/components/ui/use-toast";
import CancelFeeConfirmDialog from "@/components/client/CancelFeeConfirmDialog";
import RingingStep from "@/components/client/RingingStep";
import DebtBlockNotice from "@/components/client/DebtBlockNotice";
import CancellationCaseNotice from "@/components/client/CancellationCaseNotice";
import AcceptedStep from "@/components/client/AcceptedStep";
import ReviewStep from "@/components/client/ReviewStep";
import useClientDebt from "@/hooks/useClientDebt";
import { useRegionalPriceRange } from "@/hooks/useRegionalPriceRange";

export default function Home() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [step, setStepState] = useState(1);
  const [module, setModule] = useState("app");
  const [searchParams, setSearchParams] = useSearchParams();

  // Sincroniza o step com a URL (?step=N) para que o botão de voltar do
  // Android/navegador retroceda uma etapa em vez de sair da página.
  const goToStep = (n) => {
    setStepState(n);
    setSearchParams({ step: String(n) });
  };

  useEffect(() => {
    const urlStep = parseInt(searchParams.get("step"), 10);
    if (!isNaN(urlStep) && urlStep >= 1 && urlStep <= 7 && urlStep !== step) {
      setStepState(urlStep);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);
  const [serviceId, setServiceId] = useState("");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const [urgency, setUrgency] = useState("normal");
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [customAddons, setCustomAddons] = useState({});
  const [vehicleInfo, setVehicleInfo] = useState({ make: "", model: "", year: "", doorStatus: "", complexity: "simples" });
  const [locks, setLocks] = useState([createLock()]);
  // null = cliente ainda não confirmou se a chave está quebrada na fechadura
  const [brokenKeyInLock, setBrokenKeyInLock] = useState(null);
  // null = "Chaveiro perto de mim" (começa em 10 km e amplia automaticamente)
  const [searchRadius, setSearchRadius] = useState(null);
  const [currentRadius, setCurrentRadius] = useState(DEFAULT_RADIUS_KM);
  const [keyValue, setKeyValue] = useState(null);
  const [fipeValue, setFipeValue] = useState(null);
  const [hasCodedKey, setHasCodedKey] = useState(false);
  const [carKeyType, setCarKeyType] = useState("simples");
  const [motoInfo, setMotoInfo] = useState({ brandId: "", modelId: "", year: "", keyType: "", hasPassword: null });
  const [searching, setSearching] = useState(false);

  const [customerLoc, setCustomerLoc] = useState(DEFAULT_CENTER);
  const [appLocksmiths, setAppLocksmiths] = useState([]);
  const [activeRequestsCount, setActiveRequestsCount] = useState(0);
  const [activeRequest, setActiveRequest] = useState(null);
  const [selectedLocksmith, setSelectedLocksmith] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [loyalty, setLoyalty] = useState(null);
  const [paying, setPaying] = useState(false);
  const [routePath, setRoutePath] = useState(null);
  const [routeEta, setRouteEta] = useState(null);
  const [cancelFeeData, setCancelFeeData] = useState(null);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [keyBlock, setKeyBlock] = useState(null);
  const [customerName, setCustomerName] = useState("");
  const reqRef = useRef(null);
  const notifiedAccepted = useRef(false);
  const notifiedMoving = useRef(false);
  const notifiedNearby = useRef(false);
  const notifiedEnd = useRef(false);
  const notifiedCompleted = useRef(false);
  const notifiedArrived = useRef(false);
  const queueRef = useRef([]);
  const debtNotified = useRef(false);

  // Taxa de cancelamento em aberto — bloqueia o modo aplicativo até ser paga
  const { debt, refresh: refreshDebt } = useClientDebt();

  const service = useMemo(() => SERVICE_CATALOG.find((s) => s.id === serviceId), [serviceId]);

  // Condição do tempo no local do cliente — chuva aumenta o valor (até 70%)
  const weather = useWeatherSurge(customerLoc.lat, customerLoc.lng);

  // Regra de faixa de valores da chave de moto (marca, modelo, ano, tipo de chave)
  const motoRule = useMemo(
    () => (service?.isMotoKey ? getMotoKeyRange(motoInfo) : null),
    [service, motoInfo]
  );

  // Regras de programação (acesso online pago / somente concessionária)
  const programming = useMemo(
    () => (service?.isCarKey ? detectCarKeyProgramming(`${vehicleInfo.make} ${vehicleInfo.model}`.trim(), vehicleInfo.year) : null),
    [service, vehicleInfo.make, vehicleInfo.model, vehicleInfo.year]
  );

  // Faixa de referência do estado/capital mais próximo (ajustada pela distância
  // até a capital: perto = médias maiores, longe = médias menores)
  const regional = useRegionalPriceRange(serviceId, customerLoc.lat, customerLoc.lng);

  // Serviço usado no cálculo: para moto, a faixa vem da tabela de regras;
  // para os serviços de abertura, a faixa vem da referência regional.
  const pricingService = useMemo(() => {
    if (service?.isMotoKey && motoRule?.range) return { ...service, baseRange: motoRule.range };
    if (service && regional?.range) return { ...service, baseRange: regional.range };
    return service;
  }, [service, motoRule, regional]);

  useEffect(() => {
    base44.auth.me().then((u) => setCustomerName(u?.full_name || "")).catch(() => {});
  }, []);

  // Verificação no início da solicitação: bloqueio de 3 horas após 3 cancelamentos
  useEffect(() => {
    base44.auth
      .me()
      .then((u) => getKeyCancelBlock(u?.id))
      .then(setKeyBlock)
      .catch(() => setKeyBlock(null));
  }, [activeRequest?.status]);

  // Distância do chaveiro elegível mais próximo DENTRO do raio escolhido.
  // Chaveiros além do raio não entram na busca nem no cálculo do valor.
  const nearestDistance = useMemo(() => {
    if (!service || appLocksmiths.length === 0) return null;
    const limit = searchRadius == null ? DEFAULT_RADIUS_KM : searchRadius;
    const distances = appLocksmiths
      .filter((l) => {
        if (l.services && l.services.length > 0) return l.services.includes(service.id);
        const locksmithSpecialties =
          l.specialties && l.specialties.length > 0 ? l.specialties : [l.specialty];
        return locksmithSpecialties.includes(service.specialty);
      })
      .map((l) => haversineKm(customerLoc, { lat: l.lat, lng: l.lng }))
      .filter((d) => d <= limit);
    if (distances.length === 0) return null;
    return Math.min(...distances);
  }, [service, appLocksmiths, customerLoc, searchRadius]);

  // Distância usada na estimativa de valor: sempre limitada ao raio escolhido.
  // Se não houver chaveiro online dentro do raio, o cálculo assume um chaveiro
  // no limite do raio — assim a taxa por km só aparece nos raios acima de 20 km.
  const pricingDistance = useMemo(() => {
    const limit = searchRadius == null ? DEFAULT_RADIUS_KM : searchRadius;
    return Math.min(nearestDistance ?? limit, limit);
  }, [searchRadius, nearestDistance]);

  // Supply: chaveiros online no modo app
  const onlineLocksmithsCount = appLocksmiths.filter((l) => l.online).length;

  // Preço dinâmico (modo aplicativo): oferta/demanda + urgência + região + bairro + distância
  const price = useMemo(() => {
    if (!pricingService) return null;
    if (service?.isMotoKey && !motoRule?.range) return null;
    return calculateDynamicPrice({
      service: pricingService,
      selectedOptions,
      customAddons,
      vehicleInfo,
      locks: service?.hasLocks ? locks : [],
      onlineLocksmiths: onlineLocksmithsCount,
      activeRequests: activeRequestsCount,
      urgency,
      customerLat: customerLoc.lat,
      customerLng: customerLoc.lng,
      address,
      nearestDistanceKm: pricingDistance,
      keyValue,
      fipeValue,
      carKeyType,
      hasCodedKey,
      onlineProgrammingFee: programming?.onlineFee || 0,
      weather,
      brokenKeyInLock: brokenKeyInLock === true,
    });
  }, [pricingService, service, motoRule, selectedOptions, customAddons, vehicleInfo, locks, onlineLocksmithsCount, activeRequestsCount, urgency, customerLoc, address, pricingDistance, keyValue, fipeValue, carKeyType, hasCodedKey, programming, weather, brokenKeyInLock]);

  useEffect(() => {
    getCustomerLocation().then(setCustomerLoc);
    // Inclui score e eventuais suspensões na seleção dos profissionais.
    Promise.all([
      base44.entities.Locksmith.filter({ available: true }),
      loadScoreMap(),
    ]).then(([profiles, scores]) => setAppLocksmiths(withScores(profiles, scores))).catch(() => {});
    base44.auth.me()
      .then((u) => getClientLoyalty(u.id))
      .then(setLoyalty)
      .catch(() => setLoyalty(null));
  }, []);

  // Restaura um serviço em andamento ao reentrar na Home — garante que o
  // cliente consiga retomar o fluxo, finalizar e pagar mesmo após navegar
  // para outras abas ou sair da tela de solicitação.
  useEffect(() => {
    let cancelled = false;
    base44.auth.me().then(async (u) => {
      if (!u?.id || cancelled) return;
      try {
        const list = await base44.entities.ServiceRequest.filter({ created_by_id: u.id }, "-created_date", 20);
        if (cancelled) return;
        const active = list.find((r) => {
          if (r.status === "ringing" || r.status === "accepted" || r.status === "on_the_way") return true;
          if (r.end_photos?.length > 0 && r.status !== "completed") return true;
          if (r.status === "completed" && !r.rating) return true;
          return false;
        });
        if (!active) return;
        setActiveRequest(active);
        reqRef.current = active.id;
        if (active.locksmith_id) {
          base44.entities.Locksmith.get(active.locksmith_id).then(setSelectedLocksmith).catch(() => {});
        }
        let s = 5;
        if (active.status === "ringing") s = 3;
        else if (active.status === "accepted") s = 4;
        else if (active.status === "on_the_way") s = 5;
        else if (active.end_photos?.length > 0 && active.status !== "completed") s = 6;
        else if (active.status === "completed") s = 7;
        goToStep(s);
      } catch (e) {
        /* silencioso */
      }
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Débito pendente: reabre a tela de pagamento da taxa e avisa o cliente.
  // Qualquer tentativa de sair (Voltar / novo pedido) volta para esta tela.
  useEffect(() => {
    if (!debt) return;
    if (activeRequest?.id === debt.request.id && cancelFeeData) return;
    const r = debt.request;
    setActiveRequest(r);
    reqRef.current = r.id;
    if (r.locksmith_id) {
      base44.entities.Locksmith.get(r.locksmith_id).then(setSelectedLocksmith).catch(() => {});
    }
    setCancelFeeData({
      fee: debt.fee,
      locksmithAmount: Number(r.cancellation_locksmith_amount) || 0,
      appFee: Number(r.cancellation_app_fee) || 0,
    });
    if (!debtNotified.current) {
      debtNotified.current = true;
      notifyClient("Débito pendente", `Você tem uma taxa de cancelamento de R$ ${debt.fee.toFixed(2)} em aberto. Pague para voltar a usar o app.`);
      toast({
        title: "Débito pendente",
        description: `Taxa de cancelamento de R$ ${debt.fee.toFixed(2)} em aberto. Pague para liberar novos pedidos.`,
        variant: "destructive",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debt, activeRequest?.id, cancelFeeData]);

  // Demanda ativa: conta solicitações em andamento (searching + ringing)
  // para alimentar o cálculo dinâmico de oferta vs. demanda.
  useEffect(() => {
    const fetchDemand = async () => {
      try {
        const [searching, ringing] = await Promise.all([
          base44.entities.ServiceRequest.filter({ status: "searching" }),
          base44.entities.ServiceRequest.filter({ status: "ringing" }),
        ]);
        setActiveRequestsCount((searching?.length || 0) + (ringing?.length || 0));
      } catch (e) {
        /* silencioso — não bloqueia o fluxo */
      }
    };
    fetchDemand();
    const unsub = base44.entities.ServiceRequest.subscribe(() => fetchDemand());
    return safeUnsubscribe(unsub);
  }, []);

  // Chaveiros elegíveis dentro do raio escolhido (ou do raio inicial na opção
  // "perto de mim") — chaveiros mais distantes não são considerados.
  const inRadiusCount = useMemo(() => {
    if (!service) return null;
    return buildEligibleQueue(
      appLocksmiths,
      service,
      customerLoc,
      searchRadius == null ? DEFAULT_RADIUS_KM : searchRadius
    ).length;
  }, [service, appLocksmiths, customerLoc, searchRadius]);

  // Sem resposta em 5 minutos: aumenta o raio em 20% e toca em mais chaveiros
  useRadiusExpansion({
    request: activeRequest,
    service,
    locksmiths: appLocksmiths,
    customerLoc,
    radiusKm: currentRadius,
    // A ampliação automática só vale na opção "Chaveiro perto de mim";
    // com raio escolhido o chamado já toca para todos os chaveiros online.
    enabled: searchRadius == null,
    onExpand: ({ radiusKm, added }) => {
      setCurrentRadius(radiusKm);
      toast({
        title: `Raio de busca ampliado para ${radiusKm} km`,
        description: added > 0
          ? `Mais ${added} chaveiro${added > 1 ? "s" : ""} está${added > 1 ? "ão" : ""} recebendo seu chamado.`
          : "Continuamos procurando chaveiros disponíveis.",
      });
    },
  });

  const toggleOption = (optId) => {
    setSelectedOptions((prev) =>
      prev.includes(optId) ? prev.filter((o) => o !== optId) : [...prev, optId]
    );
  };

  const setCustomAddon = (optId, value) => {
    setCustomAddons((prev) => ({ ...prev, [optId]: value }));
  };

  const handleAddressSelect = ({ lat, lng }) => {
    setCustomerLoc({ lat, lng });
  };

  const handleSearchKey = async () => {
    if (!vehicleInfo.make.trim() || !vehicleInfo.model.trim() || !vehicleInfo.year.trim()) {
      setSearchError("Informe montadora, modelo e ano do veículo");
      return;
    }
    setSearching(true);
    setSearchError("");
    try {
      const vehicleName = `${vehicleInfo.make} ${vehicleInfo.model}`.trim();
      const res = await searchFipeAndKeyValue(vehicleName, vehicleInfo.year);
      setFipeValue(res.fipeValue);
      setKeyValue(res.keyValue);
      setHasCodedKey(res.hasCodedKey);
      if (!res.keyValueTrusted && carKeyType !== "simples") {
        setSearchError(
          "Não foi possível confirmar o valor da chave original deste modelo. O chaveiro informará esse valor ao aceitar o serviço."
        );
      }
    } catch (e) {
      setFipeValue(null);
      setKeyValue(null);
      setHasCodedKey(false);
      setSearchError(e.message || "Falha ao consultar os dados do veículo");
    } finally {
      setSearching(false);
    }
  };

  // Solicita o serviço: encontra o chaveiro do modo app mais próximo e "toca" nele
  // O pagamento acontece APÓS a conclusão do serviço, não antes.
  const handleConfirmConfig = async () => {
    if (!address || submitting) return;
    if (debt) {
      setSearchError("Você possui uma taxa de cancelamento em aberto. Pague o débito para solicitar novos serviços.");
      return;
    }
    if (programming?.dealerOnly) {
      setSearchError(programming.reason);
      return;
    }
    setSubmitting(true);
    setSearchError("");
    try {
      // Bloqueio por cancelamentos repetidos em confecção de chaves
      if (service?.isCarKey || service?.isMotoKey) {
        const user = await base44.auth.me().catch(() => null);
        const block = await getKeyCancelBlock(user?.id);
        if (block.blocked) {
          const h = Math.floor(block.minutesLeft / 60);
          const m = block.minutesLeft % 60;
          setSearchError(
            `Você cancelou 3 solicitações de confecção de chave. Novas solicitações estarão liberadas em ${h > 0 ? `${h}h ` : ""}${m}min.`
          );
          setSubmitting(false);
          return;
        }
      }

      // Filtra apenas chaveiros que atendem o serviço solicitado.
      // 1. Se o chaveiro configurou serviços específicos, exige o ID do serviço.
      // 2. Se não configurou serviços, usa a especialidade como filtro:
      //    o serviço só vai para chaveiros cuja especialidade inclui a do serviço.
      // Prioriza quem está dentro do raio escolhido; se ninguém estiver,
      // o chamado toca nos chaveiros elegíveis mais próximos de qualquer forma.
      const allEligible = buildEligibleQueue(appLocksmiths, service, customerLoc);
      let queue;
      let usedRadius;
      if (searchRadius == null) {
        // "Chaveiro perto de mim": começa em 10 km e amplia 20% até encontrar
        const res = expandUntilFound(allEligible, DEFAULT_RADIUS_KM);
        usedRadius = res.radiusKm;
        queue = res.inRadius;
      } else {
        // Raio escolhido pelo cliente: toca de uma vez para todos os chaveiros
        // online que atendem o serviço DENTRO desse raio — quem está mais longe
        // não recebe o chamado nem entra no cálculo do valor.
        usedRadius = searchRadius;
        queue = allEligible.filter((q) => q.d <= searchRadius);
      }
      const broadcast = selectScoreBroadcast(queue, price?.total || 0);
      queueRef.current = broadcast;
      setCurrentRadius(usedRadius);
      const nearest = broadcast[0];
      // Scores altos recebem primeiro os chamados de maior valor; scores baixos
      // continuam em recuperação com chamados menores, mais distantes e menos frequentes.

      if (!nearest) {
        setSearchError(`Nenhum chaveiro disponível para "${service.label}" no modo aplicativo agora. Tente novamente em instantes.`);
        setSubmitting(false);
        return;
      }

      const initialDistanceKm = calculateInitialServiceDistance(
        { lat: nearest.l.lat, lng: nearest.l.lng },
        customerLoc
      );

      // Resumo das fechaduras enviado ao chaveiro junto com a solicitação
      const locksText = service.hasLocks ? locksSummary(locks) : "";
      const brokenKeyText = isOpeningService(service)
        ? brokenKeyInLock
          ? "Chave quebrada dentro da fechadura"
          : "Chave não está quebrada na fechadura"
        : "";
      const base = {
        service_type: service.label,
        address,
        description: [locksText, brokenKeyText, description].filter(Boolean).join(" — "),
        urgency,
        status: "ringing",
        locksmith_id: nearest.l.id,
        locksmith_name: nearest.l.name,
        locksmith_user_id: nearest.l.created_by_id,
        ringing_locksmith_ids: broadcast.map((q) => q.l.id),
        ringing_locksmith_user_ids: broadcast.map((q) => q.l.created_by_id),
        customer_lat: customerLoc.lat,
        customer_lng: customerLoc.lng,
        locksmith_lat: nearest.l.lat,
        locksmith_lng: nearest.l.lng,
      };

      const useDiscount = loyalty?.available > 0;

      let req;
      if (service.isCarKey) {
        // Preço dinâmico: valor da chave + mão de obra pela faixa de ano/codificação da FIPE
        const effectiveKeyValue = carKeyType === "simples" ? 0 : keyValue || 0;
        const onlineFee = programming?.onlineFee || 0;
        const basePrice = price?.total || 0;
        const adjustedLabor = price
          ? Math.round((price.base - effectiveKeyValue - onlineFee) * 100) / 100
          : 0;
        const kmFee = calculateLongDistanceFee(initialDistanceKm);
        const disc = useDiscount ? applyLoyaltyDiscount(basePrice) : { amount: 0, final: basePrice };
        req = await base44.entities.ServiceRequest.create({
          ...base,
          price: disc.final,
          key_value: effectiveKeyValue,
          fipe_value: fipeValue,
          key_type: carKeyType,
          vehicle_info: `${vehicleInfo.make} ${vehicleInfo.model} · Ano ${vehicleInfo.year} · Porta ${vehicleInfo.doorStatus}`.trim(),
          labor_cost: adjustedLabor,
          locomotion_cost: kmFee,
          distance_km: initialDistanceKm,
          extra_cost: onlineFee,
          discount_applied: useDiscount,
          discount_amount: disc.amount,
        });
      } else {
        // Preço dinâmico já inclui ajustes de oferta/demanda, região, bairro e taxa de distância
        const basePrice = price?.total || 0;
        const kmFee = calculateLongDistanceFee(initialDistanceKm);
        const disc = useDiscount ? applyLoyaltyDiscount(basePrice) : { amount: 0, final: basePrice };
        const motoModel = service.isMotoKey ? getMotoModel(motoInfo.brandId, motoInfo.modelId) : null;
        req = await base44.entities.ServiceRequest.create({
          ...base,
          price: disc.final,
          distance_km: initialDistanceKm,
          locomotion_cost: kmFee,
          ...(service.isMotoKey
            ? {
                key_type: motoInfo.keyType,
                vehicle_info: `${MOTO_BRANDS.find((b) => b.id === motoInfo.brandId)?.label || ""} ${
                  motoModel?.label || ""
                } ${motoInfo.year}${motoInfo.keyType === "presenca" ? (motoInfo.hasPassword ? " · com senha" : " · sem senha") : ""}`.trim(),
              }
            : {}),
          discount_applied: useDiscount,
          discount_amount: disc.amount,
        });
      }

      // Notificação automática no chat para chamados urgentes (SLA de 35 min)
      if (urgency === "urgent") {
        try {
          const user = await base44.auth.me();
          await base44.entities.ChatMessage.create({
            locksmith_id: nearest.l.id,
            locksmith_name: nearest.l.name,
            locksmith_user_id: nearest.l.created_by_id,
            client_id: user?.id,
            client_name: user?.full_name || customerName || "Cliente",
            sender_type: "system",
            sender_name: "Chaveiro Já",
            message: "⚠️ Chamado URGENTE: o chaveiro tem até 35 minutos para chegar ao local do atendimento.",
          });
        } catch (e) {
          /* não bloqueia o fluxo de solicitação */
        }
      }

      if (useDiscount) {
        setLoyalty((prev) => (prev ? { ...prev, available: prev.available - 1 } : prev));
      }
      setSelectedLocksmith(nearest.l);
      setActiveRequest(req);
      reqRef.current = req.id;
      goToStep(3);
    } finally {
      setSubmitting(false);
    }
  };

  // Reconstrói a fila de chaveiros ao retomar um chamado em andamento
  useEffect(() => {
    if (!activeRequest || activeRequest.status !== "ringing") return;
    if (queueRef.current.length > 0) return;
    const svc = SERVICE_CATALOG.find((s) => s.label === activeRequest.service_type);
    if (!svc || appLocksmiths.length === 0) return;
    queueRef.current = buildEligibleQueue(appLocksmiths, svc, {
      lat: activeRequest.customer_lat,
      lng: activeRequest.customer_lng,
    });
  }, [activeRequest?.id, activeRequest?.status, appLocksmiths]);

  // Pagamento confirmado via Stripe — acontece após o serviço, antes da finalização
  const handleServicePayment = async (method, stripePaymentIntentId) => {
    if (!activeRequest) return;

    // Dinheiro: não cria PaymentIntent no Stripe — o chaveiro confirma o recebimento
    if (method === "dinheiro") {
      setPaying(true);
      setSearchError("");
      try {
        await base44.entities.ServiceRequest.update(activeRequest.id, { payment_method: "dinheiro" });
        setActiveRequest((prev) => ({ ...prev, payment_method: "dinheiro" }));
      } catch (e) {
        setSearchError(e.message || "Falha ao registrar forma de pagamento");
      } finally {
        setPaying(false);
      }
      return;
    }

    setPaying(true);
    setSearchError("");
    try {
      const user = await base44.auth.me();
      const payment = await createPaymentRecord({
        serviceRequestId: activeRequest.id,
        amount: activeRequest.price,
        method,
        locksmithId: selectedLocksmith?.id,
        locksmithName: selectedLocksmith?.name,
        clientId: user?.id,
        clientName: user?.full_name,
        stripePaymentIntentId,
      });
      await confirmPaymentPaid(payment.id);
      setActiveRequest((prev) => ({ ...prev, payment_id: payment.id, payment_status: "paid" }));
      base44.auth.me()
        .then((u) => getClientLoyalty(u.id))
        .then(setLoyalty)
        .catch(() => {});
    } catch (e) {
      setSearchError(e.message || "Falha ao processar pagamento");
    } finally {
      setPaying(false);
    }
  };

  // Pagamento da taxa de cancelamento
  const handleCancelFeePayment = async (method, stripePaymentIntentId) => {
    if (!activeRequest || !cancelFeeData) return;
    setPaying(true);
    try {
      const user = await base44.auth.me();
      const payment = await createPaymentRecord({
        serviceRequestId: activeRequest.id,
        amount: cancelFeeData.fee,
        method,
        locksmithId: selectedLocksmith?.id,
        locksmithName: selectedLocksmith?.name,
        clientId: user?.id,
        clientName: user?.full_name,
        stripePaymentIntentId,
      });
      await confirmPaymentPaid(payment.id);
      await base44.entities.ServiceRequest.update(activeRequest.id, {
        status: "cancelled",
        cancelled_by: "cliente",
        cancellation_fee: cancelFeeData.fee,
        cancellation_locksmith_amount: cancelFeeData.locksmithAmount,
        cancellation_app_fee: cancelFeeData.appFee,
        payment_id: payment.id,
        payment_method: method,
        payment_status: "paid",
      });
      await refreshDebt();
      handleNewRequest();
    } catch (e) {
      setSearchError(e.message || "Falha ao processar taxa de cancelamento");
    } finally {
      setPaying(false);
    }
  };

  // Assina a solicitação para reagir quando o chaveiro aceitar / se mover
  useEffect(() => {
    if (!activeRequest) return;
    // Solicita permissão de notificação nativa ao iniciar o acompanhamento
    ensureNotificationPermission();
    const unsub = base44.entities.ServiceRequest.subscribe((event) => {
      if (event.data?.id === activeRequest.id) {
        base44.entities.ServiceRequest.get(activeRequest.id).catch(() => null).then((updated) => {
          if (!updated) return; // falha de rede momentânea — ignora e espera o próximo evento
          setActiveRequest(updated);
          // O chamado toca para vários chaveiros — carrega quem realmente aceitou
          if (updated.locksmith_id && updated.locksmith_id !== selectedLocksmith?.id) {
            base44.entities.Locksmith.get(updated.locksmith_id).then(setSelectedLocksmith).catch(() => {});
          }
          if (updated.status === "accepted" && step === 3) {
            goToStep(4);
          }
          if (updated.status === "accepted" && !notifiedAccepted.current) {
            notifiedAccepted.current = true;
            sendServiceStatusMessage("accepted", { request: updated, locksmith: selectedLocksmith });
          }
          if (updated.status === "on_the_way" && step === 4) {
            goToStep(5);
          }
          // Chaveiro registrou o final do serviço → cliente paga
          if (updated.end_photos?.length > 0 && step === 5) {
            goToStep(6);
          }
          // Chaveiro finaliza o serviço (após pagamento) → avaliação
          if (updated.status === "completed" && step === 6) {
            goToStep(7);
          }

          // Notificação: chaveiro iniciou o deslocamento
          if (updated.status === "on_the_way" && !notifiedMoving.current) {
            notifiedMoving.current = true;
            sendServiceStatusMessage("on_the_way", { request: updated, locksmith: selectedLocksmith });
            notifyClient(
              "Chaveiro a caminho!",
              `${selectedLocksmith?.name || "O chaveiro"} iniciou o deslocamento até você.`
            );
            toast({
              title: "🚗 Chaveiro a caminho!",
              description: `${selectedLocksmith?.name || "O chaveiro"} saiu em direção ao seu endereço.`,
            });
          }

          // Notificação: chaveiro a menos de 1 km de distância
          if (
            updated.locksmith_lat &&
            updated.customer_lat &&
            !notifiedNearby.current
          ) {
            const dist = haversineKm(
              { lat: updated.locksmith_lat, lng: updated.locksmith_lng },
              { lat: updated.customer_lat, lng: updated.customer_lng }
            );
            if (dist <= 1 && dist >= 0) {
              notifiedNearby.current = true;
              sendServiceStatusMessage("nearby", { request: updated, locksmith: selectedLocksmith });
              notifyClient(
                "Seu chaveiro está chegando!",
                `Ele está a menos de 1 km do seu endereço.`
              );
              toast({
                title: "📍 Seu chaveiro está chegando!",
                description: "A menos de 1 km de distância. Prepare-se para recebê-lo.",
              });
            }
          }

          // Notificação: chaveiro chegou ao local
          if (updated.locksmith_arrived && !notifiedArrived.current) {
            notifiedArrived.current = true;
            sendServiceStatusMessage("arrived", { request: updated, locksmith: selectedLocksmith });
            notifyClient("Chaveiro chegou!", `${selectedLocksmith?.name || "O chaveiro"} chegou ao seu endereço. Confirme a chegada.`);
            toast({ title: "📍 Chaveiro chegou!", description: "Confirme a chegada para liberar o início do serviço." });
          }

          // Notificação: chaveiro registrou o final do serviço (hora de confirmar e pagar)
          if (updated.end_photos?.length > 0 && !notifiedEnd.current) {
            notifiedEnd.current = true;
            sendServiceStatusMessage("finished", { request: updated, locksmith: selectedLocksmith });
            notifyClient("Serviço concluído!", "O chaveiro finalizou o atendimento. Confirme e efetue o pagamento.");
            toast({ title: "✅ Serviço concluído!", description: "Confirme o serviço e efetue o pagamento." });
          }
          // Notificação: chaveiro finalizou o serviço (pagamento confirmado)
          if (updated.status === "completed" && !notifiedCompleted.current) {
            notifiedCompleted.current = true;
            notifyClient("Tudo certo!", "Serviço finalizado. Avalie o atendimento.");
          }
        });
      }
    });
    return safeUnsubscribe(unsub);
  }, [activeRequest?.id, step, selectedLocksmith]);

  // Busca a rota real de carro entre o chaveiro e o cliente (OSRM)
  useEffect(() => {
    if (step < 4 || !activeRequest) return;
    const from = { lat: activeRequest.locksmith_lat, lng: activeRequest.locksmith_lng };
    const to = { lat: activeRequest.customer_lat, lng: activeRequest.customer_lng };
    if (!from.lat || !to.lat) return;
    setRoutePath(null);
    setRouteEta(null);
    fetchDrivingRoute(from, to).then((r) => {
      if (r) {
        setRoutePath(r.coordinates);
        setRouteEta(etaMinutes(r.duration));
      }
    });
  }, [step, activeRequest?.locksmith_lat, activeRequest?.locksmith_lng, activeRequest?.customer_lat, activeRequest?.customer_lng]);

  const handleAdvance = () => {
    if (!activeRequest) return;
    // O cliente só confirma que o chaveiro está a caminho; a conclusão do serviço
    // é controlada pelo chaveiro, após o pagamento.
    if (activeRequest.status === "accepted") {
      base44.entities.ServiceRequest.update(activeRequest.id, { status: "on_the_way" }).then(setActiveRequest);
    }
  };

  const handleRate = async (n, comment = "") => {
    const updated = await base44.entities.ServiceRequest.update(activeRequest.id, {
      rating: n,
      review: comment,
    });
    setActiveRequest(updated);
    // Envia o resumo do serviço por email ao cliente (após pagamento e avaliação)
    try {
      await base44.functions.invoke("sendServiceCompletionEmail", {
        service_request_id: activeRequest.id,
      });
    } catch (e) {
      /* não bloqueia o fluxo se o email falhar */
    }
  };

  // Cliente confirma que o chaveiro chegou ao local
  const handleConfirmArrival = async () => {
    if (!activeRequest) return;
    await base44.entities.ServiceRequest.update(activeRequest.id, { client_arrived_confirmed: true });
    setActiveRequest((prev) => ({ ...prev, client_arrived_confirmed: true }));
  };

  // Cliente informa que o chaveiro ainda NÃO chegou — desfaz a confirmação do
  // chaveiro e o devolve para o acompanhamento de deslocamento.
  const handleDenyArrival = async () => {
    if (!activeRequest) return;
    await base44.entities.ServiceRequest.update(activeRequest.id, { locksmith_arrived: false });
    setActiveRequest((prev) => ({ ...prev, locksmith_arrived: false }));
    notifiedArrived.current = false;
    sendServiceStatusMessage("not_arrived", { request: activeRequest, locksmith: selectedLocksmith });
    toast({
      title: "Chegada não confirmada",
      description: "Avisamos o chaveiro de que ele ainda não chegou ao seu endereço.",
    });
  };

  // Cliente confirma que o serviço foi finalizado (libera o pagamento)
  const handleConfirmService = async () => {
    if (!activeRequest) return;
    await base44.entities.ServiceRequest.update(activeRequest.id, { client_confirmed: true });
    setActiveRequest((prev) => ({ ...prev, client_confirmed: true }));
  };

  const handleCancel = async () => {
    if (!activeRequest) return;
    // O cliente pode cancelar a qualquer momento — inclusive após a chegada do
    // chaveiro. As regras de taxa de cancelamento continuam valendo.
    const started = activeRequest.status === "accepted" || activeRequest.status === "on_the_way";
    if (started) {
      // Janela grátis: cancelamento sem custo nos primeiros 5 min após o aceite
      // Carência de 5 minutos, contada do aceite do chaveiro ou, na ausência
      // dele, da abertura do chamado
      const window = getCancellationWindow(activeRequest);
      if (window.free) {
        try {
          await base44.entities.ServiceRequest.update(activeRequest.id, { status: "cancelled", cancelled_by: "cliente" });
          handleNewRequest();
        } catch (e) {
          toast({ title: "Falha ao cancelar", description: e.message || "Tente novamente", variant: "destructive" });
        }
        return;
      }
      // Após 5 min: abre a confirmação da taxa de cancelamento (paga online)
      const c = calculateCancellationFee(activeRequest.price, {
        serviceType: activeRequest.service_type,
        urgency: activeRequest.urgency,
      });
      setCancelFeeData(c);
      setCancelConfirmOpen(true);
      return;
    }
    // Antes do aceite: cancela livremente
    try {
      await base44.entities.ServiceRequest.update(activeRequest.id, { status: "cancelled", cancelled_by: "cliente" });
      handleNewRequest();
    } catch (e) {
      toast({ title: "Falha ao cancelar", description: e.message || "Tente novamente", variant: "destructive" });
    }
  };

  // Cliente confirmou o cancelamento com taxa: o chamado é cancelado NA HORA e
  // a taxa fica registrada como débito pendente — se o cliente fechar o app sem
  // pagar, o débito continua bloqueando o uso até a quitação.
  const handleConfirmCancelWithFee = async () => {
    if (!activeRequest || !cancelFeeData) return;
    try {
      const updated = await base44.entities.ServiceRequest.update(activeRequest.id, {
        status: "cancelled",
        cancelled_by: "cliente",
        cancellation_fee: cancelFeeData.fee,
        cancellation_locksmith_amount: cancelFeeData.locksmithAmount,
        cancellation_app_fee: cancelFeeData.appFee,
        payment_status: "pending",
      });
      setActiveRequest(updated);
      refreshDebt();
    } catch (e) {
      toast({ title: "Falha ao cancelar", description: e.message || "Tente novamente", variant: "destructive" });
      setCancelFeeData(null);
    }
  };

  // Cancelamento iniciado na tela de acompanhamento (?cancel=1): aplica as
  // mesmas regras de taxa deste fluxo.
  const cancelTriggered = useRef(false);
  useEffect(() => {
    if (searchParams.get("cancel") !== "1" || !activeRequest || cancelTriggered.current) return;
    cancelTriggered.current = true;
    setSearchParams({});
    handleCancel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRequest?.id, searchParams]);

  const handleNewRequest = () => {
    goToStep(1);
    setServiceId("");
    setAddress("");
    setDescription("");
    setUrgency("normal");
    setSelectedOptions([]);
    setCustomAddons({});
    setVehicleInfo({ make: "", model: "", year: "", doorStatus: "", complexity: "simples" });
    setLocks([createLock()]);
    setBrokenKeyInLock(null);
    setSearchRadius(null);
    setCurrentRadius(DEFAULT_RADIUS_KM);
    setKeyValue(null);
    setFipeValue(null);
    setHasCodedKey(false);
    setCarKeyType("simples");
    setMotoInfo({ brandId: "", modelId: "", year: "", keyType: "", hasPassword: null });
    setSearching(false);
    setSearchError("");
    setSelectedLocksmith(null);
    setActiveRequest(null);
    setSearchError("");
    setPaying(false);
    setCancelFeeData(null);
    setRoutePath(null);
    setRouteEta(null);
    notifiedAccepted.current = false;
    notifiedMoving.current = false;
    notifiedNearby.current = false;
    notifiedArrived.current = false;
    notifiedEnd.current = false;
    notifiedCompleted.current = false;
  };

  const showAppFlow = module === "app" || step > 1 || activeRequest;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 md:py-10">
      <div className="mb-8 fade-in-up">
        <div className="flex items-center gap-2 mb-2">
          <Image
            src="https://media.base44.com/images/public/6a975d266a8000184833026a/d4717d1d4_ChatGPTImage4desetde202604_02_02.png"
            alt="Chaveiro Já"
            fittingType="fit"
            className="w-11 h-11 rounded-xl"
          />
          <div>
            <h1 className="font-heading font-bold text-2xl text-foreground">Chaveiro Já</h1>
            <p className="text-sm text-muted-foreground">Chaveiros de confiança a um toque</p>
          </div>
        </div>
      </div>

      {step === 1 && !activeRequest && (
        <ModuleSelector module={module} setModule={setModule} />
      )}

      {showAppFlow && !cancelFeeData && (
        <StepProgress step={step} total={7} />
      )}

      {/* Step 1: Serviço */}
      {step === 1 && showAppFlow && !cancelFeeData && (
        <div className="space-y-5 step-enter">
          <KeyBlockBanner block={keyBlock} />
          <PointsProgressCard loyalty={loyalty} />
          <div>
            <h2 className="font-heading font-semibold text-lg text-foreground">Qual serviço você precisa?</h2>
            <p className="text-sm text-muted-foreground">Selecione o tipo de atendimento</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {SERVICE_CATALOG.map((s) => (
              <ServiceCard key={s.id} service={s} selected={serviceId === s.id} onClick={() => setServiceId(s.id)} />
            ))}
          </div>
          <Button onClick={() => goToStep(2)} disabled={!serviceId || keyBlock?.blocked} size="lg" className="w-full">
            Continuar <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      )}

      {/* Modo Livre: mapa interativo com chaveiros online */}
      {!showAppFlow && (
        <div className="space-y-4 fade-in-up">
          <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50">
            <div className="flex items-center gap-2 mb-1">
              <Navigation className="w-5 h-5 text-emerald-600" />
              <h2 className="font-heading font-semibold text-lg text-foreground">Modo Livre</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Navegue pelo mapa, encontre chaveiros online perto de você e converse diretamente com o profissional para combinar o serviço.
            </p>
          </div>
          <LiveLocksmithsMap customerLoc={customerLoc} livreOnly />
        </div>
      )}

      {/* Step 2: Configuração + preço */}
      {step === 2 && service && (
        <div className="space-y-5 step-enter">
          {service.isCarKey ? (
            <CarKeyConfig
              service={service}
              vehicleInfo={vehicleInfo}
              setVehicleInfo={setVehicleInfo}
              address={address}
              setAddress={setAddress}
              onAddressSelect={handleAddressSelect}
              description={description}
              setDescription={setDescription}
              keyValue={keyValue}
              searching={searching}
              searchError={searchError}
              onSearch={handleSearchKey}
              carKeyType={carKeyType}
              setCarKeyType={setCarKeyType}
              fipeValue={fipeValue}
              programming={programming}
              price={null}
            />
          ) : service.isMotoKey ? (
            <MotoKeyConfig
              service={service}
              motoInfo={motoInfo}
              setMotoInfo={setMotoInfo}
              motoRule={motoRule}
              address={address}
              setAddress={setAddress}
              onAddressSelect={handleAddressSelect}
              description={description}
              setDescription={setDescription}
              price={null}
            />
          ) : (
            <ServiceConfig
              service={service}
              address={address}
              setAddress={setAddress}
              onAddressSelect={handleAddressSelect}
              description={description}
              setDescription={setDescription}
              selectedOptions={selectedOptions}
              toggleOption={toggleOption}
              customAddons={customAddons}
              setCustomAddon={setCustomAddon}
              vehicleInfo={vehicleInfo}
              setVehicleInfo={setVehicleInfo}
              locks={locks}
              setLocks={setLocks}
              brokenKeyInLock={brokenKeyInLock}
              setBrokenKeyInLock={setBrokenKeyInLock}
              price={address ? price : null}
            />
          )}

          <SearchRadiusSelector
            radius={searchRadius}
            setRadius={setSearchRadius}
            availableCount={inRadiusCount}
          />

          <UrgencySelector urgency={urgency} setUrgency={setUrgency} />

          <ErrorBanner message={searchError} />

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => goToStep(1)} className="flex-1">
              <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
            </Button>
            <Button
              onClick={handleConfirmConfig}
              disabled={
                !address ||
                submitting ||
                programming?.dealerOnly ||
                (isOpeningService(service) && brokenKeyInLock == null) ||
                (service?.needsVehicleInfo &&
                  !service?.isCarKey &&
                  (!vehicleInfo.make?.trim() || !vehicleInfo.model?.trim() || !String(vehicleInfo.year || "").trim())) ||
                (service?.isCarKey && (!fipeValue || !vehicleInfo.doorStatus)) ||
                (service?.isMotoKey && !motoRule?.range)
              }
              className="flex-1"
            >
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Bell className="w-4 h-4 mr-2" />}
              Solicitar chaveiro
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Procurando / tocando no chaveiro */}
      {step === 3 && activeRequest && !cancelFeeData && (
        <RingingStep
          request={activeRequest}
          serviceLabel={service?.label}
          searchRadius={searchRadius}
          currentRadius={currentRadius}
          onCancel={handleCancel}
        />
      )}

      {/* Step 4: Pedido em andamento (chaveiro aceitou) */}
      {step === 4 && activeRequest && activeRequest.status === "accepted" && (
        <AcceptedStep
          request={activeRequest}
          locksmith={selectedLocksmith}
          serviceLabel={service?.label}
          routePath={routePath}
          routeEta={routeEta}
          onTrack={() => { handleAdvance(); goToStep(5); }}
          onChat={() => navigate(`/acompanhamento/${activeRequest.id}`)}
          onUpdated={setActiveRequest}
        />
      )}

      {/* Step 5: Acompanhamento em tempo real (oculta durante pagamento da taxa) */}
      {step === 5 && activeRequest && !cancelFeeData && (
        <div className="space-y-5 step-enter">
          <div>
            <h2 className="font-heading font-semibold text-lg text-foreground flex items-center gap-2">
              <Navigation className="w-5 h-5 text-primary" /> Acompanhando serviço
            </h2>
            <p className="text-sm text-muted-foreground">{activeRequest.service_type} · {activeRequest.address}</p>
          </div>

          <UrgentArrivalCountdown request={activeRequest} />
          <CancellationCaseNotice requestId={activeRequest.id} />

          {activeRequest.locksmith_arrived && !activeRequest.client_arrived_confirmed && (
            <div className="p-4 rounded-2xl border-2 border-primary bg-primary/5 space-y-3">
              <div className="flex items-center gap-2 text-primary">
                <MapPin className="w-5 h-5" />
                <p className="font-medium text-sm">O chaveiro chegou ao local!</p>
              </div>
              <p className="text-xs text-muted-foreground">Confirme a chegada para que o chaveiro inicie o atendimento. Se ele ainda não chegou, avise pelo botão abaixo.</p>
              <Button onClick={handleConfirmArrival} className="w-full">
                <CheckCircle2 className="w-4 h-4 mr-1.5" /> Confirmar chegada do chaveiro
              </Button>
              <Button
                onClick={handleDenyArrival}
                variant="outline"
                className="w-full text-red-600 border-red-200 hover:bg-red-50"
              >
                <AlertTriangle className="w-4 h-4 mr-1.5" /> Ele ainda não chegou
              </Button>
            </div>
          )}

          <LightMap
            center={{ lat: activeRequest.customer_lat, lng: activeRequest.customer_lng }}
            height={320}
            markers={[
              { id: "c", lat: activeRequest.customer_lat, lng: activeRequest.customer_lng, type: "customer", label: "Você" },
              { id: "l", lat: activeRequest.locksmith_lat, lng: activeRequest.locksmith_lng, type: "locksmith", label: selectedLocksmith?.name?.split(" ")[0], active: activeRequest.status === "on_the_way" },
            ]}
            route={
              activeRequest.status !== "completed"
                ? { from: { lat: activeRequest.locksmith_lat, lng: activeRequest.locksmith_lng }, to: { lat: activeRequest.customer_lat, lng: activeRequest.customer_lng } }
                : null
            }
            routePath={routePath}
            eta={routeEta}
          />

          <RequestTracking
            request={activeRequest}
            locksmith={selectedLocksmith}
            onAdvance={handleAdvance}
            onRate={handleRate}
            onCall={(l) => (window.location.href = `tel:${l.phone}`)}
          />

          <Button
            variant="outline"
            onClick={() => navigate(`/acompanhamento/${activeRequest.id}`)}
            className="w-full"
          >
            <MessageCircle className="w-4 h-4 mr-2" /> Ver rota e conversar com o chaveiro
          </Button>

          {!activeRequest.start_photos?.length && (
            <UpgradeToUrgentButton request={activeRequest} onUpdated={setActiveRequest} />
          )}

          {activeRequest.status !== "completed" && (
            <Button onClick={handleCancel} variant="outline" className="w-full text-red-600 border-red-200 hover:bg-red-50">
              Cancelar serviço
            </Button>
          )}

          {activeRequest.status === "completed" && (
            <Button onClick={handleNewRequest} variant="outline" className="w-full">
              Solicitar novo serviço
            </Button>
          )}
        </div>
      )}

      {/* Step 6: Pagamento (após o chaveiro registrar o final do serviço) */}
      {step === 6 && activeRequest && activeRequest.end_photos?.length > 0 && activeRequest.status !== "completed" && (
        <div className="space-y-3 step-enter">
          <div className="flex flex-col items-center text-center py-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="font-heading font-semibold text-lg text-foreground mb-1">Serviço concluído!</h2>
            <p className="text-sm text-muted-foreground">{activeRequest.service_type} · {selectedLocksmith?.name}</p>
          </div>

          {!activeRequest.client_confirmed ? (
            <div className="p-4 rounded-2xl border-2 border-primary bg-primary/5 space-y-3">
              <p className="text-sm font-medium text-foreground text-center">O chaveiro registrou a finalização do serviço. Confirme para prosseguir ao pagamento.</p>
              <div className="flex gap-2">
                <Button onClick={handleConfirmService} className="flex-1">
                  <CheckCircle2 className="w-4 h-4 mr-1.5" /> Confirmar serviço
                </Button>
                <Button variant="outline" onClick={() => navigate(`/acompanhamento/${activeRequest.id}`)} className="flex-1">
                  <MessageCircle className="w-4 h-4 mr-1.5" /> Falar com chaveiro
                </Button>
              </div>
            </div>
          ) : activeRequest.payment_method === "dinheiro" && !activeRequest.cash_received ? (
            <div className="flex flex-col items-center text-center py-6">
              <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mb-3">
                <Loader2 className="w-7 h-7 text-amber-600 animate-spin" />
              </div>
              <h3 className="font-heading font-semibold text-base text-foreground mb-1">
                Aguardando recebimento em dinheiro
              </h3>
              <p className="text-sm text-muted-foreground">
                O chaveiro irá confirmar o recebimento de <strong className="text-foreground">R$ {activeRequest.price?.toFixed(2)}</strong> em dinheiro.
              </p>
            </div>
          ) : activeRequest.payment_status === "paid" ? (
            <div className="flex flex-col items-center text-center py-6 space-y-4">
              <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mb-1">
                <Loader2 className="w-7 h-7 text-emerald-600 animate-spin" />
              </div>
              <div>
                <h3 className="font-heading font-semibold text-base text-foreground mb-1">
                  Pagamento confirmado!
                </h3>
                <p className="text-sm text-muted-foreground">
                  Aguardando o chaveiro finalizar o serviço.
                </p>
              </div>
              <div className="w-full max-w-xs">
                <ReceiptButton
                  serviceRequest={activeRequest}
                  locksmith={selectedLocksmith}
                  customerName={customerName}
                />
              </div>
            </div>
          ) : (
            <PaymentStep
              amount={activeRequest.price}
              description={`${activeRequest.service_type} - ${activeRequest.address}`}
              locksmithId={selectedLocksmith?.id}
              processing={paying}
              onConfirm={handleServicePayment}
              onBack={handleNewRequest}
            />
          )}
          <ErrorBanner message={searchError} />
        </div>
      )}

      {/* Step 7: Avaliação final (após o chaveiro finalizar o serviço) */}
      {step === 7 && activeRequest && activeRequest.status === "completed" && (
        <ReviewStep
          request={activeRequest}
          locksmith={selectedLocksmith}
          customerName={customerName}
          onRate={handleRate}
          onNewRequest={handleNewRequest}
        />
      )}

      {/* Tela de pagamento da taxa de cancelamento */}
      {cancelFeeData && activeRequest && !cancelConfirmOpen && (
        <div className="space-y-3 step-enter">
          <div className="flex flex-col items-center text-center py-4">
            <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mb-4">
              <AlertTriangle className="w-8 h-8 text-amber-600" />
            </div>
            <h2 className="font-heading font-semibold text-lg text-foreground mb-1">Taxa de cancelamento</h2>
            <p className="text-sm text-muted-foreground">
              O chaveiro já havia aceitado seu pedido. Pague a taxa de cancelamento para liberar novos pedidos.
            </p>
          </div>
          <DebtBlockNotice debt={debt} />
          <PaymentStep
            amount={cancelFeeData.fee}
            description={`Taxa de cancelamento - ${activeRequest.service_type}`}
            locksmithId={selectedLocksmith?.id}
            processing={paying}
            onConfirm={handleCancelFeePayment}
            onBack={handleNewRequest}
            onlineOnly
          />
          <ErrorBanner message={searchError} />
        </div>
      )}

      <CancelFeeConfirmDialog
        open={cancelConfirmOpen}
        onOpenChange={setCancelConfirmOpen}
        cancelFeeData={cancelFeeData}
        onConfirm={handleConfirmCancelWithFee}
        onBack={() => setCancelFeeData(null)}
      />
    </div>
  );
}