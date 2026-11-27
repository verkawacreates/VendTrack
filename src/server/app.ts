import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import {
  claimFirstRunOperator,
  getAuthStatus,
  requireAuth,
  verifyOperatorLogin,
} from './auth.ts';
import { VENDTRACK_MYSQL_DDL } from './schemaSql.ts';
import {
  buildCsvReport,
  createCategory,
  createEmployee,
  createLocation,
  createMachine,
  createMaintenanceRequest,
  createProduct,
  createSupplier,
  DomainRuleError,
  getDashboardSnapshot,
  recordRestock,
  recordSale,
  resetDatabaseState,
  updateMachineStatus,
  updateMaintenanceTicket,
  updateProductPrice,
  upsertMachineSlot,
  deleteLocation,
} from './store.ts';

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '1mb' }));

  // Health & Auth Status (public)
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ ok: true, runtime: 'node.js', nodeVersion: process.version });
  });

  app.get('/api/auth/status', (req: Request, res: Response) => {
    res.json(getAuthStatus(req));
  });

  app.post('/api/auth/setup', (req: Request, res: Response) => {
    const { email, password } = req.body ?? {};
    const result = claimFirstRunOperator(String(email ?? ''), String(password ?? ''));
    if (!result.ok) {
      res.status(result.status).json({ error: result.error });
      return;
    }
    res.status(201).json({ token: result.token, operator: result.operator });
  });

  app.post('/api/auth/login', (req: Request, res: Response) => {
    const { identifier, password, remember } = req.body ?? {};
    const result = verifyOperatorLogin(
      String(identifier ?? ''),
      String(password ?? ''),
      Boolean(remember)
    );
    if (!result.ok) {
      res.status(result.status).json({ error: result.error });
      return;
    }
    res.json({ token: result.token, operator: result.operator });
  });

  // All data and operational routes require verified Bearer session
  app.use('/api', (req: Request, res: Response, next: NextFunction) => {
    if (
      req.path === '/health' ||
      req.path === '/auth/status' ||
      req.path === '/auth/setup' ||
      req.path === '/auth/login'
    ) {
      next();
      return;
    }
    requireAuth(req, res, next);
  });

  app.get('/api/dashboard', (_req: Request, res: Response) => {
    res.json(getDashboardSnapshot());
  });

  app.post('/api/reset', (_req: Request, res: Response) => {
    res.json(resetDatabaseState());
  });

  app.get('/api/schema.sql', (_req: Request, res: Response) => {
    res.setHeader('Content-Type', 'application/sql; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="vendtrack_schema.sql"');
    res.send(VENDTRACK_MYSQL_DDL);
  });

  app.get('/api/export/:type', (req: Request, res: Response, next: NextFunction) => {
    try {
      const reportType = String(req.params.type ?? '').replace(/\.csv$/i, '');
      const { filename, csv } = buildCsvReport(reportType);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(csv);
    } catch (err) {
      next(err);
    }
  });

  // Locations
  app.post('/api/locations', (req: Request, res: Response, next: NextFunction) => {
    try {
      const loc = createLocation(req.body ?? {});
      res.status(201).json(loc);
    } catch (err) {
      next(err);
    }
  });

  app.delete('/api/locations/:id', (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id)) throw new DomainRuleError('Invalid location ID.', 400);
      deleteLocation(id);
      res.json({ deleted: true });
    } catch (err) {
      next(err);
    }
  });

  // Machines & Slots
  app.post('/api/machines', (req: Request, res: Response, next: NextFunction) => {
    try {
      const machine = createMachine(req.body ?? {});
      res.status(201).json(machine);
    } catch (err) {
      next(err);
    }
  });

  app.patch('/api/machines/:id/status', (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id)) throw new DomainRuleError('Invalid machine ID.', 400);
      const updated = updateMachineStatus(id, req.body?.machine_status);
      res.json(updated);
    } catch (err) {
      next(err);
    }
  });

  app.put('/api/machines/:id/slots', (req: Request, res: Response, next: NextFunction) => {
    try {
      const machine_id = Number(req.params.id);
      if (!Number.isInteger(machine_id)) throw new DomainRuleError('Invalid machine ID.', 400);
      const slot = upsertMachineSlot({
        machine_id,
        slot_no: req.body?.slot_no,
        product_id: req.body?.product_id,
        quantity: req.body?.quantity,
        max_capacity: req.body?.max_capacity,
      });
      res.json(slot);
    } catch (err) {
      next(err);
    }
  });

  // Categories, Suppliers, Products
  app.post('/api/categories', (req: Request, res: Response, next: NextFunction) => {
    try {
      const cat = createCategory(req.body ?? {});
      res.status(201).json(cat);
    } catch (err) {
      next(err);
    }
  });

  app.post('/api/suppliers', (req: Request, res: Response, next: NextFunction) => {
    try {
      const sup = createSupplier(req.body ?? {});
      res.status(201).json(sup);
    } catch (err) {
      next(err);
    }
  });

  app.post('/api/products', (req: Request, res: Response, next: NextFunction) => {
    try {
      const prod = createProduct(req.body ?? {});
      res.status(201).json(prod);
    } catch (err) {
      next(err);
    }
  });

  app.patch('/api/products/:id/price', (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id)) throw new DomainRuleError('Invalid product ID.', 400);
      const updated = updateProductPrice(id, Number(req.body?.unit_cost), Number(req.body?.unit_price));
      res.json(updated);
    } catch (err) {
      next(err);
    }
  });

  // Employees
  app.post('/api/employees', (req: Request, res: Response, next: NextFunction) => {
    try {
      const emp = createEmployee(req.body ?? {});
      res.status(201).json(emp);
    } catch (err) {
      next(err);
    }
  });

  // Sales (BR6-BR9, BR14)
  app.post('/api/sales', (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = recordSale(req.body ?? {});
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  });

  // Restocks (BR10, BR3)
  app.post('/api/restocks', (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = recordRestock(req.body ?? {});
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  });

  // Maintenance (BR12, BR13)
  app.post('/api/maintenance', (req: Request, res: Response, next: NextFunction) => {
    try {
      const ticket = createMaintenanceRequest(req.body ?? {});
      res.status(201).json(ticket);
    } catch (err) {
      next(err);
    }
  });

  app.patch('/api/maintenance/:id', (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id)) throw new DomainRuleError('Invalid maintenance ticket ID.', 400);
      const updated = updateMaintenanceTicket(id, req.body ?? {});
      res.json(updated);
    } catch (err) {
      next(err);
    }
  });

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof DomainRuleError) {
      res.status(err.status).json({ error: err.message, rule: err.rule });
      return;
    }
    res.status(500).json({ error: 'Unexpected server error.' });
  });

  return app;
}
