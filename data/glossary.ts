/**
 * FREIGHT GLOSSARY
 * ══════════════════════════════════════════════════════════════════════════
 * The definitions behind Zeno's "explain a concept" intent, and the source
 * for the tooltips the app shows on the terms customers most often get
 * wrong. Written plainly, and where two terms are routinely confused the
 * entry says so — that confusion is usually the reason someone is asking.
 */

export interface GlossaryEntry {
  id: string
  term: string
  /** Alternate spellings and abbreviations Zeno should match on. */
  aliases: string[]
  category: 'INCOTERM' | 'CHARGE' | 'DOCUMENT' | 'OPERATION' | 'EQUIPMENT'
  short: string
  detail: string
  /** The term this one is most often mistaken for. */
  contrastWith?: string
}

export const GLOSSARY: GlossaryEntry[] = [
  {
    id: 'fob',
    term: 'FOB — Free On Board',
    aliases: ['fob', 'free on board'],
    category: 'INCOTERM',
    short: 'Seller delivers on board the vessel at origin; risk and cost pass to the buyer there.',
    detail:
      'The seller clears the goods for export and loads them on board the vessel at the named origin port. From the moment the cargo is on board, the buyer carries the cost and the risk — ocean freight, insurance, destination handling and delivery are all theirs. FOB is the most common term on Far East to India imports because it lets the buyer choose and control the carrier.',
    contrastWith: 'ddp',
  },
  {
    id: 'ddp',
    term: 'DDP — Delivered Duty Paid',
    aliases: ['ddp', 'delivered duty paid'],
    category: 'INCOTERM',
    short: 'Seller delivers to the buyer’s door with everything paid, including import charges.',
    detail:
      'The seller carries cost and risk all the way to the named destination — freight, insurance, destination handling, import formalities and delivery. It is the maximum obligation on the seller and the minimum on the buyer. The practical catch is that the seller must be able to handle import formalities in the buyer’s country, which is often the reason a DDP quote is declined.',
    contrastWith: 'fob',
  },
  {
    id: 'cif',
    term: 'CIF — Cost, Insurance and Freight',
    aliases: ['cif', 'cost insurance freight'],
    category: 'INCOTERM',
    short: 'Seller pays freight and insurance to the destination port, but risk passes at origin.',
    detail:
      'The seller pays the ocean freight and buys marine insurance to the named destination port. The trap is that risk still transfers when the goods are on board at origin, not on arrival — so the buyer owns the risk for a voyage the seller booked. That split is why CIF disputes are common.',
    contrastWith: 'fob',
  },
  {
    id: 'exw',
    term: 'EXW — Ex Works',
    aliases: ['exw', 'ex works'],
    category: 'INCOTERM',
    short: 'Buyer collects from the seller’s premises and carries everything from there.',
    detail:
      'The seller makes the goods available at their own factory or warehouse and does nothing else. The buyer arranges collection, export clearance, freight and delivery. Minimum obligation on the seller, maximum on the buyer.',
  },
  {
    id: 'detention',
    term: 'Detention',
    aliases: ['detention', 'container detention'],
    category: 'CHARGE',
    short: 'Charged when you keep the container outside the terminal beyond the free days.',
    detail:
      'Detention runs from the moment the container leaves the terminal gate until you return it empty to the carrier’s nominated depot. It is charged per container per calendar day — weekends and holidays included — and escalates in slabs the longer the box is out. It is payable to the shipping line.',
    contrastWith: 'demurrage',
  },
  {
    id: 'demurrage',
    term: 'Demurrage / storage',
    aliases: ['demurrage', 'storage', 'port storage'],
    category: 'CHARGE',
    short: 'Charged when the container sits inside the terminal beyond the free days.',
    detail:
      'Demurrage — often invoiced as port or CFS storage in India — accrues while the loaded container is still inside the terminal after the free period ends, typically because clearance or delivery planning has not completed. It is payable to the terminal or the line. It is a different clock from detention, and a delayed shipment can run both.',
    contrastWith: 'detention',
  },
  {
    id: 'thc',
    term: 'THC — Terminal Handling Charge',
    aliases: ['thc', 'terminal handling', 'terminal handling charge'],
    category: 'CHARGE',
    short: 'The terminal’s charge for moving your container between quay and yard.',
    detail:
      'Levied per container at both origin and destination, covering the lift on or off the vessel and the yard movement either side. It is set by the terminal and passed on by the carrier, varies by port, equipment type and whether the box is dry, reefer or out-of-gauge, and is revised once or twice a year.',
  },
  {
    id: 'vgm',
    term: 'VGM — Verified Gross Mass',
    aliases: ['vgm', 'verified gross mass'],
    category: 'DOCUMENT',
    short: 'The certified total weight of a packed container, required before it can be loaded.',
    detail:
      'Under SOLAS the shipper must declare the verified gross mass of every packed container before loading. It can be obtained by weighing the packed container, or by weighing the cargo and adding the tare. No VGM, no load — it is one of the most common reasons a container misses its sailing.',
  },
  {
    id: 'bl',
    term: 'Bill of lading',
    aliases: ['bl', 'b/l', 'bill of lading', 'mbl', 'hbl'],
    category: 'DOCUMENT',
    short: 'The carrier’s receipt for the cargo, and the document of title to it.',
    detail:
      'Issued once the cargo is loaded. It does three jobs at once: a receipt that the carrier holds your goods, evidence of the contract of carriage, and — for an original negotiable bill — the document of title, meaning whoever holds it can claim the cargo. A master bill is issued by the carrier to the forwarder; a house bill is issued by the forwarder to you.',
  },
  {
    id: 'dpd',
    term: 'DPD — Direct Port Delivery',
    aliases: ['dpd', 'direct port delivery'],
    category: 'OPERATION',
    short: 'Taking the container straight from the port instead of via a CFS.',
    detail:
      'Eligible importers can move the container directly from the terminal to their own premises rather than routing it through a container freight station for de-stuffing. It removes a handling step and usually a day or two of dwell, but it needs the paperwork to be complete on arrival — there is no CFS buffer to absorb a delay.',
  },
  {
    id: 'cfs',
    term: 'CFS — Container Freight Station',
    aliases: ['cfs', 'container freight station'],
    category: 'OPERATION',
    short: 'An off-dock facility where containers are de-stuffed and cargo is handed over.',
    detail:
      'A CFS takes containers off the terminal, de-stuffs them and holds the cargo until it is released and collected. It is the default route for LCL cargo and for importers who are not on direct port delivery, and it adds its own handling and storage charges on top of the terminal’s.',
  },
  {
    id: 'free-time',
    term: 'Free time',
    aliases: ['free time', 'free days'],
    category: 'CHARGE',
    short: 'The days you get before detention and storage start charging.',
    detail:
      'The number of days, granted by the carrier and the terminal, during which no detention or storage accrues. Typically three to seven days at Indian gateway ports depending on the carrier and the contract. It is the single most useful number to know on an arriving shipment, because everything after it is an escalating daily charge.',
  },
  {
    id: 'fcl',
    term: 'FCL — Full Container Load',
    aliases: ['fcl', 'full container load'],
    category: 'EQUIPMENT',
    short: 'You book the whole container, whether or not you fill it.',
    detail:
      'The container is yours for the voyage and is not shared. Priced per container, so the rate is the same whether the box is full or half empty. Above roughly 15 CBM it is usually cheaper than the LCL equivalent.',
    contrastWith: 'lcl',
  },
  {
    id: 'lcl',
    term: 'LCL — Less than Container Load',
    aliases: ['lcl', 'less than container load'],
    category: 'EQUIPMENT',
    short: 'Your cargo shares a container with other shippers’ cargo.',
    detail:
      'Priced on volume or weight, whichever is greater, so a dense pallet can be charged on its weight rather than the space it occupies. It suits small consignments but adds consolidation and de-consolidation steps at both ends, which is why LCL transit times run longer than the vessel schedule suggests.',
    contrastWith: 'fcl',
  },
]

export function findGlossaryEntry(query: string): GlossaryEntry | undefined {
  const q = query.toLowerCase()
  return (
    GLOSSARY.find((e) => e.aliases.some((a) => new RegExp(`\\b${a.replace(/[/]/g, '\\/')}\\b`).test(q))) ??
    GLOSSARY.find((e) => q.includes(e.term.toLowerCase()))
  )
}

export function glossaryEntry(id: string): GlossaryEntry | undefined {
  return GLOSSARY.find((e) => e.id === id)
}
