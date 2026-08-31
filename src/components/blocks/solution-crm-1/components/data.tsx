export type DealStatus = "Discovery" | "Proposal" | "Negotiation"

export type DealKind = "New Logo" | "Expansion" | "Renewal"

export type DealHealth = "Committed" | "Watch" | "At Risk"

export interface DealOwner {
  name: string
  initials: string
  role: string
  avatar?: string
}

export interface DealRecord {
  id: string
  name: string
  kind: DealKind
  owner: DealOwner
  domain: string
  progress: number
  tasksCompleted: number
  tasksTotal: number
  contributors: number
  blockers: number
  health: DealHealth
  dateStart: string
  dateEnd: string
  dateRange: string
  status: DealStatus
  favorite: boolean
}

export const DEAL_STATUS_OPTIONS: DealStatus[] = [
  "Discovery",
  "Proposal",
  "Negotiation",
]

const dealOwners = {
  mira: {
    name: "Mira Stone",
    initials: "MS",
    role: "Enterprise AE",
    avatar:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=96&h=96&dpr=2&q=80",
  },
  leo: {
    name: "Leo Grant",
    initials: "LG",
    role: "Strategic AE",
    avatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=96&h=96&dpr=2&q=80",
  },
  sana: {
    name: "Sana Qureshi",
    initials: "SQ",
    role: "Renewals lead",
    avatar:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=96&h=96&dpr=2&q=80",
  },
  nora: {
    name: "Nora Vale",
    initials: "NV",
    role: "Commercial AE",
    avatar:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=96&h=96&dpr=2&q=80",
  },
  theo: {
    name: "Theo Park",
    initials: "TP",
    role: "Sales engineer",
    avatar:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=96&h=96&dpr=2&q=80",
  },
  alex: {
    name: "Alex Johnson",
    initials: "AJ",
    role: "Customer success",
    avatar:
      "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=96&h=96&dpr=2&q=80",
  },
  priya: {
    name: "Priya Shah",
    initials: "PS",
    role: "Sales ops",
    avatar:
      "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=96&h=96&dpr=2&q=80",
  },
  omar: {
    name: "Omar Haddad",
    initials: "OH",
    role: "Regional director",
    avatar:
      "https://images.unsplash.com/photo-1507591064344-4c6ce005b128?w=96&h=96&dpr=2&q=80",
  },
  lena: {
    name: "Lena Wade",
    initials: "LW",
    role: "Partner manager",
  },
} satisfies Record<string, DealOwner>

