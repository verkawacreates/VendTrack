export type MachineType = 'Snack' | 'Beverage' | 'Combo';
export type MachineStatus = 'Active' | 'Under Maintenance' | 'Offline';
export type EmployeeRole = 'Route Driver' | 'Technician' | 'Manager' | 'Administrator';
export type PaymentMethod = 'Cash' | 'Coin' | 'GCash' | 'Card';
export type MaintenanceStatus = 'Open' | 'In Progress' | 'Resolved';

export interface Location {
  location_id: number;
  site_name: string;
  address: string;
  city: string;
  contact_person: string | null;
  contact_no: string | null;
}

export interface Machine {
  machine_id: number;
  location_id: number;
  serial_no: string;
  model: string;
  machine_type: MachineType;
  install_date: string; // YYYY-MM-DD
  machine_status: MachineStatus;
}

export interface Category {
  category_id: number;
  category_name: string;
  description: string | null;
}

export interface Supplier {
  supplier_id: number;
  supplier_name: string;
  contact_person: string | null;
  contact_no: string | null;
  email: string | null;
  address: string | null;
}

export interface Product {
  product_id: number;
  sku: string;
  product_name: string;
  category_id: number;
  supplier_id: number;
  unit_cost: number;
  unit_price: number;
}

export interface Employee {
  employee_id: number;
  first_name: string;
  last_name: string;
  role: EmployeeRole;
  email: string;
  contact_no: string | null;
  date_hired: string; // YYYY-MM-DD
}

export interface MachineSlot {
  machine_id: number;
  slot_no: number;
  product_id: number;
  quantity: number;
  max_capacity: number;
}

export interface Restock {
  restock_id: number;
  machine_id: number;
  employee_id: number;
  restock_date: string; // YYYY-MM-DD
}

export interface RestockItem {
  restock_id: number;
  product_id: number;
  quantity_added: number;
}

export interface Sale {
  sale_id: number;
  machine_id: number;
  sale_datetime: string; // ISO string or YYYY-MM-DD HH:mm:ss
  payment_method: PaymentMethod;
}

export interface SaleItem {
  sale_id: number;
  product_id: number;
  quantity: number;
  unit_price_at_sale: number;
}

export interface Maintenance {
  maintenance_id: number;
  machine_id: number;
  employee_id: number;
  issue_description: string;
  reported_date: string; // YYYY-MM-DD
  resolved_date: string | null;
  maintenance_status: MaintenanceStatus;
  repair_cost: number | null;
}

export interface AuthOperator {
  email: string;
  name: string;
  role: EmployeeRole;
}

export interface AuthStatusResponse {
  mode: 'env' | 'claimed' | 'unclaimed';
  configured: boolean;
  authenticated: boolean;
  operator: AuthOperator | null;
}

export interface MachineSlotView extends MachineSlot {
  product_name: string;
  sku: string;
  unit_price: number;
  category_name: string;
  fill_pct: number;
  is_low_stock: boolean;
}

export interface SaleDetailed extends Sale {
  machine_serial: string;
  site_name: string;
  total_amount: number;
  items: Array<
    SaleItem & {
      product_name: string;
      sku: string;
      line_total: number;
    }
  >;
}

export interface RestockDetailed extends Restock {
  machine_serial: string;
  site_name: string;
  driver_name: string;
  total_units_added: number;
  items: Array<
    RestockItem & {
      product_name: string;
      sku: string;
    }
  >;
}

export interface MaintenanceDetailed extends Maintenance {
  machine_serial: string;
  site_name: string;
  technician_name: string;
}

export interface DashboardSnapshot {
  locations: Location[];
  machines: Machine[];
  categories: Category[];
  suppliers: Supplier[];
  products: Product[];
  employees: Employee[];
  machine_slots: MachineSlot[];
  restocks: Restock[];
  restock_items: RestockItem[];
  sales: Sale[];
  sale_items: SaleItem[];
  maintenance: Maintenance[];
  summary: {
    totalRevenue: number;
    totalTransactions: number;
    activeMachines: number;
    underMaintenanceMachines: number;
    offlineMachines: number;
    totalMachines: number;
    lowStockSlotsCount: number;
    openRepairsCount: number;
    totalRepairCost: number;
    totalSlotsCount: number;
    fleetFillRatePct: number;
  };
  reports: {
    salesPerMachine: Array<{
      machine_id: number;
      serial_no: string;
      site_name: string;
      machine_status: MachineStatus;
      transactions: number;
      units_sold: number;
      revenue: number;
    }>;
    salesPerProduct: Array<{
      product_id: number;
      sku: string;
      product_name: string;
      category_name: string;
      units_sold: number;
      revenue: number;
      margin_estimate: number;
    }>;
    lowStockSlots: Array<
      MachineSlotView & {
        serial_no: string;
        site_name: string;
        machine_status: MachineStatus;
      }
    >;
    repairCostPerMachine: Array<{
      machine_id: number;
      serial_no: string;
      site_name: string;
      open_tickets: number;
      resolved_tickets: number;
      total_repair_cost: number;
    }>;
    paymentBreakdown: Array<{
      payment_method: PaymentMethod;
      transactions: number;
      revenue: number;
    }>;
    topProductBySite: Array<{
      location_id: number;
      site_name: string;
      product_name: string;
      units_sold: number;
      revenue: number;
    }>;
  };
}
