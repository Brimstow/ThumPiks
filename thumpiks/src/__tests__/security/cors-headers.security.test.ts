import request from 'supertest'; import express from 'express'; import type { Request, Response } from 'express'; import { createServer } from 'http'; import * as fs from 'fs'; import * as path from 'path';
import { securityHeaders, sanitizeInput } from '../../middleware/security.middleware';
const ROOT = path.resolve(__dirname, '../../..');
describe('Security - CORS & Headers', () => {
  test('sets security headers', async () => { const app=express();app.use(securityHeaders);app.use(sanitizeInput);app.get('/t',(_r:Request,res:Response)=>res.json({ok:true})); const r=await request(createServer(app)).get('/t'); expect(r.headers['x-content-type-options']).toBe('nosniff'); expect(r.headers['strict-transport-security']).toBeTruthy(); expect(r.headers['content-security-policy']).toBeTruthy(); expect(r.headers['x-powered-by']).toBeUndefined(); });
  test('netlify COOP/COEP headers configured', () => { const c=fs.readFileSync(path.join(ROOT,'client','netlify.toml'),'utf-8'); expect(c).toContain('Cross-Origin-Opener-Policy = "same-origin"'); expect(c).toContain('Cross-Origin-Embedder-Policy = "credentialless"'); });
  test('CORS not wildcard', () => { const e=fs.readFileSync(path.join(ROOT,'.env.example'),'utf-8'); expect(e.split('\n').find(l=>l.startsWith('CORS_ORIGIN='))).not.toContain('"*"'); });
  test('HTTPS proxy targets', () => { const c=fs.readFileSync(path.join(ROOT,'client','netlify.toml'),'utf-8'); expect(c.substring(c.indexOf('[context.production.environment]'))).toContain('https://'); });
});
