import {
  Category,
  Employee,
  Location,
  Machine,
  MachineSlot,
  Maintenance,
  Product,
  Restock,
  RestockItem,
  Sale,
  SaleItem,
  Supplier,
} from '../types/vendtrack.ts';

export interface VendTrackDatabaseState {
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
  counters: {
    location_id: number;
    machine_id: number;
    category_id: number;
    supplier_id: number;
    product_id: number;
    employee_id: number;
    restock_id: number;
    sale_id: number;
    maintenance_id: number;
  };
}

export function createSeedState(): VendTrackDatabaseState {
  const locations: Location[] = [
    { location_id: 1, site_name: 'USTP CDO - Engineering Complex', address: 'Claro M. Recto Ave, Lapasan', city: 'Cagayan de Oro', contact_person: 'Engr. Marco Villanueva', contact_no: '0917-550-1001' },
    { location_id: 2, site_name: 'USTP CDO - Student Center Lobby', address: 'Claro M. Recto Ave, Lapasan', city: 'Cagayan de Oro', contact_person: 'Clarisse Mendoza', contact_no: '0917-550-1002' },
    { location_id: 3, site_name: 'Limketkai Center - Main Atrium', address: 'Limketkai Dr, Lapasan', city: 'Cagayan de Oro', contact_person: 'Rafael Tan', contact_no: '0918-412-2003' },
    { location_id: 4, site_name: 'Centrio Ayala Mall - Cinema Wing', address: 'Corrales Ave & CM Recto', city: 'Cagayan de Oro', contact_person: 'Andrea Lim', contact_no: '0917-830-3004' },
    { location_id: 5, site_name: 'SM CDO Downtown Premier', address: 'CM Recto Ave & Osmeña St', city: 'Cagayan de Oro', contact_person: 'Jerome Bautista', contact_no: '0919-620-4005' },
    { location_id: 6, site_name: 'Xavier University - Main Gate', address: '73 Corrales Ave', city: 'Cagayan de Oro', contact_person: 'Paolo Abad', contact_no: '0917-741-5006' },
    { location_id: 7, site_name: 'Capitol University Medical Center', address: 'Gusa Highway', city: 'Cagayan de Oro', contact_person: 'Dr. Nina Soriano', contact_no: '0918-905-6007' },
    { location_id: 8, site_name: 'Agora Integrated Bus Terminal', address: 'Lapasan Highway', city: 'Cagayan de Oro', contact_person: 'Dante Navarro', contact_no: '0920-334-7008' },
    { location_id: 9, site_name: 'CDO Technohub BPO Tower', address: 'Pueblo de Oro IT Park', city: 'Cagayan de Oro', contact_person: 'Bianca Reyes', contact_no: '0917-221-8009' },
    { location_id: 10, site_name: 'Polymedic Medical Plaza', address: 'Kauswagan National Hwy', city: 'Cagayan de Oro', contact_person: 'Lester Yu', contact_no: '0917-619-9010' },
  ];

  const machines: Machine[] = [
    { machine_id: 1, location_id: 1, serial_no: 'VT-SN-2026-001', model: 'Crane Merchant Media 6', machine_type: 'Combo', install_date: '2025-08-12', machine_status: 'Active' },
    { machine_id: 2, location_id: 2, serial_no: 'VT-SN-2026-002', model: 'Fuji Electric FBE-400', machine_type: 'Beverage', install_date: '2025-08-15', machine_status: 'Active' },
    { machine_id: 3, location_id: 3, serial_no: 'VT-SN-2026-003', model: 'SandenVendo G-Drink 9', machine_type: 'Beverage', install_date: '2025-09-02', machine_status: 'Active' },
    { machine_id: 4, location_id: 4, serial_no: 'VT-SN-2026-004', model: 'Azkoyen Mistral+ H70', machine_type: 'Snack', install_date: '2025-09-18', machine_status: 'Active' },
    { machine_id: 5, location_id: 5, serial_no: 'VT-SN-2026-005', model: 'Crane Merchant Media 6', machine_type: 'Combo', install_date: '2025-10-05', machine_status: 'Active' },
    { machine_id: 6, location_id: 6, serial_no: 'VT-SN-2026-006', model: 'SandenVendo G-Snack 10', machine_type: 'Snack', install_date: '2025-10-20', machine_status: 'Active' },
    { machine_id: 7, location_id: 7, serial_no: 'VT-SN-2026-007', model: 'Fuji Electric FBE-400', machine_type: 'Beverage', install_date: '2025-11-11', machine_status: 'Active' },
    { machine_id: 8, location_id: 8, serial_no: 'VT-SN-2026-008', model: 'Crane Merchant Media 6', machine_type: 'Combo', install_date: '2025-12-01', machine_status: 'Under Maintenance' },
    { machine_id: 9, location_id: 9, serial_no: 'VT-SN-2026-009', model: 'Azkoyen Mistral+ H70', machine_type: 'Combo', install_date: '2026-01-14', machine_status: 'Under Maintenance' },
    { machine_id: 10, location_id: 10, serial_no: 'VT-SN-2026-010', model: 'SandenVendo G-Snack 10', machine_type: 'Snack', install_date: '2026-02-03', machine_status: 'Offline' },
  ];

  const categories: Category[] = [
    { category_id: 1, category_name: 'Carbonated Soft Drinks', description: 'Chilled canned sodas and sparkling beverages' },
    { category_id: 2, category_name: 'Bottled Water', description: 'Purified and mineral drinking water' },
    { category_id: 3, category_name: 'Fruit Juices', description: 'Ready-to-drink citrus and tropical juices' },
    { category_id: 4, category_name: 'Energy Drinks', description: 'Caffeinated and vitamin-fortified energy cans' },
    { category_id: 5, category_name: 'RTD Coffee', description: 'Chilled brewed and sweetened canned coffee' },
    { category_id: 6, category_name: 'Potato Chips', description: 'Savory fried and baked potato crisps' },
    { category_id: 7, category_name: 'Crackers & Biscuits', description: 'Cheese and savory sandwich crackers' },
    { category_id: 8, category_name: 'Confectionery', description: 'Chocolate bars and sweet snacks' },
    { category_id: 9, category_name: 'Instant Meals', description: 'Cup noodles and quick savory cups' },
    { category_id: 10, category_name: 'Healthy & Trail Snacks', description: 'Granola bars, mixed nuts, and protein bites' },
  ];

  const suppliers: Supplier[] = [
    { supplier_id: 1, supplier_name: 'Mindanao Beverage Distributors Inc.', contact_person: 'Miguel Santos', contact_no: '088-856-1120', email: 'orders@minda-bev.ph', address: 'Puerto Industrial Park, CDO' },
    { supplier_id: 2, supplier_name: 'Crystal Spring Bottling Corp.', contact_person: 'Teresita Uy', contact_no: '088-857-2231', email: 'dispatch@crystalspring.ph', address: 'Tagoloan Highway, Misamis Oriental' },
    { supplier_id: 3, supplier_name: 'Pacific Tropics Refreshments', contact_person: 'Gino Alcantara', contact_no: '088-855-3342', email: 'sales@pacifictropics.ph', address: 'Opol Commercial Zone, Misamis Oriental' },
    { supplier_id: 4, supplier_name: 'Golden Harvest Snack Foods', contact_person: 'Marisol Cruz', contact_no: '088-858-4453', email: 'supply@goldenharvest.ph', address: 'Bulua Trade Center, CDO' },
    { supplier_id: 5, supplier_name: 'Metro Confectionery & Nuts Co.', contact_person: 'Kenneth Go', contact_no: '088-852-5564', email: 'b2b@metroconfections.ph', address: 'Osmeña Ext, CDO' },
    { supplier_id: 6, supplier_name: 'FastBite Pantry Wholesale', contact_person: 'Rhea Dizon', contact_no: '088-851-6675', email: 'wholesale@fastbite.ph', address: 'Carmen Market Strip, CDO' },
    { supplier_id: 7, supplier_name: 'Northern Mindanao Cold Chain', contact_person: 'Victor Ocampo', contact_no: '088-859-7786', email: 'logistics@nmcoldchain.ph', address: 'Phividec Estate, Villanueva' },
    { supplier_id: 8, supplier_name: 'Apex Packaging & Dry Goods', contact_person: 'Liza Ong', contact_no: '088-854-8897', email: 'orders@apexdrygoods.ph', address: 'Lapasan Warehouse Row, CDO' },
    { supplier_id: 9, supplier_name: 'SunValley Dairy & Coffee', contact_person: 'Noel Estrada', contact_no: '088-853-9908', email: 'trade@sunvalley.ph', address: 'Gusa Logistics Hub, CDO' },
    { supplier_id: 10, supplier_name: 'Oro Direct FMCG Trading', contact_person: 'Camille Sy', contact_no: '088-850-1019', email: 'accounts@orodirect.ph', address: 'Cogon Commercial District, CDO' },
  ];

  // Exact 12 products from PDF Page 18 (with complete unique SKUs)
  const products: Product[] = [
    { product_id: 1, sku: 'VT-P001', product_name: 'Cola 330ml Can', category_id: 1, supplier_id: 1, unit_cost: 18.0, unit_price: 25.0 },
    { product_id: 2, sku: 'VT-P002', product_name: 'Lemon-Lime Soda 330ml Can', category_id: 1, supplier_id: 1, unit_cost: 18.0, unit_price: 25.0 },
    { product_id: 3, sku: 'VT-P003', product_name: 'Purified Water 500ml', category_id: 2, supplier_id: 2, unit_cost: 8.0, unit_price: 15.0 },
    { product_id: 4, sku: 'VT-P004', product_name: 'Orange Juice 250ml', category_id: 3, supplier_id: 3, unit_cost: 14.0, unit_price: 22.0 },
    { product_id: 5, sku: 'VT-P005', product_name: 'Energy Drink 250ml', category_id: 4, supplier_id: 1, unit_cost: 22.0, unit_price: 35.0 },
    { product_id: 6, sku: 'VT-P006', product_name: 'Iced Coffee 240ml', category_id: 5, supplier_id: 3, unit_cost: 20.0, unit_price: 30.0 },
    { product_id: 7, sku: 'VT-P007', product_name: 'Potato Chips 60g', category_id: 6, supplier_id: 4, unit_cost: 20.0, unit_price: 30.0 },
    { product_id: 8, sku: 'VT-P008', product_name: 'Cheese Crackers 50g', category_id: 7, supplier_id: 4, unit_cost: 10.0, unit_price: 18.0 },
    { product_id: 9, sku: 'VT-P009', product_name: 'Chocolate Bar 40g', category_id: 8, supplier_id: 5, unit_cost: 15.0, unit_price: 25.0 },
    { product_id: 10, sku: 'VT-P010', product_name: 'Instant Cup Noodles 60g', category_id: 9, supplier_id: 6, unit_cost: 16.0, unit_price: 28.0 },
    { product_id: 11, sku: 'VT-P011', product_name: 'Granola Bar 35g', category_id: 10, supplier_id: 5, unit_cost: 14.0, unit_price: 25.0 },
    { product_id: 12, sku: 'VT-P012', product_name: 'Mixed Nuts 40g', category_id: 10, supplier_id: 4, unit_cost: 18.0, unit_price: 30.0 },
  ];

  const employees: Employee[] = [
    { employee_id: 1, first_name: 'Johnver', last_name: 'Ordeniza', role: 'Administrator', email: 'j.ordeniza@vendtrack.io', contact_no: '0917-101-2201', date_hired: '2024-05-10' },
    { employee_id: 2, first_name: 'Nicole Alexandra', last_name: 'Duyan', role: 'Manager', email: 'n.duyan@vendtrack.io', contact_no: '0917-101-2202', date_hired: '2024-06-14' },
    { employee_id: 3, first_name: 'Eliza Denise', last_name: 'Noble', role: 'Manager', email: 'e.noble@vendtrack.io', contact_no: '0917-101-2203', date_hired: '2024-07-01' },
    { employee_id: 4, first_name: 'Troy Gian', last_name: 'Tumampoc', role: 'Route Driver', email: 't.tumampoc@vendtrack.io', contact_no: '0918-202-3304', date_hired: '2024-08-19' },
    { employee_id: 5, first_name: 'Nathan', last_name: 'Zabala', role: 'Technician', email: 'n.zabala@vendtrack.io', contact_no: '0918-202-3305', date_hired: '2024-09-04' },
    { employee_id: 6, first_name: 'Carlo', last_name: 'Magno', role: 'Route Driver', email: 'c.magno@vendtrack.io', contact_no: '0919-303-4406', date_hired: '2025-01-12' },
    { employee_id: 7, first_name: 'Dennis', last_name: 'Pascual', role: 'Route Driver', email: 'd.pascual@vendtrack.io', contact_no: '0919-303-4407', date_hired: '2025-03-08' },
    { employee_id: 8, first_name: 'Arnel', last_name: 'Cabrera', role: 'Technician', email: 'a.cabrera@vendtrack.io', contact_no: '0920-404-5508', date_hired: '2025-04-22' },
    { employee_id: 9, first_name: 'Kevin', last_name: 'Mercado', role: 'Technician', email: 'k.mercado@vendtrack.io', contact_no: '0920-404-5509', date_hired: '2025-07-15' },
    { employee_id: 10, first_name: 'Sophia', last_name: 'Aquino', role: 'Administrator', email: 's.aquino@vendtrack.io', contact_no: '0917-505-6610', date_hired: '2025-09-01' },
  ];

  // 40 MACHINE_SLOT rows (4 slots per machine across 10 machines)
  // Several slots <= 20% capacity to demonstrate BR11 Low Stock alerts
  const machine_slots: MachineSlot[] = [
    // Machine 1 (Combo)
    { machine_id: 1, slot_no: 1, product_id: 1, quantity: 9, max_capacity: 12 },
    { machine_id: 1, slot_no: 2, product_id: 3, quantity: 2, max_capacity: 12 }, // Low stock (16.7%)
    { machine_id: 1, slot_no: 3, product_id: 7, quantity: 8, max_capacity: 10 },
    { machine_id: 1, slot_no: 4, product_id: 9, quantity: 2, max_capacity: 10 }, // Low stock (20%)
    // Machine 2 (Beverage)
    { machine_id: 2, slot_no: 1, product_id: 1, quantity: 10, max_capacity: 15 },
    { machine_id: 2, slot_no: 2, product_id: 2, quantity: 11, max_capacity: 15 },
    { machine_id: 2, slot_no: 3, product_id: 5, quantity: 3, max_capacity: 15 }, // Low stock (20%)
    { machine_id: 2, slot_no: 4, product_id: 6, quantity: 9, max_capacity: 12 },
    // Machine 3 (Beverage)
    { machine_id: 3, slot_no: 1, product_id: 3, quantity: 14, max_capacity: 15 },
    { machine_id: 3, slot_no: 2, product_id: 4, quantity: 10, max_capacity: 12 },
    { machine_id: 3, slot_no: 3, product_id: 5, quantity: 8, max_capacity: 12 },
    { machine_id: 3, slot_no: 4, product_id: 6, quantity: 1, max_capacity: 12 }, // Low stock (8.3%)
    // Machine 4 (Snack)
    { machine_id: 4, slot_no: 1, product_id: 7, quantity: 7, max_capacity: 10 },
    { machine_id: 4, slot_no: 2, product_id: 8, quantity: 9, max_capacity: 12 },
    { machine_id: 4, slot_no: 3, product_id: 9, quantity: 6, max_capacity: 10 },
    { machine_id: 4, slot_no: 4, product_id: 12, quantity: 2, max_capacity: 10 }, // Low stock (20%)
    // Machine 5 (Combo)
    { machine_id: 5, slot_no: 1, product_id: 1, quantity: 10, max_capacity: 12 },
    { machine_id: 5, slot_no: 2, product_id: 5, quantity: 7, max_capacity: 10 },
    { machine_id: 5, slot_no: 3, product_id: 10, quantity: 6, max_capacity: 8 },
    { machine_id: 5, slot_no: 4, product_id: 11, quantity: 9, max_capacity: 12 },
    // Machine 6 (Snack)
    { machine_id: 6, slot_no: 1, product_id: 8, quantity: 10, max_capacity: 12 },
    { machine_id: 6, slot_no: 2, product_id: 9, quantity: 8, max_capacity: 10 },
    { machine_id: 6, slot_no: 3, product_id: 11, quantity: 2, max_capacity: 12 }, // Low stock (16.7%)
    { machine_id: 6, slot_no: 4, product_id: 12, quantity: 7, max_capacity: 10 },
    // Machine 7 (Beverage)
    { machine_id: 7, slot_no: 1, product_id: 2, quantity: 12, max_capacity: 15 },
    { machine_id: 7, slot_no: 2, product_id: 3, quantity: 13, max_capacity: 15 },
    { machine_id: 7, slot_no: 3, product_id: 4, quantity: 8, max_capacity: 12 },
    { machine_id: 7, slot_no: 4, product_id: 6, quantity: 10, max_capacity: 12 },
    // Machine 8 (Combo - Under Maintenance)
    { machine_id: 8, slot_no: 1, product_id: 1, quantity: 5, max_capacity: 12 },
    { machine_id: 8, slot_no: 2, product_id: 3, quantity: 6, max_capacity: 12 },
    { machine_id: 8, slot_no: 3, product_id: 7, quantity: 4, max_capacity: 10 },
    { machine_id: 8, slot_no: 4, product_id: 10, quantity: 1, max_capacity: 8 }, // Low stock (12.5%)
    // Machine 9 (Combo - Under Maintenance)
    { machine_id: 9, slot_no: 1, product_id: 5, quantity: 6, max_capacity: 10 },
    { machine_id: 9, slot_no: 2, product_id: 6, quantity: 8, max_capacity: 12 },
    { machine_id: 9, slot_no: 3, product_id: 9, quantity: 5, max_capacity: 10 },
    { machine_id: 9, slot_no: 4, product_id: 11, quantity: 7, max_capacity: 12 },
    // Machine 10 (Snack - Offline)
    { machine_id: 10, slot_no: 1, product_id: 7, quantity: 0, max_capacity: 10 }, // Low stock (0%)
    { machine_id: 10, slot_no: 2, product_id: 8, quantity: 0, max_capacity: 12 }, // Low stock (0%)
    { machine_id: 10, slot_no: 3, product_id: 11, quantity: 4, max_capacity: 12 },
    { machine_id: 10, slot_no: 4, product_id: 12, quantity: 3, max_capacity: 10 },
  ];

  // 12 RESTOCK visits (only Route Drivers: employee_id 4, 6, 7)
  const restocks: Restock[] = [
    { restock_id: 1, machine_id: 1, employee_id: 4, restock_date: '2026-11-15' },
    { restock_id: 2, machine_id: 2, employee_id: 4, restock_date: '2026-11-16' },
    { restock_id: 3, machine_id: 3, employee_id: 6, restock_date: '2026-11-17' },
    { restock_id: 4, machine_id: 4, employee_id: 6, restock_date: '2026-11-18' },
    { restock_id: 5, machine_id: 5, employee_id: 7, restock_date: '2026-11-19' },
    { restock_id: 6, machine_id: 6, employee_id: 7, restock_date: '2026-11-20' },
    { restock_id: 7, machine_id: 7, employee_id: 4, restock_date: '2026-11-21' },
    { restock_id: 8, machine_id: 1, employee_id: 6, restock_date: '2026-11-22' },
    { restock_id: 9, machine_id: 2, employee_id: 7, restock_date: '2026-11-23' },
    { restock_id: 10, machine_id: 3, employee_id: 4, restock_date: '2026-11-24' },
    { restock_id: 11, machine_id: 5, employee_id: 6, restock_date: '2026-11-25' },
    { restock_id: 12, machine_id: 7, employee_id: 7, restock_date: '2026-11-26' },
  ];

  // 20 RESTOCK_ITEM rows (every product loaded in the corresponding machine)
  const restock_items: RestockItem[] = [
    { restock_id: 1, product_id: 1, quantity_added: 6 },
    { restock_id: 1, product_id: 7, quantity_added: 5 },
    { restock_id: 2, product_id: 1, quantity_added: 8 },
    { restock_id: 2, product_id: 2, quantity_added: 7 },
    { restock_id: 3, product_id: 3, quantity_added: 10 },
    { restock_id: 3, product_id: 4, quantity_added: 6 },
    { restock_id: 4, product_id: 7, quantity_added: 5 },
    { restock_id: 4, product_id: 8, quantity_added: 8 },
    { restock_id: 5, product_id: 1, quantity_added: 6 },
    { restock_id: 5, product_id: 10, quantity_added: 4 },
    { restock_id: 6, product_id: 8, quantity_added: 6 },
    { restock_id: 6, product_id: 9, quantity_added: 5 },
    { restock_id: 7, product_id: 2, quantity_added: 8 },
    { restock_id: 7, product_id: 3, quantity_added: 9 },
    { restock_id: 8, product_id: 1, quantity_added: 4 },
    { restock_id: 9, product_id: 6, quantity_added: 6 },
    { restock_id: 10, product_id: 5, quantity_added: 5 },
    { restock_id: 11, product_id: 5, quantity_added: 4 },
    { restock_id: 11, product_id: 11, quantity_added: 6 },
    { restock_id: 12, product_id: 6, quantity_added: 7 },
  ];

  // 12 SALE records (only Active machines 1..7)
  const sales: Sale[] = [
    { sale_id: 1, machine_id: 1, sale_datetime: '2026-11-24T09:15:00', payment_method: 'GCash' },
    { sale_id: 2, machine_id: 1, sale_datetime: '2026-11-24T11:42:00', payment_method: 'Cash' },
    { sale_id: 3, machine_id: 2, sale_datetime: '2026-11-24T14:20:00', payment_method: 'Coin' },
    { sale_id: 4, machine_id: 3, sale_datetime: '2026-11-25T10:05:00', payment_method: 'Card' },
    { sale_id: 5, machine_id: 3, sale_datetime: '2026-11-25T13:30:00', payment_method: 'GCash' },
    { sale_id: 6, machine_id: 4, sale_datetime: '2026-11-25T16:12:00', payment_method: 'Cash' },
    { sale_id: 7, machine_id: 5, sale_datetime: '2026-11-25T18:45:00', payment_method: 'GCash' },
    { sale_id: 8, machine_id: 6, sale_datetime: '2026-11-26T08:50:00', payment_method: 'Coin' },
    { sale_id: 9, machine_id: 7, sale_datetime: '2026-11-26T10:18:00', payment_method: 'GCash' },
    { sale_id: 10, machine_id: 2, sale_datetime: '2026-11-26T12:05:00', payment_method: 'Card' },
    { sale_id: 11, machine_id: 5, sale_datetime: '2026-11-26T15:40:00', payment_method: 'Cash' },
    { sale_id: 12, machine_id: 1, sale_datetime: '2026-11-26T17:22:00', payment_method: 'GCash' },
  ];

  // 16 SALE_ITEM records (loaded in that machine, with snapshot unit_price_at_sale)
  const sale_items: SaleItem[] = [
    { sale_id: 1, product_id: 1, quantity: 2, unit_price_at_sale: 25.0 },
    { sale_id: 1, product_id: 7, quantity: 1, unit_price_at_sale: 30.0 },
    { sale_id: 2, product_id: 3, quantity: 3, unit_price_at_sale: 15.0 },
    { sale_id: 3, product_id: 5, quantity: 2, unit_price_at_sale: 35.0 },
    { sale_id: 4, product_id: 3, quantity: 2, unit_price_at_sale: 15.0 },
    { sale_id: 4, product_id: 4, quantity: 1, unit_price_at_sale: 22.0 },
    { sale_id: 5, product_id: 6, quantity: 3, unit_price_at_sale: 30.0 },
    { sale_id: 6, product_id: 7, quantity: 2, unit_price_at_sale: 30.0 },
    { sale_id: 6, product_id: 9, quantity: 1, unit_price_at_sale: 25.0 },
    { sale_id: 7, product_id: 10, quantity: 2, unit_price_at_sale: 28.0 },
    { sale_id: 8, product_id: 8, quantity: 2, unit_price_at_sale: 18.0 },
    { sale_id: 9, product_id: 2, quantity: 2, unit_price_at_sale: 25.0 },
    { sale_id: 10, product_id: 6, quantity: 2, unit_price_at_sale: 30.0 },
    { sale_id: 11, product_id: 5, quantity: 1, unit_price_at_sale: 35.0 },
    { sale_id: 11, product_id: 11, quantity: 2, unit_price_at_sale: 25.0 },
    { sale_id: 12, product_id: 9, quantity: 2, unit_price_at_sale: 25.0 },
  ];

  // 10 MAINTENANCE records (only Technicians: employee_id 5, 8, 9)
  // Machines 8 and 9 have Open / In Progress tickets, matching machine_status = 'Under Maintenance' (BR12)
  const maintenance: Maintenance[] = [
    { maintenance_id: 1, machine_id: 1, employee_id: 5, issue_description: 'Bill validator sensor calibration drift', reported_date: '2026-10-12', resolved_date: '2026-10-13', maintenance_status: 'Resolved', repair_cost: 850.0 },
    { maintenance_id: 2, machine_id: 2, employee_id: 8, issue_description: 'Compressor relay replacement', reported_date: '2026-10-18', resolved_date: '2026-10-20', maintenance_status: 'Resolved', repair_cost: 2400.0 },
    { maintenance_id: 3, machine_id: 3, employee_id: 9, issue_description: 'GCash QR terminal antenna reseating', reported_date: '2026-10-25', resolved_date: '2026-10-25', maintenance_status: 'Resolved', repair_cost: 450.0 },
    { maintenance_id: 4, machine_id: 4, employee_id: 5, issue_description: 'Spiral motor #3 jam clearance', reported_date: '2026-11-02', resolved_date: '2026-11-03', maintenance_status: 'Resolved', repair_cost: 650.0 },
    { maintenance_id: 5, machine_id: 5, employee_id: 8, issue_description: 'Drop sensor optical lens cleaning', reported_date: '2026-11-06', resolved_date: '2026-11-06', maintenance_status: 'Resolved', repair_cost: 350.0 },
    { maintenance_id: 6, machine_id: 6, employee_id: 9, issue_description: 'Keypad ribbon cable replacement', reported_date: '2026-11-10', resolved_date: '2026-11-11', maintenance_status: 'Resolved', repair_cost: 1200.0 },
    { maintenance_id: 7, machine_id: 7, employee_id: 5, issue_description: 'Condenser fan bearing lubrication', reported_date: '2026-11-14', resolved_date: '2026-11-15', maintenance_status: 'Resolved', repair_cost: 950.0 },
    { maintenance_id: 8, machine_id: 10, employee_id: 8, issue_description: 'Main control board power surge inspection', reported_date: '2026-11-18', resolved_date: '2026-11-20', maintenance_status: 'Resolved', repair_cost: 3200.0 },
    { maintenance_id: 9, machine_id: 8, employee_id: 5, issue_description: 'Coin acceptor mechanism jammed & cooling thermostat fault', reported_date: '2026-11-24', resolved_date: null, maintenance_status: 'Open', repair_cost: null },
    { maintenance_id: 10, machine_id: 9, employee_id: 9, issue_description: 'Telemetry modem firmware re-flash & card reader test', reported_date: '2026-11-25', resolved_date: null, maintenance_status: 'In Progress', repair_cost: 750.0 },
  ];

  return {
    locations,
    machines,
    categories,
    suppliers,
    products,
    employees,
    machine_slots,
    restocks,
    restock_items,
    sales,
    sale_items,
    maintenance,
    counters: {
      location_id: 11,
      machine_id: 11,
      category_id: 11,
      supplier_id: 11,
      product_id: 13,
      employee_id: 11,
      restock_id: 13,
      sale_id: 13,
      maintenance_id: 11,
    },
  };
}
