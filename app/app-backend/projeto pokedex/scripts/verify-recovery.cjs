// SMTP local com TLS e banco descartável. Nunca envia mensagens para contas reais.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const tls = require('node:tls');
const { createHash } = require('node:crypto');
const { NestFactory } = require('@nestjs/core');
const { ValidationPipe } = require('@nestjs/common');
const request = require('supertest');
const { AppModule } = require('../dist/src/app.module');
const { PrismaService } = require('../dist/src/database/prisma.service');
if (process.env.DATABASE_URL !== 'file:./.verification/test.db') throw new Error('Use exclusivamente o banco descartável .verification/test.db.');
const out = path.resolve(__dirname, '../../../../docs/recuperacao');
const messages = [];
let rejectMail = false;
const smtp = tls.createServer({ key: fs.readFileSync(path.resolve(__dirname, '../.verification/smtp-key.pem')), cert: fs.readFileSync(path.resolve(__dirname, '../.verification/smtp-cert.pem')) }, socket => {
  let buffer = '', data = false, body = '', recipient = '';
  socket.on('error', () => {});
  socket.write('220 localhost test SMTP\r\n');
  socket.on('data', chunk => {
    buffer += chunk.toString();
    while (buffer.includes('\r\n')) {
      const end = buffer.indexOf('\r\n'), line = buffer.slice(0, end); buffer = buffer.slice(end + 2);
      if (data) {
        if (line === '.') { data = false; messages.push({ recipient, body }); body = ''; socket.write('250 accepted\r\n'); }
        else body += line + '\r\n';
      } else if (/^EHLO|^HELO/.test(line)) socket.write('250-localhost\r\n250-AUTH PLAIN\r\n250 8BITMIME\r\n');
      else if (/^AUTH PLAIN /.test(line)) {
        const credentials = Buffer.from(line.slice(11), 'base64').toString().split('\0');
        assert.equal(credentials[1], process.env.SMTP_USER); assert.equal(credentials[2], process.env.SMTP_PASS);
        socket.write('235 authenticated\r\n');
      } else if (/^MAIL FROM:/.test(line)) { if (rejectMail) { rejectMail = false; socket.write('550 rejected for test\r\n'); } else socket.write('250 sender ok\r\n'); }
      else if (/^RCPT TO:/.test(line)) { recipient = line.slice(8).replace(/[<>]/g, '').trim(); socket.write('250 recipient ok\r\n'); }
      else if (line === 'DATA') { data = true; socket.write('354 send data\r\n'); }
      else if (line === 'QUIT') socket.end('221 bye\r\n');
      else socket.write('250 ok\r\n');
    }
  });
});
function tokenFrom(message) {
  let text = message.body;
  if (/Content-Transfer-Encoding: base64/i.test(text)) text = Buffer.from(text.slice(text.indexOf('\r\n\r\n') + 4).replace(/\s/g, ''), 'base64').toString();
  else text = text.replace(/=\r\n/g, '').replace(/=([0-9A-F]{2})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
  const token = text.match(/#token=([a-f0-9]{64})/)?.[1]; assert.ok(token, 'Link de uso único ausente do e-mail'); return token;
}
async function until(predicate) { for (let i = 0; i < 100; i++) { if (await predicate()) return; await new Promise(resolve => setTimeout(resolve, 50)); } throw new Error('Tempo de espera do SMTP local excedido'); }
async function createApp() {
  const app = await NestFactory.create(AppModule, { logger: false, abortOnError: false });
  app.setGlobalPrefix('api'); app.enableCors({ origin: 'http://localhost:3001', credentials: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  await app.init(); return app;
}
(async () => {
  fs.mkdirSync(out, { recursive: true });
  await new Promise(resolve => smtp.listen(0, '127.0.0.1', resolve));
  Object.assign(process.env, { SMTP_HOST: '127.0.0.1', SMTP_PORT: String(smtp.address().port), SMTP_SECURE: 'true', SMTP_USER: 'smtp-test-user', SMTP_PASS: 'smtp-test-password', SMTP_FROM: 'project@example.test', PASSWORD_RESET_URL: 'http://localhost:3001/redefinir-senha' });
  let app = await createApp(); let browser;
  try {
    const api = request(app.getHttpServer()), db = app.get(PrismaService), suffix = Date.now();
    const oldPassword = 'Original-test-123', newPassword = 'Recovered-test-456';
    const register = async name => (await api.post('/api/auth/register').send({ name, email: `${name}${suffix}@example.test`, password: oldPassword }).expect(201)).body;
    const a = await register('RecoveryA'), b = await register('RecoveryB'), c = await register('RecoveryC');
    const auth = token => ({ Authorization: `Bearer ${token}` });
    const email = a.user.email;
    await api.post('/api/auth/forgot-password').send({ email: 'invalid' }).expect(400);
    await api.post('/api/auth/forgot-password').set('Origin', 'https://attacker.invalid').send({ email }).expect(403);
    const accepted = (await api.post('/api/auth/forgot-password').send({ email }).expect(202)).body;
    await until(() => messages.length === 1); const token = tokenFrom(messages[0]);
    assert.equal(messages[0].recipient, email.toLowerCase()); assert.match(messages[0].body, /From: project@example.test/);
    const saved = await db.passwordResetToken.findUnique({ where: { tokenHash: createHash('sha256').update(token).digest('hex') } });
    assert.ok(saved); assert.notEqual(saved.tokenHash, token); assert.ok(saved.expiresAt - saved.createdAt <= 15 * 60000 + 1000);
    await api.post('/api/auth/forgot-password').send({ email }).expect(429);
    const unknown = (await api.post('/api/auth/forgot-password').send({ email: `missing${suffix}@example.test` }).expect(202)).body;
    assert.deepEqual(accepted, unknown); assert.equal(messages.length, 1);
    rejectMail = true; await api.post('/api/auth/forgot-password').send({ email: b.user.email }).expect(202);
    await until(async () => await db.passwordResetToken.count({ where: { userId: b.user.sub } }) === 0);
    await api.post('/api/auth/forgot-password').send({ email: c.user.email }).expect(202);
    await until(() => messages.length === 2); const expiredToken = tokenFrom(messages[1]);
    const expiredHash = createHash('sha256').update(expiredToken).digest('hex');
    await db.passwordResetToken.update({ where: { tokenHash: expiredHash }, data: { expiresAt: new Date(Date.now() - 1000) } });
    await api.post('/api/auth/reset-password').send({ token: expiredToken, password: newPassword }).expect(400);
    await api.post('/api/auth/reset-password').send({ token: '0'.repeat(64), password: newPassword }).expect(400);
    await api.post('/api/auth/reset-password').send({ token, password: 'short' }).expect(400);
    await api.post('/api/auth/reset-password').send({ token, password: '😀'.repeat(40) }).expect(400);
    await api.post('/api/auth/reset-password').send({ token, password: newPassword }).expect(200);
    await api.post('/api/auth/reset-password').send({ token, password: newPassword }).expect(400);
    await api.get('/api/profiles/me').set(auth(a.access_token)).expect(401);
    await api.post('/api/auth/login').send({ email, password: oldPassword }).expect(401);
    const fresh = (await api.post('/api/auth/login').send({ email, password: newPassword }).expect(201)).body;
    await api.get('/api/profiles/me').set(auth(fresh.access_token)).expect(200);
    await db.passwordResetToken.update({ where: { tokenHash: expiredHash }, data: { expiresAt: new Date(Date.now() + 60000) } });
    const concurrent = await Promise.all([api.post('/api/auth/reset-password').send({ token: expiredToken, password: newPassword }), api.post('/api/auth/reset-password').send({ token: expiredToken, password: newPassword })]);
    assert.deepEqual(concurrent.map(r => r.status).sort(), [200, 400]);
    assert.equal((await db.user.findUnique({ where: { id: c.user.sub } })).sessionVersion, 1);
    await api.post('/api/auth/forgot-password').send({ email: `other${suffix}@example.test` }).expect(429);
    const originalFrom = process.env.SMTP_FROM; delete process.env.SMTP_FROM;
    // A configuração é exercitada diretamente porque este IP já atingiu o limite HTTP.
    const { ResetMailService } = require('../dist/src/auth/reset-mail.service'); assert.throws(() => app.get(ResetMailService).configuration()); process.env.SMTP_FROM = originalFrom;
    console.log('PASS RECOVERY API: SMTP TLS local, hash, expiração, uso único, concorrência, senha anterior e sessões revogadas, resposta genérica, limites e falha SMTP.');
    if (process.argv.includes('--browser')) {
      await app.close(); app = await createApp(); await app.listen(3000, '127.0.0.1');
      const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/Prefeitura/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
      browser = await chromium.launch({ channel: 'chrome', headless: true });
      const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } }); const errors = []; page.on('pageerror', error => errors.push(error.message));
      const uiEmail = `recovery-ui${suffix}@example.test`;
      assert.equal((await page.request.post('http://localhost:3000/api/auth/register', { data: { name: 'Treinador Recuperação', email: uiEmail, password: oldPassword } })).status(), 201);
      await page.goto('http://localhost:3001/login'); await page.getByRole('link', { name: 'Esqueci minha senha' }).click();
      await page.getByLabel('E-mail', { exact: true }).fill(uiEmail); await page.getByRole('button', { name: 'Enviar instruções' }).click();
      await page.getByRole('status').filter({ hasText: 'Se o e-mail estiver cadastrado' }).waitFor(); await until(() => messages.length === 3);
      await page.screenshot({ path: path.join(out, 'solicitacao-desktop.png'), fullPage: true });
      const uiToken = tokenFrom(messages[2]); await page.goto(`http://localhost:3001/redefinir-senha#token=${uiToken}`);
      await page.getByLabel('Nova senha', { exact: true }).fill(newPassword); await page.getByLabel('Confirmar nova senha', { exact: true }).fill('different-password');
      await page.getByRole('button', { name: 'Salvar nova senha' }).click(); await page.getByRole('alert').filter({ hasText: 'As senhas devem ser iguais.' }).waitFor();
      assert.equal(new URL(page.url()).hash, ''); await page.screenshot({ path: path.join(out, 'redefinicao-desktop.png'), fullPage: true });
      await page.setViewportSize({ width: 390, height: 844 }); await page.screenshot({ path: path.join(out, 'redefinicao-mobile.png'), fullPage: true });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
      await page.getByLabel('Confirmar nova senha', { exact: true }).fill(newPassword); await page.getByRole('button', { name: 'Salvar nova senha' }).click(); await page.getByRole('status').filter({ hasText: 'Senha redefinida com sucesso' }).waitFor();
      await page.getByRole('link', { name: 'Voltar para entrar', exact: true }).last().click(); await page.getByLabel('E-mail', { exact: true }).fill(uiEmail); await page.getByLabel('Senha', { exact: true }).fill(newPassword); await page.getByRole('button', { name: 'Entrar na jornada', exact: false }).click(); await page.waitForURL('**/dashboard');
      await page.goto(`http://localhost:3001/redefinir-senha#token=${uiToken}`); await page.getByLabel('Nova senha', { exact: true }).fill(newPassword); await page.getByLabel('Confirmar nova senha', { exact: true }).fill(newPassword); await page.getByRole('button', { name: 'Salvar nova senha' }).click(); await page.getByRole('alert').filter({ hasText: 'Link inválido ou expirado' }).waitFor();
      await page.getByRole('link', { name: 'Solicitar outro link' }).click(); await page.getByRole('heading', { name: 'Recuperar senha', exact: true }).waitFor(); assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false); await page.screenshot({ path: path.join(out, 'solicitacao-mobile.png'), fullPage: true });
      assert.deepEqual(errors, []); console.log('PASS RECOVERY UI: solicitação, confirmação, redefinição, login e rejeição de reutilização; desktop/mobile sem pageerror.');
    }
    fs.writeFileSync(path.join(out, 'recovery-results.json'), JSON.stringify({ api: 'passed', smtp: 'local TLS with trusted test certificate; Gmail delivery not verified', browser: process.argv.includes('--browser') ? 'passed' : 'not executed', originalDatabaseUsed: false }, null, 2));
  } finally { if (browser) await browser.close(); await app.close(); await new Promise(resolve => smtp.close(resolve)); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