export const DEAL_RECORDS: DealRecord[] = [
  {
    id: "DEAL-4820",
    name: "Cobalt Logistics",
    kind: "Renewal",
    owner: dealOwners.sana,
    domain: "cobaltlogistics.com",
    progress: 75,
    tasksCompleted: 6,
    tasksTotal: 8,
    contributors: 5,
    blockers: 0,
    health: "Committed",
    dateStart: "2026-06-10",
    dateEnd: "2026-06-28",
    dateRange: "Jun 10 - Jun 28, 2026",
    status: "Negotiation",
    favorite: true,
  },
  {
    id: "DEAL-4821",
    name: "Brightwave Media",
    kind: "New Logo",
    owner: dealOwners.mira,
    domain: "brightwave.media",
    progress: 55,
    tasksCompleted: 4,
    tasksTotal: 9,
    contributors: 7,
    blockers: 1,
    health: "At Risk",
    dateStart: "2026-06-07",
    dateEnd: "2026-06-24",
    dateRange: "Jun 07 - Jun 24, 2026",
    status: "Proposal",
    favorite: false,
  },
  {
    id: "DEAL-4818",
    name: "Orbit Software",
    kind: "Expansion",
    owner: dealOwners.mira,
    domain: "orbitsoftware.io",
    progress: 68,
    tasksCompleted: 5,
    tasksTotal: 8,
    contributors: 6,
    blockers: 0,
    health: "Watch",
    dateStart: "2026-06-11",
    dateEnd: "2026-07-02",
    dateRange: "Jun 11 - Jul 02, 2026",
    status: "Negotiation",
    favorite: false,
  },
  {
    id: "DEAL-4815",
    name: "Northstar Clinics",
    kind: "New Logo",
    owner: dealOwners.leo,
    domain: "northstarclinics.com",
    progress: 42,
    tasksCompleted: 3,
    tasksTotal: 7,
    contributors: 4,
    blockers: 0,
    health: "Watch",
    dateStart: "2026-06-13",
    dateEnd: "2026-07-10",
    dateRange: "Jun 13 - Jul 10, 2026",
    status: "Proposal",
    favorite: false,
  },
  {
    id: "DEAL-4809",
    name: "Helio Manufacturing",
    kind: "Expansion",
    owner: dealOwners.nora,
    domain: "heliomfg.com",
    progress: 61,
    tasksCompleted: 4,
    tasksTotal: 7,
    contributors: 5,
    blockers: 0,
    health: "Committed",
    dateStart: "2026-06-05",
    dateEnd: "2026-06-30",
    dateRange: "Jun 05 - Jun 30, 2026",
    status: "Negotiation",
    favorite: true,
  },
  {
    id: "DEAL-4804",
    name: "Atlas Education",
    kind: "Renewal",
    owner: dealOwners.sana,
    domain: "atlasedu.org",
    progress: 34,
    tasksCompleted: 2,
    tasksTotal: 6,
    contributors: 3,
    blockers: 1,
    health: "At Risk",
    dateStart: "2026-06-16",
    dateEnd: "2026-07-08",
    dateRange: "Jun 16 - Jul 08, 2026",
    status: "Discovery",
    favorite: false,
  },
  {
    id: "DEAL-4799",
    name: "Summit Retail Group",
    kind: "New Logo",
    owner: dealOwners.leo,
    domain: "summitretail.co",
    progress: 48,
    tasksCompleted: 4,
    tasksTotal: 8,
    contributors: 6,
    blockers: 0,
    health: "Watch",
    dateStart: "2026-06-18",
    dateEnd: "2026-07-12",
    dateRange: "Jun 18 - Jul 12, 2026",
    status: "Proposal",
    favorite: false,
  },
  {
    id: "DEAL-4793",
    name: "Pioneer Robotics",
    kind: "Expansion",
    owner: dealOwners.theo,
    domain: "pioneerbotics.ai",
    progress: 72,
    tasksCompleted: 6,
    tasksTotal: 8,
    contributors: 8,
    blockers: 0,
    health: "Committed",
    dateStart: "2026-06-04",
    dateEnd: "2026-06-27",
    dateRange: "Jun 04 - Jun 27, 2026",
    status: "Negotiation",
    favorite: false,
  },
  {
    id: "DEAL-4788",
    name: "Vera Capital",
    kind: "New Logo",
    owner: dealOwners.nora,
    domain: "veracapital.com",
    progress: 28,
    tasksCompleted: 2,
    tasksTotal: 7,
    contributors: 4,
    blockers: 2,
    health: "At Risk",
    dateStart: "2026-06-20",
    dateEnd: "2026-07-18",
    dateRange: "Jun 20 - Jul 18, 2026",
    status: "Discovery",
    favorite: false,
  },
  {
    id: "DEAL-4781",
    name: "Evergreen Foods",
    kind: "Renewal",
    owner: dealOwners.alex,
    domain: "evergreenfoods.com",
    progress: 64,
    tasksCompleted: 5,
    tasksTotal: 8,
    contributors: 5,
    blockers: 0,
    health: "Committed",
    dateStart: "2026-06-08",
    dateEnd: "2026-07-03",
    dateRange: "Jun 08 - Jul 03, 2026",
    status: "Proposal",
    favorite: false,
  },
  {
    id: "DEAL-4776",
    name: "Quartz Payments",
    kind: "Expansion",
    owner: dealOwners.omar,
    domain: "quartzpay.com",
    progress: 58,
    tasksCompleted: 4,
    tasksTotal: 7,
    contributors: 7,
    blockers: 1,
    health: "Watch",
    dateStart: "2026-06-14",
    dateEnd: "2026-07-09",
    dateRange: "Jun 14 - Jul 09, 2026",
    status: "Negotiation",
    favorite: true,
  },
  {
    id: "DEAL-4770",
    name: "Luma Hospitality",
    kind: "New Logo",
    owner: dealOwners.lena,
    domain: "lumahotels.com",
    progress: 19,
    tasksCompleted: 1,
    tasksTotal: 6,
    contributors: 3,
    blockers: 0,
    health: "Watch",
    dateStart: "2026-06-22",
    dateEnd: "2026-07-20",
    dateRange: "Jun 22 - Jul 20, 2026",
    status: "Discovery",
    favorite: false,
  },
  {
    id: "DEAL-4765",
    name: "Redwood BioLabs",
    kind: "Renewal",
    owner: dealOwners.priya,
    domain: "redwoodbiolabs.com",
    progress: 83,
    tasksCompleted: 7,
    tasksTotal: 8,
    contributors: 6,
    blockers: 0,
    health: "Committed",
    dateStart: "2026-06-01",
    dateEnd: "2026-06-26",
    dateRange: "Jun 01 - Jun 26, 2026",
    status: "Negotiation",
    favorite: false,
  },
  {
    id: "DEAL-4759",
    name: "Keystone Transit",
    kind: "Expansion",
    owner: dealOwners.theo,
    domain: "keystonetransit.com",
    progress: 46,
    tasksCompleted: 3,
    tasksTotal: 7,
    contributors: 5,
    blockers: 1,
    health: "At Risk",
    dateStart: "2026-06-19",
    dateEnd: "2026-07-16",
    dateRange: "Jun 19 - Jul 16, 2026",
    status: "Proposal",
    favorite: false,
  },
  {
    id: "DEAL-4751",
    name: "Bluebird Energy",
    kind: "New Logo",
    owner: dealOwners.leo,
    domain: "bluebirdenergy.com",
    progress: 37,
    tasksCompleted: 2,
    tasksTotal: 7,
    contributors: 4,
    blockers: 0,
    health: "Watch",
    dateStart: "2026-06-23",
    dateEnd: "2026-07-22",
    dateRange: "Jun 23 - Jul 22, 2026",
    status: "Discovery",
    favorite: false,
  },
]

