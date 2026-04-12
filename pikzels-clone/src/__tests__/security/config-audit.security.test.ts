import * as fs from 'fs'; import * as path from 'path';
const ROOT = path.resolve(__dirname, '../../..');
describe('Security - Config Audit', () => {
  let env: string;
  beforeAll(() => { env = fs.readFileSync(path.join(ROOT, '.env.example'), 'utf-8'); });
  test('no real API keys', () => { [/sk_live_\w{20,}/, /pk_live_\w{20,}/, /whsec_\w{20,}/].forEach(p => expect(env).not.toMatch(p)); });
  test('CHANGE_ME placeholders for secrets', () => { expect(env.split('\n').find(l=>l.startsWith('JWT_SECRET='))).toContain('CHANGE_ME'); expect(env.split('\n').find(l=>l.startsWith('ENCRYPTION_KEY='))).toContain('CHANGE_ME'); });
  test('SEED_TEST_USERS defaults false', () => { expect(env.split('\n').find(l=>l.startsWith('SEED_TEST_USERS='))).toContain('false'); });
  test('DEMO_MODE not in env example', () => { expect(env.split('\n').find(l=>l.startsWith('DEMO_MODE='))).toBeUndefined(); });
  test('security features enabled', () => { expect(env).toContain('ENABLE_RATE_LIMITING="true"'); expect(env).toContain('ENABLE_SECURITY_HEADERS="true"'); expect(env).toContain('COOKIE_HTTP_ONLY="true"'); expect(env).toContain('COOKIE_SAME_SITE="strict"'); });
  test('file upload restrictions', () => { expect(env).toContain('ALLOWED_FILE_TYPES="image/jpeg,image/png,image/webp"'); expect(env).toContain('MAX_FILE_SIZE="10485760"'); });
  test('no server secrets in client code', () => { const d=path.join(ROOT,'client','src'); const vars=['JWT_SECRET','DATABASE_URL','STRIPE_SECRET_KEY','SESSION_SECRET']; const v:string[]=[]; function scan(dir:string){if(!fs.existsSync(dir))return;for(const e of fs.readdirSync(dir,{withFileTypes:true})){const fp=path.join(dir,e.name);if(e.isDirectory()&&e.name!=='node_modules'&&!e.name.startsWith('.'))scan(fp);else if(e.isFile()&&/\.(ts|tsx)$/.test(e.name)){const c=fs.readFileSync(fp,'utf-8');for(const k of vars)if(c.includes('process.env.'+k))v.push(fp+':'+k);}}} scan(d); expect(v).toEqual([]); });
  test('TEST_CREDENTIALS uses example.com only', () => { const c=fs.readFileSync(path.join(ROOT,'TEST_CREDENTIALS.md'),'utf-8'); const emails=c.match(/[\w.+-]+@[\w.-]+\.\w{2,}/g); if(emails)emails.forEach(e=>expect(e).toMatch(/@example\.com$/)); });
});
