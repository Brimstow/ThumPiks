const mockPrisma = { user: { findUnique: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn() }, subscription: { findFirst: jest.fn(), create: jest.fn() }, userSession: { update: jest.fn() } };
jest.mock('@prisma/client', () => ({ PrismaClient: jest.fn(() => mockPrisma) }));
jest.mock('../../utils/logger', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), security: jest.fn() } }));
jest.mock('../../modules/email/email.service', () => ({ EmailService: { sendVerificationEmail: jest.fn() } }));
jest.mock('../../utils/username.utils', () => ({ UsernameUtils: { validateUsername: jest.fn().mockResolvedValue({ valid: true }) } }));
jest.mock('../../utils/password.utils', () => ({ PasswordUtils: { validate: jest.fn().mockReturnValue({ valid: true, errors: [] }) } }));
import { AuthService } from '../../modules/auth/auth.service';
import { terminateSession } from '../../modules/security/security.service';
describe('Security - Session Management', () => {
  const origEnv = process.env;
  beforeEach(() => { jest.clearAllMocks(); process.env = { ...origEnv }; });
  afterAll(() => { process.env = origEnv; });
  test('DEMO_MODE bypass blocked when unset', async () => { delete process.env.DEMO_MODE; mockPrisma.user.findUnique.mockResolvedValue(null); mockPrisma.user.findFirst.mockResolvedValue(null); await expect(new AuthService().login('test@example.com','Test123!')).rejects.toThrow(); });
  test('DEMO_MODE bypass blocked when false', async () => { process.env.DEMO_MODE='false'; mockPrisma.user.findUnique.mockResolvedValue(null); mockPrisma.user.findFirst.mockResolvedValue(null); await expect(new AuthService().login('test@example.com','Test123!')).rejects.toThrow(); });
  test('session termination marks inactive', async () => { mockPrisma.userSession.update.mockResolvedValue({id:'s1',isActive:false}); await terminateSession('s1'); expect(mockPrisma.userSession.update).toHaveBeenCalledWith({ where:{id:'s1'}, data: expect.objectContaining({isActive:false}) }); });
  test('session termination throws on failure', async () => { mockPrisma.userSession.update.mockRejectedValue(new Error('fail')); await expect(terminateSession('bad')).rejects.toThrow('Failed to terminate session'); });
});
