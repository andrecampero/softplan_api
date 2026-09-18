import { randomBytes } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppError } from '../../domain/shared/errors.js';
import { JoseTokenService } from './jose-token-service.js';

const UMA_HORA = 3600;
const segredo = () => randomBytes(48).toString('base64');
const claims = { sub: 'u1', tenantId: 'tenant-a', perfil: 'admin' } as const;

async function codigoDoErro(promessa: Promise<unknown>): Promise<string | undefined> {
  const erro = await promessa.catch((e: unknown) => e);
  return erro instanceof AppError ? erro.code : undefined;
}

describe('JoseTokenService', () => {
  afterEach(() => vi.useRealTimers());

  it('emite token que expira em exatamente 1 hora e devolve os claims ao verificar', async () => {
    const service = new JoseTokenService(segredo(), UMA_HORA);

    const { accessToken, expiresIn } = await service.emitir(claims);
    const [, payload] = accessToken.split('.');
    const { iat, exp } = JSON.parse(Buffer.from(payload ?? '', 'base64url').toString()) as { iat: number; exp: number };

    expect(expiresIn).toBe(3600);
    expect(exp - iat).toBe(3600);
    await expect(service.verificar(accessToken)).resolves.toEqual(claims);
  });

  it('continua válido um segundo antes de completar 1 hora', async () => {
    vi.useFakeTimers({ now: new Date('2026-09-18T12:00:00Z') });
    const service = new JoseTokenService(segredo(), UMA_HORA);
    const { accessToken } = await service.emitir(claims);

    vi.setSystemTime(new Date('2026-09-18T12:59:59Z'));

    await expect(service.verificar(accessToken)).resolves.toEqual(claims);
  });

  it('rejeita com TOKEN_EXPIRADO depois de 1 hora', async () => {
    vi.useFakeTimers({ now: new Date('2026-09-18T12:00:00Z') });
    const service = new JoseTokenService(segredo(), UMA_HORA);
    const { accessToken } = await service.emitir(claims);

    vi.setSystemTime(new Date('2026-09-18T13:00:01Z'));

    expect(await codigoDoErro(service.verificar(accessToken))).toBe('TOKEN_EXPIRADO');
  });

  it('rejeita com TOKEN_INVALIDO um token assinado com outro segredo', async () => {
    const { accessToken } = await new JoseTokenService(segredo(), UMA_HORA).emitir(claims);

    expect(await codigoDoErro(new JoseTokenService(segredo(), UMA_HORA).verificar(accessToken))).toBe('TOKEN_INVALIDO');
  });

  it('rejeita com TOKEN_INVALIDO um token malformado', async () => {
    expect(await codigoDoErro(new JoseTokenService(segredo(), UMA_HORA).verificar('nao-e-um-jwt'))).toBe('TOKEN_INVALIDO');
  });
});
