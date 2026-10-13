import type {
  Confidence,
  EventLink,
  EventNote,
  EvidenceReference,
  LinkType,
  MarketEvent,
} from "../lib/domain/types";
import { DEMO_SOURCE, type DemoClock } from "./demo-clock";

// Every event here is an invented scenario. Titles carry "Illustrative scenario" so they cannot
// be mistaken for a real schedule, and no source URL is fabricated.

type EventSeed = Pick<
  MarketEvent,
  "id" | "title" | "type" | "description" | "importance" | "known" | "uncertain" | "suggestedWatchItems"
> & { offset: number; time: string; released?: boolean; actuals?: { summary: string; facts: string[] } };

const seeds: EventSeed[] = [
  {
    id: "evt-tcs-results",
    title: "Illustrative scenario: TCS quarterly results",
    type: "EARNINGS",
    offset: 2,
    time: "16:30",
    importance: "HIGH",
    description: "A scheduled quarterly results announcement by an issuer in the demo portfolio.",
    known: [
      "The issuer is scheduled to report quarterly results after market hours (scenario schedule).",
      "The release time falls after the 15:30 IST close, so the first close after it is the next trading day.",
    ],
    uncertain: [
      "Reported figures and management commentary are not known before release.",
      "No licensed consensus-estimate source is configured, so no estimate comparison is offered.",
      "How any instrument will move is unknown; DhanLens does not forecast it.",
    ],
    suggestedWatchItems: [
      "Track management commentary on deal pipeline",
      "Note reported revenue growth and margin",
      "Compare with the IT sector index over the same window",
    ],
  },
  {
    id: "evt-rbi-policy",
    title: "Illustrative scenario: RBI monetary policy decision",
    type: "MACRO",
    offset: 4,
    time: "10:00",
    importance: "HIGH",
    description: "A scheduled central-bank policy announcement.",
    known: ["A policy rate decision and statement are scheduled (scenario schedule)."],
    uncertain: [
      "The rate decision and stance are not known before the announcement.",
      "Links to lenders and auto makers are possible transmission channels, not confirmed effects.",
    ],
    suggestedWatchItems: [
      "Read the policy stance wording",
      "Note any change to liquidity measures",
      "Compare bank index movement with the benchmark",
    ],
  },
  {
    id: "evt-crude-report",
    title: "Illustrative scenario: crude-oil supply report",
    type: "SECTOR",
    offset: 6,
    time: "20:00",
    importance: "MEDIUM",
    description: "A periodic supply and inventory report for crude oil.",
    known: ["A supply report is scheduled for release (scenario schedule)."],
    uncertain: [
      "Inventory figures are not known before release.",
      "The paints link is an input-cost hypothesis; the size and timing of any effect are unknown.",
    ],
    suggestedWatchItems: ["Note the reported inventory change", "Check refining-margin commentary"],
  },
  {
    id: "evt-telecom-tariff",
    title: "Illustrative scenario: telecom tariff consultation outcome",
    type: "SECTOR",
    offset: 7,
    time: "17:00",
    importance: "MEDIUM",
    description: "A regulator's consultation outcome for telecom tariffs.",
    known: ["A consultation outcome is scheduled for publication (scenario schedule)."],
    uncertain: ["The outcome is not known before publication."],
    suggestedWatchItems: ["Read the regulator's summary"],
  },
  {
    id: "evt-sunpharma-dividend",
    title: "Illustrative scenario: Sun Pharma interim dividend record date",
    type: "CORPORATE_ACTION",
    offset: 9,
    time: "09:15",
    importance: "LOW",
    description: "A record date for an interim dividend by an issuer in the demo portfolio.",
    known: ["A record date for an interim dividend is set (scenario schedule)."],
    uncertain: ["A price return around a record date excludes the dividend itself."],
    suggestedWatchItems: ["Confirm the dividend credit in the holdings statement"],
  },
  {
    id: "evt-infy-results",
    title: "Illustrative scenario: Infosys quarterly results",
    type: "EARNINGS",
    offset: 12,
    time: "16:00",
    importance: "MEDIUM",
    description: "A scheduled quarterly results announcement by an issuer on the demo watchlist.",
    known: ["The issuer is scheduled to report quarterly results (scenario schedule)."],
    uncertain: ["Reported figures and guidance are not known before release."],
    suggestedWatchItems: ["Track revenue guidance commentary", "Compare with the IT sector index"],
  },
  {
    id: "evt-gst-fmcg",
    title: "Illustrative scenario: GST rate review for packaged goods",
    type: "SECTOR",
    offset: 20,
    time: "18:00",
    importance: "LOW",
    description: "A tax-rate review covering packaged consumer goods.",
    known: ["A rate review meeting is scheduled (scenario schedule)."],
    uncertain: ["Whether any rate changes, and for which categories, is not known."],
    suggestedWatchItems: ["Read the official press note"],
  },
  {
    id: "evt-hdfcbank-results",
    title: "Illustrative scenario: HDFC Bank quarterly results",
    type: "EARNINGS",
    offset: -5,
    time: "13:30",
    released: true,
    importance: "HIGH",
    description: "A completed quarterly results announcement by an issuer in the demo portfolio.",
    known: ["Results were announced during market hours on the event day (scenario)."],
    uncertain: ["Whether the price movement in the window had anything to do with the results."],
    suggestedWatchItems: ["Track commentary on deposit growth", "Note net interest margin"],
    actuals: {
      summary: "Illustrative result: profit growth reported; management flagged deposit competition.",
      facts: [
        "Illustrative: net profit reported up year on year.",
        "Illustrative: net interest margin reported broadly stable.",
        "Illustrative: management commentary flagged competition for deposits.",
      ],
    },
  },
  {
    id: "evt-cpi-print",
    title: "Illustrative scenario: CPI inflation release",
    type: "MACRO",
    offset: -3,
    time: "17:30",
    released: true,
    importance: "MEDIUM",
    description: "A completed inflation data release for which no result has been ingested.",
    known: ["The release was scheduled for this date (scenario schedule)."],
    uncertain: ["The released figure has not been ingested from any source."],
    suggestedWatchItems: ["Record the headline figure from the official release"],
  },
];

