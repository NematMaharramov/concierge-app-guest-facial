import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Cleaning existing data...');
  await prisma.auditLog.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.serviceImage.deleteMany();
  await prisma.service.deleteMany();
  await prisma.category.deleteMany();
  await prisma.siteSettings.deleteMany();
  console.log('✅ Clean complete, seeding...');

  const adminPassword = await bcrypt.hash('Admin@2024!', 10);
  await prisma.user.upsert({
    where: { email: 'admin@raffles-concierge.com' },
    update: {},
    create: { email: 'admin@raffles-concierge.com', password: adminPassword, name: 'Administrator', role: Role.ADMIN },
  });

  const conciergePassword = await bcrypt.hash('Concierge@2024!', 10);
  await prisma.user.upsert({
    where: { email: 'concierge@raffles-concierge.com' },
    update: {},
    create: { email: 'concierge@raffles-concierge.com', password: conciergePassword, name: 'Concierge Staff', role: Role.CONCIERGE },
  });

  // ── Categories ──────────────────────────────────────────────────
  const taxiCat = await prisma.category.create({ data: { name: 'Taxi & Transfers', slug: 'taxi-transfers', description: 'Private taxi and transfer services across Praslin and neighbouring islands', sortOrder: 1, icon: '🚗' } });
  const boatCat = await prisma.category.create({ data: { name: 'Boat Excursions', slug: 'boat-excursions', description: 'Private and group boat trips, island hopping and fishing charters', sortOrder: 2, icon: '⛵' } });
  const catamaranCat = await prisma.category.create({ data: { name: 'Catamaran & Large Vessels', slug: 'catamaran', description: 'Luxury catamaran charters for larger groups', sortOrder: 3, icon: '🛥️' } });
  const carRentalCat = await prisma.category.create({ data: { name: 'Car Rental', slug: 'car-rental', description: 'Self-drive car and mini moke rental including insurance', sortOrder: 4, icon: '🔑' } });
  const golfCat = await prisma.category.create({ data: { name: 'Golf', slug: 'golf', description: 'Golf at Constance Lemuria — fees paid directly by guest', sortOrder: 5, icon: '⛳' } });
  const helicopterCat = await prisma.category.create({ data: { name: 'Helicopter Transfers', slug: 'helicopter', description: 'Scenic and inter-island helicopter flights via Zil Air', sortOrder: 6, icon: '🚁' } });

  // ── Taxi Services ────────────────────────────────────────────────
  await prisma.service.createMany({ data: [
    { categoryId: taxiCat.id, name: 'Raffles to Jetty', contactName: 'Jose / Francis / Kenny / Colin', contactPhone: '2511142 / 2511174 / 2620608 / 2510707', description: 'Private taxi transfer from Raffles to the Jetty for up to 4 passengers.', priceInfo: '€45 one way / €90 return', priceAmount: 45, priceCurrency: 'EUR', details: { oneWay: 45, return: 90, maxPax: 4 }, sortOrder: 1 },
    { categoryId: taxiCat.id, name: 'Raffles to Airport', contactName: 'Jose / Francis / Kenny / Colin', contactPhone: '2511142 / 2511174 / 2620608 / 2510707', description: 'Private taxi transfer from Raffles to Praslin Airport for up to 4 passengers.', priceInfo: '€80 one way / €160 return', priceAmount: 80, priceCurrency: 'EUR', details: { oneWay: 80, return: 160, maxPax: 4 }, sortOrder: 2 },
    { categoryId: taxiCat.id, name: 'Raffles to Anse Lazio', contactName: 'Jose / Francis / Kenny / Colin', contactPhone: '2511142 / 2511174 / 2620608 / 2510707', description: 'Private taxi transfer from Raffles to the stunning Anse Lazio beach.', priceInfo: '€20 one way / €40 return', priceAmount: 20, priceCurrency: 'EUR', sortOrder: 3 },
    { categoryId: taxiCat.id, name: "Raffles to Côte D'Or", contactName: 'Jose / Francis / Kenny / Colin', contactPhone: '2511142 / 2511174 / 2620608 / 2510707', description: "Private taxi to Côte D'Or beach area.", priceInfo: '€25 one way / €50 return', priceAmount: 25, priceCurrency: 'EUR', sortOrder: 4 },
    { categoryId: taxiCat.id, name: 'Raffles to Vallée de Mai', contactName: 'Jose / Francis / Kenny / Colin', contactPhone: '2511142 / 2511174 / 2620608 / 2510707', description: 'Private taxi to the UNESCO World Heritage Vallée de Mai.', priceInfo: '€50 one way / €100 return', priceAmount: 50, priceCurrency: 'EUR', sortOrder: 5 },
    { categoryId: taxiCat.id, name: 'Raffles to Fond Ferdinand', contactName: 'Jose / Francis / Kenny / Colin', contactPhone: '2511142 / 2511174 / 2620608 / 2510707', description: 'Private taxi to Fond Ferdinand Nature Reserve.', priceInfo: '€75 one way / €150 return', priceAmount: 75, priceCurrency: 'EUR', sortOrder: 6 },
    { categoryId: taxiCat.id, name: 'Raffles to Constance Lemuria', contactName: 'Jose / Francis / Kenny / Colin', contactPhone: '2511142 / 2511174 / 2620608 / 2510707', description: 'Private taxi to Constance Lemuria Resort.', priceInfo: '€90 one way / €180 return', priceAmount: 90, priceCurrency: 'EUR', sortOrder: 7 },
    { categoryId: taxiCat.id, name: 'Raffles to Grand Anse', contactName: 'Jose / Francis / Kenny / Colin', contactPhone: '2511142 / 2511174 / 2620608 / 2510707', description: 'Private taxi to Grand Anse beach.', priceInfo: '€75 one way / €150 return', priceAmount: 75, priceCurrency: 'EUR', sortOrder: 8 },
    { categoryId: taxiCat.id, name: 'Full Day Island Tour – Taxi (7 hrs)', contactName: 'Jose / Francis / Kenny / MCTOUR', contactPhone: '2511142 / 2511174 / 2620608 / 2535389', description: 'Full-day private island tour by taxi, up to 7 hours.', priceInfo: '€225 per vehicle', priceAmount: 225, priceCurrency: 'EUR', sortOrder: 9 },
    { categoryId: taxiCat.id, name: 'Half Day Island Tour – Taxi (4 hrs)', contactName: 'Jose / Francis / Kenny / MCTOUR', contactPhone: '2511142 / 2511174 / 2620608 / 2535389', description: 'Half-day private island tour by taxi, up to 4 hours.', priceInfo: '€150 per vehicle', priceAmount: 150, priceCurrency: 'EUR', sortOrder: 10 },
    { categoryId: taxiCat.id, name: 'HIACE to Jetty (up to 12 pax)', contactName: 'MCTOUR', contactPhone: '2535389', description: 'Private HiAce minibus transfer to the Jetty for groups up to 12 passengers.', priceInfo: '€75 one way / €150 return', priceAmount: 75, priceCurrency: 'EUR', sortOrder: 11 },
    { categoryId: taxiCat.id, name: 'HIACE to Airport (up to 12 pax)', contactName: 'MCTOUR', contactPhone: '2535389', description: 'Private HiAce minibus transfer to Praslin Airport for groups up to 12 passengers.', priceInfo: '€110 one way / €220 return', priceAmount: 110, priceCurrency: 'EUR', sortOrder: 12 },
    { categoryId: taxiCat.id, name: 'HIACE Full Day Tour (7 hrs)', contactName: 'MCTOUR', contactPhone: '2535389', description: 'Full-day group island tour by HiAce minibus, up to 12 pax.', priceInfo: '€290 per vehicle', priceAmount: 290, priceCurrency: 'EUR', sortOrder: 13 },
    { categoryId: taxiCat.id, name: 'HIACE Half Day Tour (4 hrs)', contactName: 'MCTOUR', contactPhone: '2535389', description: 'Half-day group island tour by HiAce minibus, up to 12 pax.', priceInfo: '€200 per vehicle', priceAmount: 200, priceCurrency: 'EUR', sortOrder: 14 },
  ]});

  // ── Boat Excursions ──────────────────────────────────────────────
  await prisma.service.createMany({ data: [
    { categoryId: boatCat.id, name: 'Curieuse Island (2 pax)', contactName: 'Bruno', contactPhone: '2829435', description: 'Private boat excursion to Curieuse Island for 2 passengers.', priceInfo: '€175', priceAmount: 175, priceCurrency: 'EUR', sortOrder: 1 },
    { categoryId: boatCat.id, name: 'Curieuse Island (4 pax)', contactName: 'Bruno', contactPhone: '2829435', description: 'Boat trip to Curieuse Island for 4 passengers.', priceInfo: '€350', priceAmount: 350, priceCurrency: 'EUR', sortOrder: 2 },
    { categoryId: boatCat.id, name: 'La Digue Day Trip (4 pax)', contactName: 'Bruno', contactPhone: '2829435', description: 'Day trip to La Digue Island for 4 passengers.', priceInfo: '€350', priceAmount: 350, priceCurrency: 'EUR', sortOrder: 3 },
    { categoryId: boatCat.id, name: 'Curieuse + La Digue (4 pax)', contactName: 'Bruno', contactPhone: '2829435', description: 'Combined Curieuse and La Digue Island tour for 4 passengers.', priceInfo: '€525', priceAmount: 525, priceCurrency: 'EUR', sortOrder: 4 },
    { categoryId: boatCat.id, name: 'Half Day Island Hopping & Snorkeling (4 pax)', contactName: 'Bruno', contactPhone: '2829435', description: 'Half-day island hopping and snorkeling for 4 passengers.', priceInfo: '€520', priceAmount: 520, priceCurrency: 'EUR', sortOrder: 5 },
    { categoryId: boatCat.id, name: 'Full Day Island Hopping & Snorkeling (4 pax)', contactName: 'Bruno', contactPhone: '2829435', description: 'Full-day island hopping and snorkeling for 4 passengers.', priceInfo: '€700', priceAmount: 700, priceCurrency: 'EUR', sortOrder: 6 },
    { categoryId: boatCat.id, name: 'Curieuse Island – Big Boat (8 pax)', contactName: 'Bruno', contactPhone: '2829435', description: 'Curieuse Island excursion on a larger vessel for up to 8 passengers.', priceInfo: '€600', priceAmount: 600, priceCurrency: 'EUR', sortOrder: 7 },
    { categoryId: boatCat.id, name: 'La Digue – Big Boat (8 pax)', contactName: 'Bruno', contactPhone: '2829435', description: 'La Digue day trip on a larger vessel for up to 8 passengers.', priceInfo: '€700', priceAmount: 700, priceCurrency: 'EUR', sortOrder: 8 },
    { categoryId: boatCat.id, name: 'Half Day Island Hopping & Snorkeling (8 pax)', contactName: 'Bruno', contactPhone: '2829435', description: 'Half-day island hopping and snorkeling for up to 8 passengers.', priceInfo: '€800', priceAmount: 800, priceCurrency: 'EUR', sortOrder: 9 },
    { categoryId: boatCat.id, name: 'Full Day Island Hopping & Snorkeling (8 pax)', contactName: 'Bruno', contactPhone: '2829435', description: 'Full-day island hopping and snorkeling for up to 8 passengers.', priceInfo: '€1,050', priceAmount: 1050, priceCurrency: 'EUR', sortOrder: 10 },
    { categoryId: boatCat.id, name: 'Half Day Fishing (8 pax)', contactName: 'Bruno', contactPhone: '2829435', description: 'Half-day deep-sea fishing for up to 8 passengers.', priceInfo: '€950', priceAmount: 950, priceCurrency: 'EUR', sortOrder: 11 },
    { categoryId: boatCat.id, name: 'Full Day Fishing (8 pax)', contactName: 'Bruno', contactPhone: '2829435', description: 'Full-day deep-sea fishing for up to 8 passengers.', priceInfo: '€1,250', priceAmount: 1250, priceCurrency: 'EUR', sortOrder: 12 },
    { categoryId: boatCat.id, name: 'Full Day Fishing + Island Hopping (8 pax)', contactName: 'Bruno', contactPhone: '2829435', description: 'Combined fishing, island hopping and snorkeling for 8 passengers.', priceInfo: '€1,600', priceAmount: 1600, priceCurrency: 'EUR', sortOrder: 13 },
    { categoryId: boatCat.id, name: 'Half Day Island Hopping – Summer Dream (6 pax)', contactName: 'Michel / Bernadette', contactPhone: '2535389 / 2525310', description: 'Half-day island hopping on the Summer Dream for up to 6 passengers.', priceInfo: '€500', priceAmount: 500, priceCurrency: 'EUR', sortOrder: 14 },
    { categoryId: boatCat.id, name: 'Full Day Island Hopping – Summer Dream (6 pax)', contactName: 'Michel / Bernadette', contactPhone: '2535389 / 2525310', description: 'Full-day island hopping on the Summer Dream for up to 6 passengers.', priceInfo: '€650', priceAmount: 650, priceCurrency: 'EUR', sortOrder: 15 },
    { categoryId: boatCat.id, name: 'Sunset Cruise – Summer Dream (6 pax)', contactName: 'Michel / Bernadette', contactPhone: '2535389 / 2525310', description: 'Sunset cruise on the Summer Dream for up to 6 passengers.', priceInfo: '€500', priceAmount: 500, priceCurrency: 'EUR', sortOrder: 16 },
    { categoryId: boatCat.id, name: 'La Digue – Summer Dream (6 pax)', contactName: 'Michel / Bernadette', contactPhone: '2535389 / 2525310', description: 'La Digue day trip on the Summer Dream for up to 6 passengers.', priceInfo: '€350', priceAmount: 350, priceCurrency: 'EUR', sortOrder: 17 },
    { categoryId: boatCat.id, name: 'Aride Island – Summer Dream (6 pax)', contactName: 'Michel / Bernadette', contactPhone: '2535389 / 2525310', description: 'Day trip to Aride Island nature reserve for up to 6 passengers.', priceInfo: '€500', priceAmount: 500, priceCurrency: 'EUR', sortOrder: 18 },
    { categoryId: boatCat.id, name: 'Full Day Fishing – Summer Dream (6 pax)', contactName: 'Michel / Bernadette', contactPhone: '2535389 / 2525310', description: 'Full-day deep-sea fishing on the Summer Dream for up to 6 passengers.', priceInfo: '€1,000', priceAmount: 1000, priceCurrency: 'EUR', sortOrder: 19 },
    { categoryId: boatCat.id, name: 'Half Day Fishing – Summer Dream (6 pax)', contactName: 'Michel / Bernadette', contactPhone: '2535389 / 2525310', description: 'Half-day fishing on the Summer Dream for up to 6 passengers.', priceInfo: '€900', priceAmount: 900, priceCurrency: 'EUR', sortOrder: 20 },
  ]});

  // ── Catamaran ────────────────────────────────────────────────────
  await prisma.service.createMany({ data: [
    { categoryId: catamaranCat.id, name: 'Endless Summer – Half Day Island Hopping (10 pax)', contactName: 'Michel / Bernadette', contactPhone: '2535389 / 2525310', description: 'Half-day island hopping on the Endless Summer catamaran for up to 10 passengers.', priceInfo: '€900', priceAmount: 900, priceCurrency: 'EUR', sortOrder: 1 },
    { categoryId: catamaranCat.id, name: 'Endless Summer – Full Day Island Hopping (10 pax)', contactName: 'Michel / Bernadette', contactPhone: '2535389 / 2525310', description: 'Full-day island hopping on the Endless Summer catamaran for up to 10 passengers.', priceInfo: '€1,300', priceAmount: 1300, priceCurrency: 'EUR', sortOrder: 2 },
    { categoryId: catamaranCat.id, name: 'Endless Summer – Sunset Cruise (10 pax)', contactName: 'Michel / Bernadette', contactPhone: '2535389 / 2525310', description: 'Sunset cruise on the Endless Summer for up to 10 passengers.', priceInfo: '€900', priceAmount: 900, priceCurrency: 'EUR', sortOrder: 3 },
    { categoryId: catamaranCat.id, name: 'Endless Summer – La Digue (10 pax)', contactName: 'Michel / Bernadette', contactPhone: '2535389 / 2525310', description: 'La Digue day trip on the Endless Summer for up to 10 passengers.', priceInfo: '€750', priceAmount: 750, priceCurrency: 'EUR', sortOrder: 4 },
    { categoryId: catamaranCat.id, name: 'Endless Summer – Full Day Fishing (10 pax)', contactName: 'Michel / Bernadette', contactPhone: '2535389 / 2525310', description: 'Full-day fishing on the Endless Summer for up to 10 passengers.', priceInfo: '€1,400', priceAmount: 1400, priceCurrency: 'EUR', sortOrder: 5 },
    { categoryId: catamaranCat.id, name: 'Endless Summer – Half Day Fishing (10 pax)', contactName: 'Michel / Bernadette', contactPhone: '2535389 / 2525310', description: 'Half-day fishing on the Endless Summer for up to 10 passengers.', priceInfo: '€1,000', priceAmount: 1000, priceCurrency: 'EUR', sortOrder: 6 },
    { categoryId: catamaranCat.id, name: 'Summer Cruz – Half Day Island Hopping (15 pax)', contactName: 'Michel / Bernadette', contactPhone: '2535389 / 2525310', description: 'Half-day island hopping on the Summer Cruz (sea scooters included) for up to 15 passengers.', priceInfo: '€4,000', priceAmount: 4000, priceCurrency: 'EUR', sortOrder: 7 },
    { categoryId: catamaranCat.id, name: 'Summer Cruz – Full Day Island Hopping (15 pax)', contactName: 'Michel / Bernadette', contactPhone: '2535389 / 2525310', description: 'Full-day island hopping on the Summer Cruz for up to 15 passengers.', priceInfo: '€5,000', priceAmount: 5000, priceCurrency: 'EUR', sortOrder: 8 },
    { categoryId: catamaranCat.id, name: 'Summer Cruz – Sunset Cruise (15 pax)', contactName: 'Michel / Bernadette', contactPhone: '2535389 / 2525310', description: 'Sunset cruise on the Summer Cruz for up to 15 passengers.', priceInfo: '€4,000', priceAmount: 4000, priceCurrency: 'EUR', sortOrder: 9 },
    { categoryId: catamaranCat.id, name: 'Summer Cruz – La Digue (15 pax)', contactName: 'Michel / Bernadette', contactPhone: '2535389 / 2525310', description: 'La Digue day trip on the Summer Cruz for up to 15 passengers.', priceInfo: '€1,500', priceAmount: 1500, priceCurrency: 'EUR', sortOrder: 10 },
    { categoryId: catamaranCat.id, name: 'Summer Cruz – Full Day Fishing (15 pax)', contactName: 'Michel / Bernadette', contactPhone: '2535389 / 2525310', description: 'Full-day fishing on the Summer Cruz for up to 15 passengers.', priceInfo: '€5,000', priceAmount: 5000, priceCurrency: 'EUR', sortOrder: 11 },
    { categoryId: catamaranCat.id, name: 'Catamaran – Endless Summer Charter (14 pax)', contactName: 'Jurgen', contactPhone: '2711689', description: 'Catamaran charter — book 24h in advance. Up to 14 passengers.', priceInfo: '€1,500', priceAmount: 1500, priceCurrency: 'EUR', sortOrder: 12 },
    { categoryId: catamaranCat.id, name: 'Catamaran – Island Cat Charter (16 pax)', contactName: 'Joel', contactPhone: '2514034', description: 'Island Cat catamaran charter — book 24h in advance. Up to 16 passengers.', priceInfo: '€1,500', priceAmount: 1500, priceCurrency: 'EUR', sortOrder: 13 },
  ]});

  // ── Car Rental ───────────────────────────────────────────────────
  await prisma.service.createMany({ data: [
    { categoryId: carRentalCat.id, name: 'Mini Moke – 24h Rental', contactName: 'Randy', contactPhone: '2515582', description: 'Classic Mini Moke open-air car rental per 24-hour period.', priceInfo: '€75 / 24h', priceAmount: 75, priceCurrency: 'EUR', sortOrder: 1 },
    { categoryId: carRentalCat.id, name: 'Small Car – Daily Rental', contactName: 'Capricorn / Kenny', contactPhone: '+248 2 581 110 / +248 2788700', description: 'Small car rental including full insurance.', priceInfo: '€70 / day', priceAmount: 70, priceCurrency: 'EUR', sortOrder: 2 },
    { categoryId: carRentalCat.id, name: 'Medium Car – Daily Rental', contactName: 'Capricorn / Kenny', contactPhone: '+248 2 581 110 / +248 2788700', description: 'Medium car rental including full insurance.', priceInfo: '€100 / day', priceAmount: 100, priceCurrency: 'EUR', sortOrder: 3 },
    { categoryId: carRentalCat.id, name: 'Deluxe Car – Daily Rental', contactName: 'Capricorn / Kenny', contactPhone: '+248 2 581 110 / +248 2788700', description: 'Deluxe car rental including full insurance.', priceInfo: '€100 / day', priceAmount: 100, priceCurrency: 'EUR', sortOrder: 4 },
    { categoryId: carRentalCat.id, name: '7-Seater – Daily Rental', contactName: 'Capricorn / Kenny', contactPhone: '+248 2 581 110 / +248 2788700', description: '7-seater vehicle rental including full insurance.', priceInfo: '€125 / day', priceAmount: 125, priceCurrency: 'EUR', sortOrder: 5 },
  ]});

  // ── Golf ─────────────────────────────────────────────────────────
  await prisma.service.createMany({ data: [
    { categoryId: golfCat.id, name: 'Golf – 18 Holes', contactName: 'Constance Lemuria', contactPhone: '4281281', description: 'Championship 18-hole golf at Constance Lemuria. Guest pays directly.', priceInfo: '3,200 SCR per round', priceAmount: 3200, priceCurrency: 'SCR', sortOrder: 1 },
    { categoryId: golfCat.id, name: 'Golf – 9 Holes', contactName: 'Constance Lemuria', contactPhone: '4281281', description: '9-hole golf at Constance Lemuria. Guest pays directly.', priceInfo: '2,200 SCR per round', priceAmount: 2200, priceCurrency: 'SCR', sortOrder: 2 },
    { categoryId: golfCat.id, name: 'Driving Range – Grade A (10 balls)', contactName: 'Constance Lemuria', contactPhone: '4281281', description: 'Driving range practice — 10 balls, Grade A.', priceInfo: '350 SCR', priceAmount: 350, priceCurrency: 'SCR', sortOrder: 3 },
    { categoryId: golfCat.id, name: 'Driving Range – Grade B (10 balls)', contactName: 'Constance Lemuria', contactPhone: '4281281', description: 'Driving range practice — 10 balls, Grade B.', priceInfo: '250 SCR', priceAmount: 250, priceCurrency: 'SCR', sortOrder: 4 },
  ]});

  // ── Helicopter ───────────────────────────────────────────────────
  await prisma.service.createMany({ data: [
    { categoryId: helicopterCat.id, name: 'Praslin Airport to Raffles', contactName: 'Zil Air', contactPhone: '4375100', description: 'Helicopter transfer from Praslin Airport to Raffles Praslin.', priceInfo: '€974', priceAmount: 974, priceCurrency: 'EUR', sortOrder: 1 },
    { categoryId: helicopterCat.id, name: 'Mahé Airport to Raffles', contactName: 'Zil Air', contactPhone: '4375100', description: 'Helicopter transfer from Mahé Airport to Raffles Praslin.', priceInfo: '€978', priceAmount: 978, priceCurrency: 'EUR', sortOrder: 2 },
    { categoryId: helicopterCat.id, name: 'La Digue to Raffles', contactName: 'Zil Air', contactPhone: '4375100', description: 'Helicopter transfer from La Digue to Raffles Praslin.', priceInfo: '€1,154', priceAmount: 1154, priceCurrency: 'EUR', sortOrder: 3 },
    { categoryId: helicopterCat.id, name: 'Lemuria to Raffles', contactName: 'Zil Air', contactPhone: '4375100', description: 'Helicopter transfer from Constance Lemuria to Raffles Praslin.', priceInfo: '€998', priceAmount: 998, priceCurrency: 'EUR', sortOrder: 4 },
    { categoryId: helicopterCat.id, name: 'Félicité to Raffles', contactName: 'Zil Air', contactPhone: '4375100', description: 'Helicopter transfer from Félicité Island to Raffles Praslin.', priceInfo: '€1,272', priceAmount: 1272, priceCurrency: 'EUR', sortOrder: 5 },
    { categoryId: helicopterCat.id, name: 'North Island to Raffles', contactName: 'Zil Air', contactPhone: '4375100', description: 'Helicopter transfer from North Island to Raffles Praslin.', priceInfo: '€1,506', priceAmount: 1506, priceCurrency: 'EUR', sortOrder: 6 },
    { categoryId: helicopterCat.id, name: 'Silhouette to Raffles', contactName: 'Zil Air', contactPhone: '4375100', description: 'Helicopter transfer from Silhouette Island to Raffles Praslin.', priceInfo: '€1,467', priceAmount: 1467, priceCurrency: 'EUR', sortOrder: 7 },
    { categoryId: helicopterCat.id, name: 'Kempinski to Raffles', contactName: 'Zil Air', contactPhone: '4375100', description: 'Helicopter transfer from Kempinski to Raffles Praslin.', priceInfo: '€1,213', priceAmount: 1213, priceCurrency: 'EUR', sortOrder: 8 },
    { categoryId: helicopterCat.id, name: 'Four Seasons to Raffles', contactName: 'Zil Air', contactPhone: '4375100', description: 'Helicopter transfer from Four Seasons via Kempinski to Raffles Praslin.', priceInfo: '€1,346', priceAmount: 1346, priceCurrency: 'EUR', sortOrder: 9 },
    { categoryId: helicopterCat.id, name: 'Anantara Maia to Raffles', contactName: 'Zil Air', contactPhone: '4375100', description: 'Helicopter transfer from Anantara Maia to Raffles Praslin.', priceInfo: '€1,096', priceAmount: 1096, priceCurrency: 'EUR', sortOrder: 10 },
    { categoryId: helicopterCat.id, name: 'Denis Island to Raffles', contactName: 'Zil Air', contactPhone: '4375100', description: 'Helicopter transfer from Denis Island to Raffles Praslin.', priceInfo: '€2,113', priceAmount: 2113, priceCurrency: 'EUR', sortOrder: 11 },
    { categoryId: helicopterCat.id, name: '15 Min Scenic Flight', contactName: 'Zil Air', contactPhone: '4375100', description: 'Breathtaking 15-minute scenic helicopter flight over the islands.', priceInfo: '€1,168', priceAmount: 1168, priceCurrency: 'EUR', sortOrder: 12 },
    { categoryId: helicopterCat.id, name: '30 Min Scenic Flight', contactName: 'Zil Air', contactPhone: '4375100', description: 'Extended 30-minute scenic helicopter flight over the Seychelles archipelago.', priceInfo: '€2,336', priceAmount: 2336, priceCurrency: 'EUR', sortOrder: 13 },
    { categoryId: helicopterCat.id, name: 'Air Seychelles Charter – Mahé to Praslin', contactName: 'Air Seychelles', contactPhone: '4391477', description: 'Private charter plane from Mahé to Praslin Airport. Night surcharge 15% (18:30–06:00).', priceInfo: '€4,000', priceAmount: 4000, priceCurrency: 'EUR', sortOrder: 14 },
  ]});

  // ── Site Settings ────────────────────────────────────────────────
  for (const s of [
    { key: 'site_title', value: 'Raffles Praslin' },
    { key: 'site_subtitle', value: 'Every experience, thoughtfully arranged for you' },
    { key: 'hero_image', value: '' },
    { key: 'layout_style', value: 'grid' },
    { key: 'primary_color', value: '#1a1a1a' },
    { key: 'accent_color', value: '#c9a96e' },
  ]) {
    await prisma.siteSettings.create({ data: s });
  }

  console.log('✅ Seed complete. Admin: admin@raffles-concierge.com / Admin@2024!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e.message);
    process.exit(0);
  })
  .finally(() => prisma.$disconnect());
