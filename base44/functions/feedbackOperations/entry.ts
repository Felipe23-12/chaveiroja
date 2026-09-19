import { createClientFromRequest } from 'npm:@base44/sdk@0.8.48';

const hasLink = (text) => /(?:[a-z][a-z0-9+.-]*:\/\/|www\.|mailto:|\b(?:[a-z0-9-]+\.)+[a-z]{2,63}\b)/i.test(text.normalize('NFKC').replace(/[\u200B-\u200D\uFEFF]/g, ''));

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Não autorizado.' }, { status: 401 });
    const body = await req.json();

    if (body.action === 'client_error') {
      const message = String(body.message || 'Erro desconhecido').slice(0, 500);
      const stack = String(body.stack || '').slice(0, 1000);
      const componentStack = String(body.component_stack || '').slice(0, 1000);
      const path = String(body.path || '/').slice(0, 300);
      const feedback = await base44.asServiceRole.entities.AppFeedback.create({
        category: 'bug',
        subject: 'Falha automática na interface',
        message: [`Rota: ${path}`, `Erro: ${message}`, `Stack: ${stack}`, `Componentes: ${componentStack}`].join('\n'),
        photo_uris: [],
        reporter_id: user.id,
        reporter_name: user.full_name || '',
        reporter_email: user.email || '',
      });
      return Response.json({ id: feedback.id });
    }

    if (body.action === 'submit') {
      const category = String(body.category || '');
      const subject = String(body.subject || '').trim();
      const message = String(body.message || '').trim();
      const photoUris = Array.isArray(body.photo_uris) ? body.photo_uris : [];
      if (!['suggestion', 'experience', 'bug'].includes(category)) return Response.json({ error: 'Tipo de relato inválido.' }, { status: 400 });
      if (!subject || subject.length > 120 || !message || message.length > 3000) return Response.json({ error: 'Preencha o assunto e a descrição nos limites indicados.' }, { status: 400 });
      if (hasLink(subject) || hasLink(message)) return Response.json({ error: 'Links não são permitidos nos relatos.' }, { status: 400 });
      if ((body.photo_uris !== undefined && !Array.isArray(body.photo_uris)) || photoUris.length > 3 || photoUris.some((uri) => typeof uri !== 'string' || uri.length > 1000 || !/^private\/.+\.(jpe?g|png|webp)$/i.test(uri) || uri.includes('..') || uri.includes('://'))) return Response.json({ error: 'Envie no máximo 3 fotos válidas.' }, { status: 400 });
      const feedback = await base44.asServiceRole.entities.AppFeedback.create({ category, subject, message, photo_uris: photoUris, reporter_id: user.id, reporter_name: user.full_name || '', reporter_email: user.email || '' });
      return Response.json({ id: feedback.id });
    }

    if (body.action === 'list') {
      if (user.role !== 'admin') return Response.json({ error: 'Acesso restrito ao administrador.' }, { status: 403 });
      const page = Number(body.page || 0);
      if (!Number.isInteger(page) || page < 0 || page > 1000) return Response.json({ error: 'Página inválida.' }, { status: 400 });
      const records = await base44.entities.AppFeedback.list('-created_date', 21, page * 20);
      const items = await Promise.all(records.map(async (record) => {
        const photo_urls = await Promise.all((record.photo_uris || []).slice(0, 3).map(async (file_uri) => {
          const result = await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({ file_uri, expires_in: 900 });
          return result.signed_url;
        }));
        return { id: record.id, created_by_id: record.created_by_id, category: record.category, subject: record.subject, message: record.message, reporter_id: record.reporter_id, reporter_name: record.reporter_name, reporter_email: record.reporter_email, created_date: record.created_date, photo_urls };
      }));
      return Response.json({ items });
    }

    return Response.json({ error: 'Ação inválida.' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error?.message || 'Não foi possível processar o relato.' }, { status: 500 });
  }
}