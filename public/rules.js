// The judgement layer. Everything here is a reading of the data, and every line cites the ids it
// rests on (fact ids, file ids, paperwork paths, signal ids, request ids). The page checks each
// cited id against the live data and flags any it cannot find, so nothing here can invent a source.
window.RULES = {
  // Who holds the power, per deal. Roles: decides, pays, uses, could_block.
  power: {
    a_westmere: [
      { who: "karen_mbeki", role: "uses", why: "Her unit flies the docks; scaling needs nine more operators.", cite: ["km_staff_2", "km_usage_1"] },
      { who: "ewan_brooks", role: "decides", why: "Takes the cost-per-flight case to his finance director.", cite: ["eb_sign_2"] },
      { who: "Metro Central finance director (name not on file)", role: "pays", why: "Signs every call-off for the force.", cite: ["eb_sign_2", "hd_calloff_2"] },
    ],
    a_renewal: [
      { who: "rhys_calder", role: "decides", why: "The alliance office signed the order and runs the renewal; he leaves in January.", cite: ["contract.txt", "champion_leaves"] },
      { who: "Each force's chief finance officer (only Metro Central's partner is known)", role: "pays", why: "No pooled budget; each force approves its own call-off.", cite: ["rc_funding_2", "hd_calloff_2"] },
      { who: "karen_mbeki", role: "uses", why: "Westmere and Metro Central are the only forces flying operationally.", cite: ["rc_appetite_2", "km_usage_1"] },
      { who: "ewan_brooks", role: "could_block", why: "Finance will not pay without a number it can check.", cite: ["eb_sign_2"] },
    ],
    a_tarn: [
      { who: "fatima_osei", role: "could_block", why: "Cannot sign the DPIA without our data-flow documents.", cite: ["fo_dpia_2", "fo_needs_3"] },
      { who: "Tarn Valley and Norwold finance (names not on file)", role: "pays", why: "Each force funds its own call-off.", cite: ["hd_calloff_2"] },
      { who: "Norwold chief constable (name not on file)", role: "decides", why: "Cautious after a privacy row; waiting to copy Tarn Valley's assessment.", cite: ["km_others_2", "fo_needs_3"] },
      { who: "pranjal_suyal", role: "could_block", why: "Our own ticket has sat unassigned for four months.", cite: ["pj_ticket", "support_ticket_history"] },
    ],
    a_tender: [
      { who: "rhys_calder", role: "decides", why: "Speaks for the programme, but cannot commit a force.", cite: ["rc_tender_0", "hd_calloff_2"] },
      { who: "Each force's chief finance officer", role: "pays", why: "Call-offs need each force's own sign-off.", cite: ["hd_calloff_2", "rc_funding_2"] },
      { who: "karen_mbeki", role: "uses", why: "Scaling is limited by trained operators.", cite: ["km_staff_2"] },
    ],
    b_renewal: [
      { who: "stefan_roy", role: "decides", why: "Signed the order; it is his programme.", cite: ["contract.txt"] },
      { who: "nadia_rahman", role: "pays", why: "Runs the allocation that charges plants for security.", cite: ["nr_cost_2", "sr_plants_2"] },
      { who: "nadia_rahman", role: "could_block", why: "Accepts only measured savings; sees the docks as added cost.", cite: ["nr_evidence_2", "nr_cost_2"] },
      { who: "beatriz_alonso", role: "uses", why: "Plant 7 flies nightly; only four plants fly regularly.", cite: ["ba_use_2", "sr_roll_2"] },
    ],
    b_sister: [
      { who: "stefan_roy", role: "decides", why: "Wants the case study; every number is his own spreadsheet.", cite: ["sr_case_3", "sr_roi_2"] },
      { who: "Sister company buyer (name not on file)", role: "pays", why: "Not Nadia's budget; nobody on file at the sister company.", cite: ["nr_sister_1"] },
      { who: "nadia_rahman", role: "could_block", why: "Her name would sit on the figures; she has not seen them.", cite: ["nr_evidence_2", "sr_case_3"] },
      { who: "julian_tate", role: "uses", why: "Holds the one hard saving: the insurer's letter.", cite: ["jt_prem_2", "insurer_premium_letter"] },
    ],
    b_idle: [
      { who: "owen_fitch", role: "could_block", why: "Segmentation will cut the docks off unless exceptions are planned.", cite: ["of_seg_2", "network_plan"] },
      { who: "stefan_roy", role: "decides", why: "Owns the programme and the rollout template.", cite: ["sr_repl_2"] },
      { who: "Plant managers at the idle plants (Plant 11 named)", role: "uses", why: "Plant 11 sees it as head office's toy; weak links at 11 to 14.", cite: ["ba_other_1", "of_weak_1"] },
      { who: "nadia_rahman", role: "pays", why: "Plants pay through the allocation whether they fly or not.", cite: ["sr_plants_2", "nr_cost_2"] },
    ],
    b_insurance: [
      { who: "julian_tate", role: "decides", why: "Deals with the insurer and its surveyor.", cite: ["jt_review_2"] },
      { who: "The insurer's surveyor (name not on file)", role: "could_block", why: "Judges the discount on consistent flight records.", cite: ["jt_review_2", "flight_log_by_plant"] },
      { who: "nadia_rahman", role: "pays", why: "Books the premium saving.", cite: ["jt_prem_2", "nr_evidence_2"] },
    ],
  },

  // Moves we already know we must make. Generic moves are added for any live signal or open
  // request not covered here, so new data shows up as work without a code change.
  moves: [
    {
      id: "m_karen_event", account: "A", deal: "a_westmere", covers: ["urgent_request", "FB-11206"],
      text: "Reply to Karen in writing: training dates for more operators before 5 December, and who answers if a dock fails on the day.",
      owner: "You, with Pranjal Suyal for day-of cover", in_days: 1, by: "2026-12-03", weight: 10,
      why: "Public event on 5 December; she asked for an answer this week and logged a ticket.",
      cite: ["urgent_request", "FB-11206", "a_training", "a_priority_support"],
    },
    {
      id: "m_rhys_successor", account: "A", deal: "a_renewal", covers: ["champion_leaves"],
      text: "Ask Rhys to name his successor and introduce you to each force's finance officer before he hands over.",
      owner: "You, with Achal Negi (commercial owner)", in_days: 3, by: "2026-12-18", weight: 9,
      why: "The 350k renewal ends 28 February with no automatic renewal, and every call on file was with Rhys alone.",
      cite: ["champion_leaves", "contract.txt", "rc_funding_2", "profile.json"],
    },
    {
      id: "m_tarn_pack", account: "A", deal: "a_tarn", covers: ["FB-10412"],
      text: "Get the Tarn Valley data-flow pack (flows, retention, storage location, access controls) owned and dated; send Fatima the date in writing.",
      owner: "Pranjal Suyal to assign; SRV for engineering time", in_days: 3, by: "2026-12-31", weight: 8,
      why: "Ticket unanswered for four months; she can finish in three weeks once she has it, and Norwold copies her.",
      cite: ["pj_ticket", "fo_needs_3", "FB-10412", "support_ticket_history"],
    },
    {
      id: "m_usage_by_force", account: "A", deal: "a_renewal",
      text: "Build a usage report by force from the flight log and send it to Rhys and the force finance officers.",
      owner: "You", in_days: 10, by: "2027-01-15", weight: 6,
      why: "The renewal blocker is that nobody can show which forces use the docks.",
      cite: ["a_renewal", "flight_log_force_month", "km_usage_1", "rc_appetite_2"],
    },
    {
      id: "m_usage_drop", account: "B", deal: "b_renewal", covers: ["usage_drop"],
      text: "Call Beatriz and Stefan about the three docks that stopped flying; find out what changed before anyone asks.",
      owner: "You", in_days: 1, by: "2026-12-31", weight: 9,
      why: "Three nightly docks flew nothing for two weeks, stayed online, no ticket raised. The insurer judges the discount on patrols.",
      cite: ["usage_drop", "jt_review_2", "b_insurance"],
    },
    {
      id: "m_deputy", account: "B", deal: "b_idle",
      text: "Sit with Stefan's deputy and Beatriz and write the rollout and night-alert routine down as one playbook.",
      owner: "You, with Beatriz Alonso", in_days: 2, by: "2026-12-31", weight: 9,
      why: "The deputy leaves soon and the rollout know-how leaves with him; Beatriz already has a night checklist.",
      cite: ["sr_repl_2", "ba_playbook_2", "ba_deputy_0"],
    },
    {
      id: "m_owen_exceptions", account: "B", deal: "b_idle",
      text: "Send Owen every dock's plant, ports and services on his exception template so the segmentation keeps them online.",
      owner: "Pranjal Suyal", in_days: 7, by: "2027-02-15", weight: 7,
      why: "Segmentation starts in four months and cuts the docks off unless exceptions are planned; he offered two engineer days.",
      cite: ["of_seg_2", "of_offer_3", "it_exception_template", "network_plan"],
    },
    {
      id: "m_finance_quote", account: "B", deal: "b_renewal", covers: ["requests.csv@2026-10-08"],
      text: "Answer finance's request: renewal quote by plant, with the insurer's measured saving attached, to Nadia.",
      owner: "You, with Achal Negi", in_days: 5, by: "2027-01-10", weight: 7,
      why: "Term ends 31 January with no automatic renewal; finance asked in October and nobody replied.",
      cite: ["contract.txt", "requests.csv", "jt_prem_2", "insurer_premium_letter", "nr_evidence_2"],
    },
  ],

  // What we still do not know, why it matters, and who could fill it.
  gaps: [
    { account: "A", text: "Who succeeds Rhys at the programme office.", matters: "The renewal and tender run through the programme office.", ask: "rhys_calder", cite: ["champion_leaves"] },
    { account: "A", text: "Names of the finance officers at Westmere, Tarn Valley and Norwold.", matters: "Each signs its own call-off; the renewal needs them.", ask: "ewan_brooks", cite: ["rc_funding_2", "profile.json"] },
    { account: "A", text: "Which dock sits at which force.", matters: "A usage report by force cannot be built without it.", ask: "Field team (install sheets)", cite: ["profile.json", "a_renewal"] },
    { account: "A", text: "The split of the four first-year invoices (Schedule 2).", matters: "Shows who has paid what, force by force.", ask: "FlytBase Accounts", cite: ["contract.txt", "invoices.json"] },
    { account: "A", text: "Who funds the stadium and who would fly it on match days.", matters: "Rhys wanted a 30-dock quote; there is no funding or policing plan.", ask: "rhys_calder", cite: ["rc_stadium_3", "kb_stadium_view"] },
    { account: "A", text: "Drone operator overtime cost.", matters: "Needed for a cost per flight that finance can check.", ask: "ewan_brooks", cite: ["eb_drone_2"] },
    { account: "B", text: "The deputy's name and leaving date.", matters: "The rollout know-how leaves with him.", ask: "stefan_roy", cite: ["sr_repl_2", "profile.json"] },
    { account: "B", text: "Which dock sits at which plant.", matters: "Needed for the insurer, IT exceptions and a quote by plant.", ask: "stefan_roy", cite: ["profile.json"] },
    { account: "B", text: "Why three nightly docks stopped flying.", matters: "Patrols are what the insurer's discount rests on.", ask: "beatriz_alonso", cite: ["usage_drop", "jt_review_2"] },
    { account: "B", text: "Who buys at the sister company, and on what figures.", matters: "The 1.2M case study has no buyer or checked number behind it.", ask: "stefan_roy", cite: ["nr_sister_1", "sr_case_3"] },
    { account: "B", text: "Dates of the three guard contract renewals.", matters: "Writing drone alerts into them is the measured saving finance would book.", ask: "nadia_rahman", cite: ["nr_evidence_2", "ba_use_2"] },
  ],
};
