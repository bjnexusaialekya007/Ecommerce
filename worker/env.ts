// Worker bindings. D1/R2/secrets are added in later phases (W2+); W1 needs only vars.
export interface Env {
  ENVIRONMENT: 'local' | 'staging' | 'production';
  ASSETS?: { fetch(req: Request): Promise<Response> };
}
export type AppVars = { requestId: string };
export type AppEnv = { Bindings: Env; Variables: AppVars };