const demoEvidence = (id: string, label: string, clock: DemoClock): EvidenceReference => ({
  id,
  label,
  publisher: DEMO_SOURCE,
  publishedAt: clock.at(-10, "10:00"),
  retrievedAt: clock.now,
  evidenceType: "DEMO",
  isPrimarySource: false,
});

export function demoEvents(clock: DemoClock): MarketEvent[] {
  return seeds.map(({ offset, time, released, actuals, ...seed }) => ({
    ...seed,
    startsAt: clock.at(offset, time),
    timezone: "Asia/Kolkata",
    status: released ? "RELEASED" : "SCHEDULED",
    publisher: DEMO_SOURCE,
    publishedAt: clock.at(Math.min(offset, 0) - 10, "10:00"),
    updatedAt: released ? clock.at(offset, time) : clock.at(-1, "18:00"),
    isIllustrative: true,
    actuals: actuals && {
      ...actuals,
      source: {
        ...demoEvidence(`${seed.id}-actuals`, "Demo result note (no real filing)", clock),
        publishedAt: clock.at(offset, time),
      },
    },
  }));
}

type LinkSeed = [
  eventId: string,
  linkType: LinkType,
  target: string, // instrument id for DIRECT, sector name otherwise
  channel: string,
  rationale: string,
];

const TAXONOMY_RULE = "Sector taxonomy match: the instrument's metadata sector equals the event's mapped sector.";
const DIRECT_RULE = "Issuer mapping: the event names this issuer, matched to an instrument by symbol.";
const MACRO_RULE = "Curated macro channel table: event category → sector sensitivity. A hypothesis, not a finding.";

