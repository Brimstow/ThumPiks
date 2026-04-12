import request from 'supertest'; import express from 'express'; import type { Request, Response, NextFunction } from 'express'; import { createServer } from 'http';
jest.mock('../../utils/logger', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), security: jest.fn() } }));
function auth(uid:string|null,role='user'){return(req:Request,_r:Response,next:NextFunction)=>{if(uid)(req as any).user={id:uid,role};next();};}
function adminOnly(req:Request,res:Response,next:NextFunction){const u=(req as any).user;if(!u){res.status(401).json({error:'Auth required'});return;}if(u.role!=='admin'){res.status(403).json({error:'Admin access required'});return;}next();}
describe('Security - Authorization', () => {
  test('rejects unauthed admin access', async () => { const app=express();app.use(auth(null));app.get('/admin',adminOnly,(_r:Request,res:Response)=>res.json([])); expect((await request(createServer(app)).get('/admin')).status).toBe(401); });
  test('rejects non-admin users', async () => { const app=express();app.use(auth('u1','user'));app.get('/admin',adminOnly,(_r:Request,res:Response)=>res.json([])); expect((await request(createServer(app)).get('/admin')).status).toBe(403); });
  test('allows admin users', async () => { const app=express();app.use(auth('a1','admin'));app.get('/admin',adminOnly,(_r:Request,res:Response)=>res.json([])); expect((await request(createServer(app)).get('/admin')).status).toBe(200); });
  test('blocks access to other users resources', async () => { const app=express();app.use(auth('alice','user'));const owners:Record<string,string>={t1:'alice',t2:'bob'};app.get('/t/:id',(req:Request,res:Response)=>{const o=owners[req.params.id];if(!o){res.status(404).json({});return;}if(o!==(req as any).user.id){res.status(403).json({error:'denied'});return;}res.json({ok:true});}); const s=createServer(app); expect((await request(s).get('/t/t1')).status).toBe(200); expect((await request(s).get('/t/t2')).status).toBe(403); });
});
