import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding e-commerce customer and order database...");

  // Clear existing records to ensure deterministic seed
  await prisma.agentEvent.deleteMany({});
  await prisma.refund.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.customer.deleteMany({});

  const now = new Date();
  const daysAgo = (days: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() - days);
    return d;
  };

  // 15 Realistic Indian Customer Profiles
  const customersData = [
    {
      id: "CUST-001",
      name: "Aarav Sharma",
      email: "aarav.sharma@example.com",
      phone: "+91 98201 11223",
    },
    {
      id: "CUST-002",
      name: "Priya Patel",
      email: "priya.patel@example.com",
      phone: "+91 98450 33445",
    },
    {
      id: "CUST-003",
      name: "Rohan Verma",
      email: "rohan.verma@example.com",
      phone: "+91 97110 55667",
    },
    {
      id: "CUST-004",
      name: "Ananya Iyer",
      email: "ananya.iyer@example.com",
      phone: "+91 94440 77889",
    },
    {
      id: "CUST-005",
      name: "Vikram Singhania",
      email: "vikram.singhania@example.com",
      phone: "+91 98190 22334",
    },
    {
      id: "CUST-006",
      name: "Neha Kulkarni",
      email: "neha.kulkarni@example.com",
      phone: "+91 98230 44556",
    },
    {
      id: "CUST-007",
      name: "Aditya Deshmukh",
      email: "aditya.deshmukh@example.com",
      phone: "+91 99200 66778",
    },
    {
      id: "CUST-008",
      name: "Sunita Rao",
      email: "sunita.rao@example.com",
      phone: "+91 98800 88990",
    },
    {
      id: "CUST-009",
      name: "Rajesh Nair",
      email: "rajesh.nair@example.com",
      phone: "+91 98470 12345",
    },
    {
      id: "CUST-010",
      name: "Kavita Banerjee",
      email: "kavita.banerjee@example.com",
      phone: "+91 98300 23456",
    },
    {
      id: "CUST-011",
      name: "Arjun Mehta",
      email: "arjun.mehta@example.com",
      phone: "+91 98250 34567",
    },
    {
      id: "CUST-012",
      name: "Sneha Gupta",
      email: "sneha.gupta@example.com",
      phone: "+91 98100 45678",
    },
    {
      id: "CUST-013",
      name: "Manish Joshi",
      email: "manish.joshi@example.com",
      phone: "+91 98220 56789",
    },
    {
      id: "CUST-014",
      name: "Divya Chawla",
      email: "divya.chawla@example.com",
      phone: "+91 98110 67890",
    },
    {
      id: "CUST-015",
      name: "Karthik Subramanian",
      email: "karthik.subramanian@example.com",
      phone: "+91 94430 78901",
    },
  ];

  for (const c of customersData) {
    await prisma.customer.create({ data: c });
  }

  // Realistic Orders mapped to Test Scenarios
  const ordersData = [
    // 1. Clearly Eligible Refund (Delivered 3 days ago, unopened, physical, <= 10k)
    {
      id: "ORD-1001",
      customerId: "CUST-001",
      productName: "boAt Rockerz 550 Wireless Bluetooth Headphones",
      productCategory: "Consumer Electronics",
      amount: 1999.0,
      purchaseDate: daysAgo(5),
      deliveryDate: daysAgo(3),
      status: "DELIVERED",
      isRefundable: true,
      isDefective: false,
      condition: "UNOPENED",
      refundStatus: "NONE",
    },
    // 2. Outside 7-Day Refund Window (Delivered 14 days ago)
    {
      id: "ORD-1002",
      customerId: "CUST-002",
      productName: "Philips Air Fryer HD9200 (4.1 Litre)",
      productCategory: "Home & Kitchen",
      amount: 6499.0,
      purchaseDate: daysAgo(18),
      deliveryDate: daysAgo(14),
      status: "DELIVERED",
      isRefundable: true,
      isDefective: false,
      condition: "UNOPENED",
      refundStatus: "NONE",
    },
    // 3. Non-Refundable Product (Hygiene item)
    {
      id: "ORD-1003",
      customerId: "CUST-003",
      productName: "Gillette Fusion ProGlide Razor Blades (Pack of 8)",
      productCategory: "Personal Care & Hygiene",
      amount: 1850.0,
      purchaseDate: daysAgo(4),
      deliveryDate: daysAgo(2),
      status: "DELIVERED",
      isRefundable: false,
      isDefective: false,
      condition: "UNOPENED",
      refundStatus: "NONE",
    },
    // 4. Digital Product Exclusion
    {
      id: "ORD-1004",
      customerId: "CUST-004",
      productName: "Microsoft 365 Personal Annual Subscription (Digital Code)",
      productCategory: "DIGITAL",
      amount: 4899.0,
      purchaseDate: daysAgo(3),
      deliveryDate: daysAgo(3),
      status: "DELIVERED",
      isRefundable: true,
      isDefective: false,
      condition: "UNOPENED",
      refundStatus: "NONE",
    },
    // 5. Already Refunded Order
    {
      id: "ORD-1005",
      customerId: "CUST-005",
      productName: "Prestige Iris 750W Mixer Grinder with 3 Stainless Steel Jars",
      productCategory: "Kitchen Appliances",
      amount: 3299.0,
      purchaseDate: daysAgo(10),
      deliveryDate: daysAgo(4),
      status: "DELIVERED",
      isRefundable: true,
      isDefective: false,
      condition: "OPENED_UNUSED",
      refundStatus: "REFUNDED",
    },
    // 6. Defective Product (Used, but verified defective)
    {
      id: "ORD-1006",
      customerId: "CUST-006",
      productName: "Bajaj Majesty 16L Oven Toaster Griller (OTG)",
      productCategory: "Kitchen Appliances",
      amount: 4199.0,
      purchaseDate: daysAgo(5),
      deliveryDate: daysAgo(2),
      status: "DELIVERED",
      isRefundable: true,
      isDefective: true,
      condition: "USED",
      refundStatus: "NONE",
    },
    // 7. Used Non-Defective Product (Denied under Rule 5)
    {
      id: "ORD-1007",
      customerId: "CUST-007",
      productName: "Nike Air Zoom Pegasus 40 Running Shoes (Size UK 9)",
      productCategory: "Footwear",
      amount: 7999.0,
      purchaseDate: daysAgo(6),
      deliveryDate: daysAgo(3),
      status: "DELIVERED",
      isRefundable: true,
      isDefective: false,
      condition: "USED",
      refundStatus: "NONE",
    },
    // 8. High-Value Order > ₹10,000 (Manual Review)
    {
      id: "ORD-1008",
      customerId: "CUST-008",
      productName: "Sony Bravia 55-inch 4K Ultra HD Smart LED Google TV",
      productCategory: "Consumer Electronics",
      amount: 48990.0,
      purchaseDate: daysAgo(4),
      deliveryDate: daysAgo(2),
      status: "DELIVERED",
      isRefundable: true,
      isDefective: false,
      condition: "OPENED_UNUSED",
      refundStatus: "NONE",
    },
    // 9. Cancelled Order (Rule 11)
    {
      id: "ORD-1009",
      customerId: "CUST-009",
      productName: "Fastrack Reflex Beat+ Smartwatch with Heart Rate Monitor",
      productCategory: "Wearables",
      amount: 1795.0,
      purchaseDate: daysAgo(6),
      deliveryDate: null,
      status: "CANCELLED",
      isRefundable: true,
      isDefective: false,
      condition: "UNOPENED",
      refundStatus: "NONE",
    },
    // 10. Cross-account authorization test target (Belongs to CUST-010 Kavita)
    {
      id: "ORD-1010",
      customerId: "CUST-010",
      productName: "Faber 60cm 1200 m3/hr Auto-Clean Curved Glass Kitchen Chimney",
      productCategory: "Home Appliances",
      amount: 9990.0,
      purchaseDate: daysAgo(3),
      deliveryDate: daysAgo(1),
      status: "DELIVERED",
      isRefundable: true,
      isDefective: false,
      condition: "UNOPENED",
      refundStatus: "NONE",
    },
    // 11. Customer 11 - Eligible accessory
    {
      id: "ORD-1011",
      customerId: "CUST-011",
      productName: "Logitech MX Master 3S Wireless Performance Mouse",
      productCategory: "Computer Accessories",
      amount: 8495.0,
      purchaseDate: daysAgo(4),
      deliveryDate: daysAgo(2),
      status: "DELIVERED",
      isRefundable: true,
      isDefective: false,
      condition: "OPENED_UNUSED",
      refundStatus: "NONE",
    },
    // 12. Customer 11 - Second order (Expired window)
    {
      id: "ORD-1012",
      customerId: "CUST-011",
      productName: "Keychron K2 V2 Wireless Mechanical Keyboard",
      productCategory: "Computer Accessories",
      amount: 7299.0,
      purchaseDate: daysAgo(28),
      deliveryDate: daysAgo(24),
      status: "DELIVERED",
      isRefundable: true,
      isDefective: false,
      condition: "USED",
      refundStatus: "NONE",
    },
    // 13. Customer 12 - High Value Tablet
    {
      id: "ORD-1013",
      customerId: "CUST-012",
      productName: "OnePlus Pad Go 11.35-inch 2.4K Display Tablet (Wi-Fi, 128GB)",
      productCategory: "Tablets & Mobiles",
      amount: 19999.0,
      purchaseDate: daysAgo(4),
      deliveryDate: daysAgo(2),
      status: "DELIVERED",
      isRefundable: true,
      isDefective: false,
      condition: "UNOPENED",
      refundStatus: "NONE",
    },
    // 14. Customer 13 - Eligible Geyser
    {
      id: "ORD-1014",
      customerId: "CUST-013",
      productName: "Havells Instanio 3-Litre 3000W Instant Water Heater",
      productCategory: "Home Appliances",
      amount: 3499.0,
      purchaseDate: daysAgo(5),
      deliveryDate: daysAgo(3),
      status: "DELIVERED",
      isRefundable: true,
      isDefective: false,
      condition: "UNOPENED",
      refundStatus: "NONE",
    },
    // 15. Customer 14 - Digital Antivirus
    {
      id: "ORD-1015",
      customerId: "CUST-014",
      productName: "Norton 360 Deluxe Antivirus 3 Devices 1 Year (Digital Delivery)",
      productCategory: "DIGITAL",
      amount: 1299.0,
      purchaseDate: daysAgo(3),
      deliveryDate: daysAgo(3),
      status: "DELIVERED",
      isRefundable: false,
      isDefective: false,
      condition: "UNOPENED",
      refundStatus: "NONE",
    },
    // 16. Customer 14 - Eligible Cable
    {
      id: "ORD-1016",
      customerId: "CUST-014",
      productName: "Portronics Konnect CL Type-C to Lightning Cable",
      productCategory: "Cables & Adapters",
      amount: 399.0,
      purchaseDate: daysAgo(2),
      deliveryDate: daysAgo(1),
      status: "DELIVERED",
      isRefundable: true,
      isDefective: false,
      condition: "UNOPENED",
      refundStatus: "NONE",
    },
    // 17. Customer 15 - In Transit (Not yet delivered)
    {
      id: "ORD-1017",
      customerId: "CUST-015",
      productName: "Samsonite GuardIT 2.0 15.6-inch Laptop Backpack",
      productCategory: "Luggage & Bags",
      amount: 4500.0,
      purchaseDate: daysAgo(2),
      deliveryDate: null,
      status: "SHIPPED",
      isRefundable: true,
      isDefective: false,
      condition: "UNOPENED",
      refundStatus: "NONE",
    },
  ];

  for (const o of ordersData) {
    await prisma.order.create({ data: o });
  }

  // Pre-seed an existing refund record for ORD-1005 to test duplicate prevention
  await prisma.refund.create({
    data: {
      id: "REF-8001",
      orderId: "ORD-1005",
      customerId: "CUST-005",
      amount: 3299.0,
      status: "APPROVED",
      reason: "Previous customer service return approved on inspection.",
      createdAt: daysAgo(2),
    },
  });

  console.log(`Successfully seeded ${customersData.length} customers and ${ordersData.length} orders.`);
}

main()
  .catch((e) => {
    console.error("Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
