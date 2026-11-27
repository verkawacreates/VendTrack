import fs from 'node:fs';
import path from 'node:path';
import type {
  Category,
  DashboardSnapshot,
  Employee,
  EmployeeRole,
  Location,
  Machine,
  MachineSlot,
  MachineSlotView,
  MachineStatus,
  MachineType,
  Maintenance,
  MaintenanceStatus,
  PaymentMethod,
  Product,
  Restock,
  RestockItem,
  Sale,
  SaleItem,
  Supplier,
} from '../types/vendtrack.ts';
import { createSeedState, type VendTrackDatabaseState } from './seedData.ts';

const STATE_FILE = path.join('/tmp', 'vendtrack-db-state.json');

export class DomainRuleError extends Error {
  status: number;
  rule?: string;
  constructor(message: string, status = 400, rule?: string) {
    super(message);
    this.status = status;
    this.rule = rule;
  }
}

let dbState: VendTrackDatabaseState = loadState();

function loadState(): VendTrackDatabaseState {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')) as VendTrackDatabaseState;
      if (parsed && Array.isArray(parsed.locations) && Array.isArray(parsed.machines)) {
        return parsed;
      }
    }
  } catch {
    // Fallback to seed state
  }
  return createSeedState();
}

function persistState(): void {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(dbState), 'utf8');
  } catch {
    // Ignore on read-only FS
  }
}