const linkSeeds: LinkSeed[] = [
  ["evt-tcs-results", "DIRECT", "TCS", "Issuer announcement", "The results are published by TCS itself."],
  ["evt-tcs-results", "SECTOR", "IT Services", "IT services peer read-across", "Large-cap IT results are commonly read alongside peers in the same sector."],
  ["evt-rbi-policy", "MACRO", "Banks", "Interest rates → lender margins", "Policy rates feed into lending and deposit rates, which can affect bank margins."],
  ["evt-rbi-policy", "MACRO", "Automobiles", "Interest rates → vehicle financing cost", "Many vehicle purchases are financed, so borrowing costs can affect demand."],
  ["evt-crude-report", "SECTOR", "Oil & Gas", "Crude supply → oil & gas sector", "The report concerns the commodity this sector produces and refines."],
  ["evt-crude-report", "MACRO", "Paints", "Crude derivatives → input costs", "Several paint raw materials are crude-oil derivatives, so crude prices can affect input costs."],
  ["evt-telecom-tariff", "SECTOR", "Telecom", "Tariff regulation → telecom sector", "The consultation concerns telecom operators."],
  ["evt-sunpharma-dividend", "DIRECT", "SUNPHARMA", "Corporate action", "The record date is set by Sun Pharma for its own shareholders."],
  ["evt-infy-results", "DIRECT", "INFY", "Issuer announcement", "The results are published by Infosys itself."],
  ["evt-infy-results", "SECTOR", "IT Services", "IT services peer read-across", "Large-cap IT results are commonly read alongside peers in the same sector."],
  ["evt-gst-fmcg", "SECTOR", "FMCG", "Indirect tax → packaged goods", "The review covers goods sold by companies in this sector."],
  ["evt-hdfcbank-results", "DIRECT", "HDFCBANK", "Issuer announcement", "The results are published by HDFC Bank itself."],
  ["evt-hdfcbank-results", "SECTOR", "Banks", "Banking peer read-across", "Large private-bank results are commonly read alongside sector peers."],
  ["evt-cpi-print", "MACRO", "Banks", "Inflation → rate expectations → lenders", "Inflation data can shift interest-rate expectations, which matter for lenders."],
];

const CONFIDENCE: Record<LinkType, Confidence> = { DIRECT: "VERIFIED", SECTOR: "CURATED", MACRO: "HYPOTHESIS" };
const RULE: Record<LinkType, string> = { DIRECT: DIRECT_RULE, SECTOR: TAXONOMY_RULE, MACRO: MACRO_RULE };

export function demoLinks(clock: DemoClock): EventLink[] {
  return linkSeeds.map(([eventId, linkType, target, channel, rationale]) => {
    const id = `${eventId}:${linkType}:${target}`;
    return {
      id,
      eventId,
      linkType,
      target: linkType === "DIRECT" ? { kind: "instrument", instrumentId: target } : { kind: "sector", sector: target },
      channel,
      rationale,
      rule: RULE[linkType],
      evidence: [
        linkType === "DIRECT"
          ? demoEvidence(`${id}:ev`, "Demo event record naming the issuer (no real filing)", clock)
          : linkType === "SECTOR"
            ? { ...demoEvidence(`${id}:ev`, "Curated demo sector taxonomy", clock), evidenceType: "TAXONOMY" }
            : { ...demoEvidence(`${id}:ev`, "Curated macro channel table (demo)", clock), evidenceType: "CURATED_RULE" },
      ],
      confidence: CONFIDENCE[linkType],
      isHumanCurated: true,
    };
  });
}

/** One pre-written note so the before → after loop is visible on first load. Labelled as seeded. */
export function demoSeedNotes(clock: DemoClock): EventNote[] {
  const at = clock.at(-7, "19:40");
  return [
    {
      eventId: "evt-hdfcbank-results",
      createdAt: at,
      updatedAt: at,
      preEventNote: "I want to watch what management says about deposit growth and margins. No view on direction.",
      noteHistory: [],
      watchItems: [
        { id: "seed-1", label: "Track commentary on deposit growth", done: true },
        { id: "seed-2", label: "Note net interest margin", done: true },
        { id: "seed-3", label: "Compare bank peers with the benchmark", done: false },
      ],
      reflection: "",
      isSeed: true,
    },
  ];
}