export const pipelineData = [
  { value: 1180 },
  { value: 1320 },
  { value: 1260 },
  { value: 1510 },
  { value: 1430 },
  { value: 1660 },
  { value: 1580 },
  { value: 1740 },
  { value: 1690 },
  { value: 1820 },
  { value: 1760 },
  { value: 1890 },
  { value: 1840 },
  { value: 1940 },
  { value: 1940 },
]

export const forecastData = [
  { value: 390 },
  { value: 420 },
  { value: 460 },
  { value: 440 },
  { value: 510 },
  { value: 480 },
  { value: 535 },
  { value: 560 },
  { value: 520 },
  { value: 590 },
  { value: 548 },
  { value: 604 },
  { value: 572 },
  { value: 612 },
  { value: 612 },
]

export const winRateData = [
  { value: 19 },
  { value: 21 },
  { value: 20 },
  { value: 22 },
  { value: 23 },
  { value: 22 },
  { value: 24 },
  { value: 25 },
  { value: 23 },
  { value: 24 },
  { value: 25 },
  { value: 26 },
  { value: 25 },
  { value: 26 },
  { value: 26 },
]

export type TeamMember = {
  src: string
  name: string
  initials: string
}

export const TEAM_MEMBERS: TeamMember[] = [
  {
    src: dealOwners.mira.avatar,
    name: dealOwners.mira.name,
    initials: dealOwners.mira.initials,
  },
  {
    src: dealOwners.leo.avatar,
    name: dealOwners.leo.name,
    initials: dealOwners.leo.initials,
  },
  {
    src: dealOwners.sana.avatar,
    name: dealOwners.sana.name,
    initials: dealOwners.sana.initials,
  },
]

export const TEAM_EXTRA_COUNT = 6