import { createClientFromRequest } from 'npm:@base44/sdk@0.8.46';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const normalize = (value) => String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
    const parseBrl = (value) => {
      const cleaned = String(value || '').replace(/R\$/gi, '').trim();
      const parts = cleaned.match(/\d{1,3}(?:\.\d{3})*(?:,\d{1,2})|\d+(?:[.,]\d{1,2})?/g) || [];
      const values = parts.map((part) => {
        const normalized = part.includes(',') ? part.replace(/\./g, '').replace(',', '.') : part;
        return Number(normalized);
      }).filter((number) => Number.isFinite(number) && number > 0 && number <= 20000);
      return values.length ? Math.max(...values) : 0;
    };

    const body = await req.json().catch(() => ({}));
    const make = String(body.make || '').trim().slice(0, 80);
    const model = String(body.model || '').trim().slice(0, 100);
    const year = String(body.year || '').trim();
    const keyOnly = body.mode === 'key_only';
    if (!model || !/^\d{4}$/.test(year)) {
      return Response.json({ error: 'Modelo e ano válido são obrigatórios' }, { status: 400 });
    }

    const localOffers = [];
    if (make) {
      const catalog = await base44.asServiceRole.entities.VehicleKeyCatalog.filter({
        vehicle_type: 'carro', make, active: true,
      });
      const wanted = normalize(model);
      const selectedYear = Number(year);
      const rows = catalog.filter((row) =>
        (normalize(row.model).includes(wanted) || wanted.includes(normalize(row.model))) &&
        (!row.year_start || selectedYear >= row.year_start) &&
        (!row.year_end || selectedYear <= row.year_end)
      );
      for (const row of rows) {
        const evidence = normalize(`${row.key_type_detail || ''} ${row.quoted_product || ''} ${row.technical_notes || ''}`);
        const isOriginal = (evidence.includes('original') || evidence.includes('genuin') || evidence.includes(' oem ')) &&
          !evidence.includes('paralel') && !evidence.includes('universal') && !evidence.includes('compativel') && !evidence.includes('similar');
        if (!isOriginal) continue;
        const sources = [
          ['Mercado Livre', row.marketplace_price_ml, row.marketplace_url_ml],
          ['AliExpress', row.marketplace_price_aliexpress, row.marketplace_url_aliexpress],
          ['Shopee', row.marketplace_price_shopee, row.marketplace_url_shopee],
        ];
        for (const source of sources) {
          const price = parseBrl(source[1]);
          if (price > 0 && /^https?:\/\//.test(source[2] || '')) {
            localOffers.push({ source: source[0], category: 'arquivo_importado', price, url: source[2] });
          }
        }
      }
    }

    const vehicle = `${make} ${model}`.trim();
    const prompt = `Consulte fontes brasileiras atuais para o veículo ${vehicle}, ano ${year}.
${keyOnly ? 'Não pesquise FIPE.' : 'Informe o valor FIPE atual em BRL e se a chave usa chip, transponder ou imobilizador.'}
Localize preços de CHAVE ORIGINAL GENUÍNA/OEM completa em lojas especializadas em chaves automotivas, concessionárias e marketplaces verificados (Mercado Livre, Shopee ou AliExpress).
Aceite somente ofertas cujo título ou descrição comprove que a peça é original, genuína ou OEM e compatível com modelo e ano. Rejeite chave paralela, universal, compatível, similar, capa, carcaça, lâmina avulsa, controle sem chip, preço de programação, moeda estrangeira ou anúncio sem preço.
Retorne cada oferta aceita com fonte, categoria, preço em BRL, URL e original_confirmed=true. Não estime preços nem invente ofertas.`;
    const responseSchema = {
      type: 'object',
      properties: {
        fipe_value: { type: 'number' },
        has_coded_key: { type: 'boolean' },
        notes: { type: 'string' },
        original_key_offers: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              source: { type: 'string' },
              category: { type: 'string' },
              price_brl: { type: 'number' },
              url: { type: 'string' },
              original_confirmed: { type: 'boolean' },
            },
            required: ['source', 'category', 'price_brl', 'url', 'original_confirmed'],
          },
        },
      },
      required: keyOnly ? ['original_key_offers'] : ['fipe_value', 'has_coded_key', 'original_key_offers'],
    };
    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: true,
      model: 'gemini_3_flash',
      response_json_schema: responseSchema,
    });

    const webOffers = (result.original_key_offers || []).filter((offer) =>
      offer.original_confirmed === true &&
      Number(offer.price_brl) > 0 &&
      Number(offer.price_brl) <= 20000 &&
      /^https?:\/\//.test(offer.url || '')
    ).map((offer) => ({
      source: offer.source,
      category: offer.category,
      price: Number(offer.price_brl),
      url: offer.url,
    }));
    const offers = [...localOffers, ...webOffers].sort((a, b) => b.price - a.price);
    const highest = offers[0] || null;
    const fallbackUsed = !highest;

    return Response.json({
      fipe_value: result.fipe_value,
      has_coded_key: result.has_coded_key === true,
      key_value: fallbackUsed ? 250 : highest.price,
      key_value_trusted: !fallbackUsed,
      key_value_fallback: fallbackUsed,
      key_value_source: fallbackUsed ? 'Valor padrão sem preço original confirmado' : highest.source,
      original_key_offers: offers,
      notes: result.notes || '',
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}