export function resetDatabaseState(): DashboardSnapshot {
  dbState = createSeedState();
  persistState();
  return getDashboardSnapshot();
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function isLowStock(slot: Pick<MachineSlot, 'quantity' | 'max_capacity'>): boolean {
  if (slot.max_capacity <= 0) return true;
  return slot.quantity <= slot.max_capacity * 0.2;
}

export function getDashboardSnapshot(): DashboardSnapshot {
  const locMap = new Map(dbState.locations.map((l) => [l.location_id, l]));
  const catMap = new Map(dbState.categories.map((c) => [c.category_id, c]));
  const prodMap = new Map(dbState.products.map((p) => [p.product_id, p]));
  const machineMap = new Map(dbState.machines.map((m) => [m.machine_id, m]));

  // Sales per machine & per product
  const machineRevMap = new Map<number, { transactions: number; units_sold: number; revenue: number }>();
  const productRevMap = new Map<number, { units_sold: number; revenue: number; margin_estimate: number }>();
  const paymentMap = new Map<PaymentMethod, { transactions: number; revenue: number }>([
    ['Cash', { transactions: 0, revenue: 0 }],
    ['Coin', { transactions: 0, revenue: 0 }],
    ['GCash', { transactions: 0, revenue: 0 }],
    ['Card', { transactions: 0, revenue: 0 }],
  ]);
  const siteProductMap = new Map<string, { location_id: number; site_name: string; product_name: string; units_sold: number; revenue: number }>();

  const saleItemsBySale = new Map<number, SaleItem[]>();
  for (const item of dbState.sale_items) {
    const arr = saleItemsBySale.get(item.sale_id) ?? [];
    arr.push(item);
    saleItemsBySale.set(item.sale_id, arr);
  }

  let totalRevenue = 0;

  for (const sale of dbState.sales) {
    const items = saleItemsBySale.get(sale.sale_id) ?? [];
    const machine = machineMap.get(sale.machine_id);
    const location = machine ? locMap.get(machine.location_id) : undefined;
    let saleTotal = 0;
    let saleUnits = 0;

    for (const item of items) {
      const lineTotal = round2(item.quantity * item.unit_price_at_sale);
      saleTotal = round2(saleTotal + lineTotal);
      saleUnits += item.quantity;

      const prod = prodMap.get(item.product_id);
      const prevP = productRevMap.get(item.product_id) ?? { units_sold: 0, revenue: 0, margin_estimate: 0 };
      const unitCost = prod ? prod.unit_cost : 0;
      productRevMap.set(item.product_id, {
        units_sold: prevP.units_sold + item.quantity,
        revenue: round2(prevP.revenue + lineTotal),
        margin_estimate: round2(prevP.margin_estimate + (item.unit_price_at_sale - unitCost) * item.quantity),
      });

      if (location && prod) {
        const key = `${location.location_id}:${prod.product_id}`;
        const prevSite = siteProductMap.get(key) ?? {
          location_id: location.location_id,
          site_name: location.site_name,
          product_name: prod.product_name,
          units_sold: 0,
          revenue: 0,
        };
        prevSite.units_sold += item.quantity;
        prevSite.revenue = round2(prevSite.revenue + lineTotal);
        siteProductMap.set(key, prevSite);
      }
    }

    totalRevenue = round2(totalRevenue + saleTotal);

    const prevM = machineRevMap.get(sale.machine_id) ?? { transactions: 0, units_sold: 0, revenue: 0 };
    machineRevMap.set(sale.machine_id, {
      transactions: prevM.transactions + 1,
      units_sold: prevM.units_sold + saleUnits,
      revenue: round2(prevM.revenue + saleTotal),
    });

    const prevPay = paymentMap.get(sale.payment_method) ?? { transactions: 0, revenue: 0 };
    paymentMap.set(sale.payment_method, {
      transactions: prevPay.transactions + 1,
      revenue: round2(prevPay.revenue + saleTotal),
    });
  }

  const salesPerMachine = dbState.machines
    .map((m) => {
      const stats = machineRevMap.get(m.machine_id) ?? { transactions: 0, units_sold: 0, revenue: 0 };
      const loc = locMap.get(m.location_id);
      return {
        machine_id: m.machine_id,
        serial_no: m.serial_no,
        site_name: loc?.site_name ?? 'Unknown Site',
        machine_status: m.machine_status,
        transactions: stats.transactions,
        units_sold: stats.units_sold,
        revenue: stats.revenue,
      };
    })
    .sort((a, b) => b.revenue - a.revenue);

  const salesPerProduct = dbState.products
    .map((p) => {
      const stats = productRevMap.get(p.product_id) ?? { units_sold: 0, revenue: 0, margin_estimate: 0 };
      const cat = catMap.get(p.category_id);
      return {
        product_id: p.product_id,
        sku: p.sku,
        product_name: p.product_name,
        category_name: cat?.category_name ?? 'Uncategorized',
        units_sold: stats.units_sold,
        revenue: stats.revenue,
        margin_estimate: stats.margin_estimate,
      };
    })
    .sort((a, b) => b.revenue - a.revenue);

  const lowStockSlots: Array<
    MachineSlotView & {
      serial_no: string;
      site_name: string;
      machine_status: MachineStatus;
    }
  > = [];

  let totalQty = 0;
  let totalCap = 0;

  for (const slot of dbState.machine_slots) {
    totalQty += slot.quantity;
    totalCap += slot.max_capacity;
    if (isLowStock(slot)) {
      const machine = machineMap.get(slot.machine_id);
      const loc = machine ? locMap.get(machine.location_id) : undefined;
      const prod = prodMap.get(slot.product_id);
      const cat = prod ? catMap.get(prod.category_id) : undefined;
      if (machine && prod) {
        lowStockSlots.push({
          ...slot,
          product_name: prod.product_name,
          sku: prod.sku,
          unit_price: prod.unit_price,
          category_name: cat?.category_name ?? 'General',
          fill_pct: slot.max_capacity > 0 ? Math.round((slot.quantity / slot.max_capacity) * 100) : 0,
          is_low_stock: true,
          serial_no: machine.serial_no,
          site_name: loc?.site_name ?? 'Unknown Site',
          machine_status: machine.machine_status,
        });
      }
    }
  }

  lowStockSlots.sort((a, b) => a.fill_pct - b.fill_pct);

  const repairCostPerMachine = dbState.machines.map((m) => {
    const tickets = dbState.maintenance.filter((t) => t.machine_id === m.machine_id);
    const openTickets = tickets.filter((t) => t.maintenance_status !== 'Resolved').length;
    const resolvedTickets = tickets.filter((t) => t.maintenance_status === 'Resolved').length;
    const totalCost = round2(tickets.reduce((acc, t) => acc + (t.repair_cost ?? 0), 0));
    const loc = locMap.get(m.location_id);
    return {
      machine_id: m.machine_id,
      serial_no: m.serial_no,
      site_name: loc?.site_name ?? 'Unknown Site',
      open_tickets: openTickets,
      resolved_tickets: resolvedTickets,
      total_repair_cost: totalCost,
    };
  });

  const topByLocationMap = new Map<
    number,
    { location_id: number; site_name: string; product_name: string; units_sold: number; revenue: number }
  >();
  for (const row of siteProductMap.values()) {
    const existing = topByLocationMap.get(row.location_id);
    if (!existing || row.units_sold > existing.units_sold || (row.units_sold === existing.units_sold && row.revenue > existing.revenue)) {
      topByLocationMap.set(row.location_id, row);
    }
  }

  const activeMachines = dbState.machines.filter((m) => m.machine_status === 'Active').length;
  const underMaintenanceMachines = dbState.machines.filter((m) => m.machine_status === 'Under Maintenance').length;
  const offlineMachines = dbState.machines.filter((m) => m.machine_status === 'Offline').length;
  const openRepairsCount = dbState.maintenance.filter((t) => t.maintenance_status !== 'Resolved').length;
  const totalRepairCost = round2(dbState.maintenance.reduce((sum, t) => sum + (t.repair_cost ?? 0), 0));

  return {
    locations: [...dbState.locations],
    machines: [...dbState.machines],
    categories: [...dbState.categories],
    suppliers: [...dbState.suppliers],
    products: [...dbState.products],
    employees: [...dbState.employees],
    machine_slots: [...dbState.machine_slots],
    restocks: [...dbState.restocks],
    restock_items: [...dbState.restock_items],
    sales: [...dbState.sales],
    sale_items: [...dbState.sale_items],
    maintenance: [...dbState.maintenance],
    summary: {
      totalRevenue,
      totalTransactions: dbState.sales.length,
      activeMachines,
      underMaintenanceMachines,
      offlineMachines,
      totalMachines: dbState.machines.length,
      lowStockSlotsCount: lowStockSlots.length,
      openRepairsCount,
      totalRepairCost,
      totalSlotsCount: dbState.machine_slots.length,
      fleetFillRatePct: totalCap > 0 ? Math.round((totalQty / totalCap) * 100) : 0,
    },
    reports: {
      salesPerMachine,
      salesPerProduct,
      lowStockSlots,
      repairCostPerMachine,
      paymentBreakdown: Array.from(paymentMap.entries()).map(([payment_method, stats]) => ({
        payment_method,
        transactions: stats.transactions,
        revenue: stats.revenue,
      })),
      topProductBySite: Array.from(topByLocationMap.values()).sort((a, b) => b.revenue - a.revenue),
    },
  };
}

// --- CRUD & Business Rule Enforcement ---

export function createLocation(input: Omit<Location, 'location_id'>): Location {
  const site_name = String(input.site_name ?? '').trim();
  const address = String(input.address ?? '').trim();
  const city = String(input.city ?? '').trim();
  if (!site_name || !address || !city) {
    throw new DomainRuleError('Site name, street address, and city are required.', 400);
  }
  const loc: Location = {
    location_id: dbState.counters.location_id++,
    site_name,
    address,
    city,
    contact_person: input.contact_person?.trim() || null,
    contact_no: input.contact_no?.trim() || null,
  };
  dbState.locations.push(loc);
  persistState();
  return loc;
}

export function deleteLocation(locationId: number): void {
  const idx = dbState.locations.findIndex((l) => l.location_id === locationId);
  if (idx === -1) throw new DomainRuleError('Location not found.', 404);
  if (dbState.machines.some((m) => m.location_id === locationId)) {
    throw new DomainRuleError('Cannot delete location while machines are assigned to it (FK RESTRICT).', 409);
  }
  dbState.locations.splice(idx, 1);
  persistState();
}

export function createMachine(input: Omit<Machine, 'machine_id'>): Machine {
  const location_id = Number(input.location_id);
  const serial_no = String(input.serial_no ?? '').trim();
  const model = String(input.model ?? '').trim();
  const machine_type = input.machine_type as MachineType;
  const install_date = String(input.install_date ?? '').trim();
  const machine_status = (input.machine_status ?? 'Active') as MachineStatus;

  if (!dbState.locations.some((l) => l.location_id === location_id)) {
    throw new DomainRuleError('BR1: Machine must be placed at a valid location.', 400, 'BR1');
  }
  if (!serial_no || !model || !install_date) {
    throw new DomainRuleError('Serial number, model, and install date are required.', 400);
  }
  if (!['Snack', 'Beverage', 'Combo'].includes(machine_type)) {
    throw new DomainRuleError('Machine type must be Snack, Beverage, or Combo.', 400);
  }
  if (!['Active', 'Under Maintenance', 'Offline'].includes(machine_status)) {
    throw new DomainRuleError('Invalid machine status.', 400);
  }
  if (dbState.machines.some((m) => m.serial_no.toLowerCase() === serial_no.toLowerCase())) {
    throw new DomainRuleError(`BR15: Machine serial number "${serial_no}" already exists.`, 409, 'BR15');
  }

  const machine: Machine = {
    machine_id: dbState.counters.machine_id++,
    location_id,
    serial_no,
    model,
    machine_type,
    install_date,
    machine_status,
  };
  dbState.machines.push(machine);
  persistState();
  return machine;
}

export function updateMachineStatus(machineId: number, status: MachineStatus): Machine {
  const machine = dbState.machines.find((m) => m.machine_id === machineId);
  if (!machine) throw new DomainRuleError('Machine not found.', 404);
  if (!['Active', 'Under Maintenance', 'Offline'].includes(status)) {
    throw new DomainRuleError('Status must be Active, Under Maintenance, or Offline.', 400);
  }
  const hasOpenRepair = dbState.maintenance.some(
    (t) => t.machine_id === machineId && t.maintenance_status !== 'Resolved'
  );
  if (status === 'Active' && hasOpenRepair) {
    throw new DomainRuleError(
      'BR12: Machine has open/in-progress maintenance tickets and must remain Under Maintenance until resolved.',
      409,
      'BR12'
    );
  }
  machine.machine_status = status;
  persistState();
  return machine;
}

export function upsertMachineSlot(input: MachineSlot): MachineSlot {
  const machine_id = Number(input.machine_id);
  const slot_no = Number(input.slot_no);
  const product_id = Number(input.product_id);
  const quantity = Number(input.quantity);
  const max_capacity = Number(input.max_capacity);

  if (!dbState.machines.some((m) => m.machine_id === machine_id)) {
    throw new DomainRuleError('Machine not found.', 404);
  }
  if (!dbState.products.some((p) => p.product_id === product_id)) {
    throw new DomainRuleError('Product not found.', 404);
  }
  if (!Number.isInteger(slot_no) || slot_no < 1 || slot_no > 99) {
    throw new DomainRuleError('BR2: Slot number must be an integer >= 1.', 400, 'BR2');
  }
  if (!Number.isInteger(max_capacity) || max_capacity < 1 || max_capacity > 100) {
    throw new DomainRuleError('Max capacity must be between 1 and 100 units.', 400);
  }
  if (!Number.isInteger(quantity) || quantity < 0 || quantity > max_capacity) {
    throw new DomainRuleError(
      `BR3: Slot quantity (${quantity}) must be between 0 and max capacity (${max_capacity}).`,
      400,
      'BR3'
    );
  }

  const existing = dbState.machine_slots.find(
    (s) => s.machine_id === machine_id && s.slot_no === slot_no
  );
  if (existing) {
    existing.product_id = product_id;
    existing.quantity = quantity;
    existing.max_capacity = max_capacity;
    persistState();
    return existing;
  }

  const created: MachineSlot = { machine_id, slot_no, product_id, quantity, max_capacity };
  dbState.machine_slots.push(created);
  persistState();
  return created;
}

export function createCategory(input: Omit<Category, 'category_id'>): Category {
  const category_name = String(input.category_name ?? '').trim();
  if (!category_name) throw new DomainRuleError('Category name is required.', 400);
  if (dbState.categories.some((c) => c.category_name.toLowerCase() === category_name.toLowerCase())) {
    throw new DomainRuleError(`BR15: Category "${category_name}" already exists.`, 409, 'BR15');
  }
  const cat: Category = {
    category_id: dbState.counters.category_id++,
    category_name,
    description: input.description?.trim() || null,
  };
  dbState.categories.push(cat);
  persistState();
  return cat;
}

export function createSupplier(input: Omit<Supplier, 'supplier_id'>): Supplier {
  const supplier_name = String(input.supplier_name ?? '').trim();
  if (!supplier_name) throw new DomainRuleError('Supplier name is required.', 400);
  if (dbState.suppliers.some((s) => s.supplier_name.toLowerCase() === supplier_name.toLowerCase())) {
    throw new DomainRuleError(`BR15: Supplier "${supplier_name}" already exists.`, 409, 'BR15');
  }
  const sup: Supplier = {
    supplier_id: dbState.counters.supplier_id++,
    supplier_name,
    contact_person: input.contact_person?.trim() || null,
    contact_no: input.contact_no?.trim() || null,
    email: input.email?.trim() || null,
    address: input.address?.trim() || null,
  };
  dbState.suppliers.push(sup);
  persistState();
  return sup;
}

export function createProduct(input: Omit<Product, 'product_id'>): Product {
  const sku = String(input.sku ?? '').trim().toUpperCase();
  const product_name = String(input.product_name ?? '').trim();
  const category_id = Number(input.category_id);
  const supplier_id = Number(input.supplier_id);
  const unit_cost = Number(input.unit_cost);
  const unit_price = Number(input.unit_price);

  if (!sku || !product_name) {
    throw new DomainRuleError('SKU and product name are required.', 400);
  }
  if (dbState.products.some((p) => p.sku.toLowerCase() === sku.toLowerCase())) {
    throw new DomainRuleError(`BR15: Product SKU "${sku}" must be unique.`, 409, 'BR15');
  }
  if (!dbState.categories.some((c) => c.category_id === category_id)) {
    throw new DomainRuleError('BR4: Product must belong to a valid category.', 400, 'BR4');
  }
  if (!dbState.suppliers.some((s) => s.supplier_id === supplier_id)) {
    throw new DomainRuleError('BR4: Product must be bought from a valid supplier.', 400, 'BR4');
  }
  if (!Number.isFinite(unit_cost) || unit_cost < 0 || !Number.isFinite(unit_price)) {
    throw new DomainRuleError('Unit cost and selling price must be valid non-negative numbers.', 400);
  }
  if (unit_price < unit_cost) {
    throw new DomainRuleError(
      `BR5: Selling price (₱${unit_price.toFixed(2)}) cannot be lower than unit cost (₱${unit_cost.toFixed(2)}).`,
      400,
      'BR5'
    );
  }

  const product: Product = {
    product_id: dbState.counters.product_id++,
    sku,
    product_name,
    category_id,
    supplier_id,
    unit_cost: round2(unit_cost),
    unit_price: round2(unit_price),
  };
  dbState.products.push(product);
  persistState();
  return product;
}

export function updateProductPrice(productId: number, unitCost: number, unitPrice: number): Product {
  const product = dbState.products.find((p) => p.product_id === productId);
  if (!product) throw new DomainRuleError('Product not found.', 404);
  if (!Number.isFinite(unitCost) || unitCost < 0 || !Number.isFinite(unitPrice)) {
    throw new DomainRuleError('Invalid cost or selling price.', 400);
  }
  if (unitPrice < unitCost) {
    throw new DomainRuleError(
      `BR5: Selling price (₱${unitPrice.toFixed(2)}) cannot be lower than unit cost (₱${unitCost.toFixed(2)}).`,
      400,
      'BR5'
    );
  }
  product.unit_cost = round2(unitCost);
  product.unit_price = round2(unitPrice);
  persistState();
  return product;
}

export function createEmployee(input: Omit<Employee, 'employee_id'>): Employee {
  const first_name = String(input.first_name ?? '').trim();
  const last_name = String(input.last_name ?? '').trim();
  const role = input.role as EmployeeRole;
  const email = String(input.email ?? '').trim().toLowerCase();
  const date_hired = String(input.date_hired ?? '').trim();

  if (!first_name || !last_name || !email || !date_hired) {
    throw new DomainRuleError('First name, last name, email, and hire date are required.', 400);
  }
  if (!['Route Driver', 'Technician', 'Manager', 'Administrator'].includes(role)) {
    throw new DomainRuleError('Invalid employee role.', 400);
  }
  if (dbState.employees.some((e) => e.email.toLowerCase() === email)) {
    throw new DomainRuleError(`BR15: Employee email "${email}" already exists.`, 409, 'BR15');
  }
  const emp: Employee = {
    employee_id: dbState.counters.employee_id++,
    first_name,
    last_name,
    role,
    email,
    contact_no: input.contact_no?.trim() || null,
    date_hired,
  };
  dbState.employees.push(emp);
  persistState();
  return emp;
}

export function recordSale(input: {
  machine_id: number;
  payment_method: PaymentMethod;
  sale_datetime?: string;
  items: Array<{ product_id: number; quantity: number }>;
}): { sale: Sale; sale_items: SaleItem[] } {
  const machine_id = Number(input.machine_id);
  const payment_method = input.payment_method as PaymentMethod;

  const machine = dbState.machines.find((m) => m.machine_id === machine_id);
  if (!machine) throw new DomainRuleError('Machine not found.', 404);
  if (machine.machine_status !== 'Active') {
    throw new DomainRuleError(
      `BR8: Only Active machines may record sales (machine ${machine.serial_no} is currently ${machine.machine_status}).`,
      400,
      'BR8'
    );
  }
  if (!['Cash', 'Coin', 'GCash', 'Card'].includes(payment_method)) {
    throw new DomainRuleError('BR14: Payment method must be Cash, Coin, GCash, or Card.', 400, 'BR14');
  }
  if (!Array.isArray(input.items) || input.items.length === 0) {
    throw new DomainRuleError('BR6: A sale must include at least one product.', 400, 'BR6');
  }

  // Consolidate duplicate product lines per composite PK (sale_id, product_id)
  const mergedItems = new Map<number, number>();
  for (const line of input.items) {
    const pid = Number(line.product_id);
    const qty = Number(line.quantity);
    if (!Number.isInteger(qty) || qty <= 0) {
      throw new DomainRuleError('Sale item quantity must be a positive integer.', 400);
    }
    mergedItems.set(pid, (mergedItems.get(pid) ?? 0) + qty);
  }

  // Validate stock & slot ownership across all items before mutating
  const deductions: Array<{ slot: MachineSlot; take: number }> = [];
  const saleItemsToCreate: Array<{ product_id: number; quantity: number; unit_price_at_sale: number }> = [];

  for (const [product_id, qty] of mergedItems.entries()) {
    const product = dbState.products.find((p) => p.product_id === product_id);
    if (!product) throw new DomainRuleError(`Product #${product_id} not found.`, 404);

    const matchingSlots = dbState.machine_slots.filter(
      (s) => s.machine_id === machine_id && s.product_id === product_id
    );
    if (matchingSlots.length === 0) {
      throw new DomainRuleError(
        `BR8: Product "${product.product_name}" is not loaded in machine ${machine.serial_no}.`,
        400,
        'BR8'
      );
    }

    const totalAvailable = matchingSlots.reduce((sum, s) => sum + s.quantity, 0);
    if (totalAvailable <= 0) {
      throw new DomainRuleError(
        `BR9: "${product.product_name}" is out of stock (quantity 0) in machine ${machine.serial_no}.`,
        400,
        'BR9'
      );
    }
    if (totalAvailable < qty) {
      throw new DomainRuleError(
        `BR9: Insufficient stock for "${product.product_name}" (requested ${qty}, available ${totalAvailable}).`,
        400,
        'BR9'
      );
    }

    let remaining = qty;
    for (const slot of matchingSlots) {
      if (remaining === 0) break;
      const take = Math.min(slot.quantity, remaining);
      if (take > 0) {
        deductions.push({ slot, take });
        remaining -= take;
      }
    }

    // BR7: Snapshot current unit_price at time of sale
    saleItemsToCreate.push({
      product_id,
      quantity: qty,
      unit_price_at_sale: product.unit_price,
    });
  }

  // Apply mutations atomically
  for (const { slot, take } of deductions) {
    slot.quantity -= take;
  }

  const sale_id = dbState.counters.sale_id++;
  const sale: Sale = {
    sale_id,
    machine_id,
    sale_datetime: input.sale_datetime?.trim() || new Date().toISOString().slice(0, 19),
    payment_method,
  };
  dbState.sales.push(sale);

  const createdItems: SaleItem[] = saleItemsToCreate.map((item) => ({
    sale_id,
    ...item,
  }));
  dbState.sale_items.push(...createdItems);
  persistState();

  return { sale, sale_items: createdItems };
}

export function recordRestock(input: {
  machine_id: number;
  employee_id: number;
  restock_date?: string;
  items: Array<{ product_id: number; quantity_added: number }>;
}): { restock: Restock; restock_items: RestockItem[] } {
  const machine_id = Number(input.machine_id);
  const employee_id = Number(input.employee_id);
  const restock_date = input.restock_date?.trim() || new Date().toISOString().slice(0, 10);

  const machine = dbState.machines.find((m) => m.machine_id === machine_id);
  if (!machine) throw new DomainRuleError('Machine not found.', 404);

  const employee = dbState.employees.find((e) => e.employee_id === employee_id);
  if (!employee) throw new DomainRuleError('Employee not found.', 404);
  if (employee.role !== 'Route Driver') {
    throw new DomainRuleError(
      `BR10: Only employees with role "Route Driver" may perform restocking visits (${employee.first_name} ${employee.last_name} is ${employee.role}).`,
      400,
      'BR10'
    );
  }

  if (!Array.isArray(input.items) || input.items.length === 0) {
    throw new DomainRuleError('Restock visit must include at least one product.', 400);
  }

  const merged = new Map<number, number>();
  for (const line of input.items) {
    const pid = Number(line.product_id);
    const qty = Number(line.quantity_added);
    if (!Number.isInteger(qty) || qty <= 0) {
      throw new DomainRuleError('BR10: Quantity added must be a positive integer.', 400, 'BR10');
    }
    merged.set(pid, (merged.get(pid) ?? 0) + qty);
  }

  const slotAdditions: Array<{ slot: MachineSlot; add: number }> = [];
  for (const [product_id, qtyAdded] of merged.entries()) {
    const product = dbState.products.find((p) => p.product_id === product_id);
    if (!product) throw new DomainRuleError(`Product #${product_id} not found.`, 404);

    const slots = dbState.machine_slots.filter(
      (s) => s.machine_id === machine_id && s.product_id === product_id
    );
    if (slots.length === 0) {
      throw new DomainRuleError(
        `Product "${product.product_name}" is not assigned to any slot in machine ${machine.serial_no}. Assign a slot first.`,
        400
      );
    }

    const totalRoom = slots.reduce((sum, s) => sum + (s.max_capacity - s.quantity), 0);
    if (qtyAdded > totalRoom) {
      throw new DomainRuleError(
        `BR3: Adding ${qtyAdded} units of "${product.product_name}" exceeds remaining slot capacity (${totalRoom} units available).`,
        400,
        'BR3'
      );
    }

    let remaining = qtyAdded;
    for (const slot of slots) {
      if (remaining === 0) break;
      const room = slot.max_capacity - slot.quantity;
      const add = Math.min(room, remaining);
      if (add > 0) {
        slotAdditions.push({ slot, add });
        remaining -= add;
      }
    }
  }

  for (const { slot, add } of slotAdditions) {
    slot.quantity += add;
  }

  const restock_id = dbState.counters.restock_id++;
  const restock: Restock = {
    restock_id,
    machine_id,
    employee_id,
    restock_date,
  };
  dbState.restocks.push(restock);

  const createdItems: RestockItem[] = Array.from(merged.entries()).map(([product_id, quantity_added]) => ({
    restock_id,
    product_id,
    quantity_added,
  }));
  dbState.restock_items.push(...createdItems);
  persistState();

  return { restock, restock_items: createdItems };
}

export function createMaintenanceRequest(input: {
  machine_id: number;
  employee_id: number;
  issue_description: string;
  reported_date?: string;
  repair_cost?: number | null;
}): Maintenance {
  const machine_id = Number(input.machine_id);
  const employee_id = Number(input.employee_id);
  const issue_description = String(input.issue_description ?? '').trim();
  const reported_date = input.reported_date?.trim() || new Date().toISOString().slice(0, 10);
  const repair_cost =
    input.repair_cost === null || input.repair_cost === undefined || input.repair_cost === ('' as unknown as number)
      ? null
      : Number(input.repair_cost);

  const machine = dbState.machines.find((m) => m.machine_id === machine_id);
  if (!machine) throw new DomainRuleError('Machine not found.', 404);

  const employee = dbState.employees.find((e) => e.employee_id === employee_id);
  if (!employee) throw new DomainRuleError('Employee not found.', 404);
  if (employee.role !== 'Technician') {
    throw new DomainRuleError(
      `BR12: Maintenance requests must be handled by a Technician (${employee.first_name} ${employee.last_name} is ${employee.role}).`,
      400,
      'BR12'
    );
  }
  if (!issue_description) {
    throw new DomainRuleError('Issue description is required.', 400);
  }
  if (repair_cost !== null && (!Number.isFinite(repair_cost) || repair_cost < 0)) {
    throw new DomainRuleError('Repair cost cannot be negative.', 400);
  }

  const ticket: Maintenance = {
    maintenance_id: dbState.counters.maintenance_id++,
    machine_id,
    employee_id,
    issue_description,
    reported_date,
    resolved_date: null,
    maintenance_status: 'Open',
    repair_cost: repair_cost !== null ? round2(repair_cost) : null,
  };

  dbState.maintenance.push(ticket);
  // BR12: Machine becomes Under Maintenance while request is not Resolved
  machine.machine_status = 'Under Maintenance';
  persistState();
  return ticket;
}

export function updateMaintenanceTicket(
  maintenanceId: number,
  input: {
    maintenance_status: MaintenanceStatus;
    resolved_date?: string | null;
    repair_cost?: number | null;
  }
): Maintenance {
  const ticket = dbState.maintenance.find((t) => t.maintenance_id === maintenanceId);
  if (!ticket) throw new DomainRuleError('Maintenance request not found.', 404);

  const status = input.maintenance_status;
  if (!['Open', 'In Progress', 'Resolved'].includes(status)) {
    throw new DomainRuleError('Maintenance status must be Open, In Progress, or Resolved.', 400);
  }

  let resolved_date = input.resolved_date ? String(input.resolved_date).trim() : null;
  if (status === 'Resolved' && !resolved_date) {
    resolved_date = new Date().toISOString().slice(0, 10);
  }
  if (status !== 'Resolved') {
    resolved_date = null;
  }

  if (resolved_date && resolved_date < ticket.reported_date) {
    throw new DomainRuleError(
      `BR13: Resolved date (${resolved_date}) cannot be earlier than reported date (${ticket.reported_date}).`,
      400,
      'BR13'
    );
  }

  if (input.repair_cost !== undefined) {
    if (input.repair_cost === null || input.repair_cost === ('' as unknown as number)) {
      ticket.repair_cost = null;
    } else {
      const cost = Number(input.repair_cost);
      if (!Number.isFinite(cost) || cost < 0) {
        throw new DomainRuleError('Repair cost cannot be negative.', 400);
      }
      ticket.repair_cost = round2(cost);
    }
  }

  ticket.maintenance_status = status;
  ticket.resolved_date = resolved_date;

  // BR12: Sync machine status
  const machine = dbState.machines.find((m) => m.machine_id === ticket.machine_id);
  if (machine) {
    const stillOpen = dbState.maintenance.some(
      (t) => t.machine_id === machine.machine_id && t.maintenance_status !== 'Resolved'
    );
    if (stillOpen) {
      machine.machine_status = 'Under Maintenance';
    } else if (machine.machine_status === 'Under Maintenance') {
      machine.machine_status = 'Active';
    }
  }

  persistState();
  return ticket;
}

function escapeCsvCell(val: unknown): string {
  const str = val === null || val === undefined ? '' : String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildCsvReport(reportType: string): { filename: string; csv: string } {
  const snap = getDashboardSnapshot();
  const lines: string[] = [];

  switch (reportType) {
    case 'sales-per-machine': {
      lines.push(['machine_id', 'serial_no', 'site_name', 'status', 'transactions', 'units_sold', 'revenue_php'].join(','));
      for (const r of snap.reports.salesPerMachine) {
        lines.push([r.machine_id, r.serial_no, r.site_name, r.machine_status, r.transactions, r.units_sold, r.revenue.toFixed(2)].map(escapeCsvCell).join(','));
      }
      return { filename: 'vendtrack_sales_per_machine.csv', csv: lines.join('\n') };
    }
    case 'sales-per-product': {
      lines.push(['product_id', 'sku', 'product_name', 'category', 'units_sold', 'revenue_php', 'gross_margin_php'].join(','));
      for (const r of snap.reports.salesPerProduct) {
        lines.push([r.product_id, r.sku, r.product_name, r.category_name, r.units_sold, r.revenue.toFixed(2), r.margin_estimate.toFixed(2)].map(escapeCsvCell).join(','));
      }
      return { filename: 'vendtrack_sales_per_product.csv', csv: lines.join('\n') };
    }
    case 'low-stock': {
      lines.push(['machine_id', 'serial_no', 'site_name', 'slot_no', 'sku', 'product_name', 'quantity', 'max_capacity', 'fill_pct'].join(','));
      for (const r of snap.reports.lowStockSlots) {
        lines.push([r.machine_id, r.serial_no, r.site_name, r.slot_no, r.sku, r.product_name, r.quantity, r.max_capacity, `${r.fill_pct}%`].map(escapeCsvCell).join(','));
      }
      return { filename: 'vendtrack_low_stock_slots.csv', csv: lines.join('\n') };
    }
    case 'repair-costs': {
      lines.push(['machine_id', 'serial_no', 'site_name', 'open_tickets', 'resolved_tickets', 'total_repair_cost_php'].join(','));
      for (const r of snap.reports.repairCostPerMachine) {
        lines.push([r.machine_id, r.serial_no, r.site_name, r.open_tickets, r.resolved_tickets, r.total_repair_cost.toFixed(2)].map(escapeCsvCell).join(','));
      }
      return { filename: 'vendtrack_repair_costs.csv', csv: lines.join('\n') };
    }
    case 'sales-ledger': {
      const mMap = new Map(snap.machines.map((m) => [m.machine_id, m]));
      const lMap = new Map(snap.locations.map((l) => [l.location_id, l]));
      const pMap = new Map(snap.products.map((p) => [p.product_id, p]));
      lines.push(['sale_id', 'sale_datetime', 'machine_serial', 'site_name', 'payment_method', 'sku', 'product_name', 'quantity', 'unit_price_at_sale_php', 'line_total_php'].join(','));
      for (const item of snap.sale_items) {
        const sale = snap.sales.find((s) => s.sale_id === item.sale_id);
        const machine = sale ? mMap.get(sale.machine_id) : undefined;
        const loc = machine ? lMap.get(machine.location_id) : undefined;
        const prod = pMap.get(item.product_id);
        lines.push(
          [
            item.sale_id,
            sale?.sale_datetime ?? '',
            machine?.serial_no ?? '',
            loc?.site_name ?? '',
            sale?.payment_method ?? '',
            prod?.sku ?? '',
            prod?.product_name ?? '',
            item.quantity,
            item.unit_price_at_sale.toFixed(2),
            (item.quantity * item.unit_price_at_sale).toFixed(2),
          ]
            .map(escapeCsvCell)
            .join(',')
        );
      }
      return { filename: 'vendtrack_sales_ledger.csv', csv: lines.join('\n') };
    }
    default:
      throw new DomainRuleError(`Unknown report export type: ${reportType}`, 400);
  }
}
